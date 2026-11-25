-- Finch · tarefas (Etapa 2). Pessoais ou do espaço Nós; recorrentes viram ocorrências independentes.

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  notes text check (char_length(notes) <= 2000),
  category text not null default 'geral'
    check (category in ('geral', 'casa', 'contas', 'trabalho', 'saude', 'compras', 'nos')),
  priority smallint not null default 0 check (priority between 0 and 3),
  assignee_id uuid references public.profiles(id) on delete set null,
  -- tarefa única
  due_date date,
  due_time time,
  status text not null default 'open' check (status in ('open', 'doing', 'done')),
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  -- recorrência: {"freq":"daily|weekly|monthly","interval":1,"days":[0..6],"monthday":1..31}
  repeat jsonb,
  repeat_start date,
  rotation uuid[], -- membros que se alternam nas ocorrências
  remind boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (repeat is null or repeat_start is not null)
);
create index tasks_workspace on public.tasks (workspace_id) where archived_at is null;
create index tasks_due on public.tasks (due_date) where status <> 'done' and archived_at is null;
create trigger tasks_touch before update on public.tasks for each row execute function public.touch_updated_at();

create table public.task_occurrences (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  occurs_on date not null,
  assignee_id uuid references public.profiles(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'done', 'skipped')),
  snoozed_to date,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  unique (task_id, occurs_on)
);
create index task_occ_day on public.task_occurrences (workspace_id, coalesce(snoozed_to, occurs_on)) where status = 'open';

create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  done boolean not null default false,
  position int not null default 0
);
create index subtasks_task on public.subtasks (task_id);

-- filhos herdam o workspace da tarefa (impede apontar para outro espaço)
create or replace function public.inherit_task_workspace() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select workspace_id into new.workspace_id from public.tasks where id = new.task_id;
  return new;
end $$;
revoke execute on function public.inherit_task_workspace() from public, anon, authenticated;
create trigger task_occ_ws before insert or update of task_id on public.task_occurrences
  for each row execute function public.inherit_task_workspace();
create trigger subtasks_ws before insert or update of task_id on public.subtasks
  for each row execute function public.inherit_task_workspace();

-- responsável e rodízio só com membros do espaço; mudar de espaço propaga para os filhos
create or replace function public.guard_task() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.assignee_id is not null and not exists (
    select 1 from public.workspace_members where workspace_id = new.workspace_id and user_id = new.assignee_id) then
    raise exception 'assignee is not a member of the workspace';
  end if;
  if new.rotation is not null and exists (
    select 1 from unnest(new.rotation) r
    where not exists (select 1 from public.workspace_members where workspace_id = new.workspace_id and user_id = r)) then
    raise exception 'rotation has non-members';
  end if;
  if tg_op = 'UPDATE' and new.workspace_id <> old.workspace_id then
    update public.task_occurrences set workspace_id = new.workspace_id where task_id = new.id;
    update public.subtasks set workspace_id = new.workspace_id where task_id = new.id;
  end if;
  return new;
end $$;
revoke execute on function public.guard_task() from public, anon, authenticated;
create trigger tasks_guard before insert or update on public.tasks for each row execute function public.guard_task();

-- RLS: membro do espaço vê e mexe
alter table public.tasks enable row level security;
alter table public.task_occurrences enable row level security;
alter table public.subtasks enable row level security;

create policy tasks_all on public.tasks for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy task_occ_all on public.task_occurrences for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy subtasks_all on public.subtasks for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

grant select, insert, update, delete on public.tasks, public.task_occurrences, public.subtasks to authenticated, service_role;
