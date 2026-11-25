-- Finch · vida a dois e metas (Etapa 6). Tudo por espaço: o "Nós" é do casal, o pessoal é só seu.

create table public.special_dates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  on_date date not null,
  yearly boolean not null default true,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index special_dates_ws on public.special_dates (workspace_id);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null default 'passeio' check (kind in ('restaurante', 'viagem', 'passeio', 'outro')),
  status text not null default 'quero' check (status in ('quero', 'fomos')),
  rating smallint check (rating between 1 and 5),
  note text check (char_length(note) <= 500),
  visited_on date,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index places_ws on public.places (workspace_id, status);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  body text not null default '' check (char_length(body) <= 4000),
  happened_on date not null default current_date,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index memories_ws on public.memories (workspace_id, happened_on desc);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  target numeric(14, 2) not null check (target > 0 and target <= 1e12),
  current numeric(14, 2) not null default 0 check (current >= 0 and current <= 1e12),
  unit text check (char_length(unit) <= 12),
  due_on date,
  done_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index goals_ws on public.goals (workspace_id) where done_at is null;

-- soma atômica (os dois podem somar ao mesmo tempo sem perder valor); conclui ao bater o alvo
create or replace function public.goal_add(p_goal uuid, p_delta numeric) returns public.goals
language plpgsql security invoker set search_path = '' as $$
declare g public.goals;
begin
  if p_delta is null or p_delta = 0 or abs(p_delta) > 1e9 then raise exception 'invalid delta'; end if;
  update public.goals
     set current = greatest(0, current + p_delta),
         done_at = case when greatest(0, current + p_delta) >= target then coalesce(done_at, now()) else null end
   where id = p_goal
  returning * into g;
  if not found then raise exception 'goal not found'; end if;
  return g;
end $$;
revoke execute on function public.goal_add(uuid, numeric) from public, anon;
grant execute on function public.goal_add(uuid, numeric) to authenticated;

-- álbum: meta concluída vale pontos (desfazer a conclusão retira)
insert into public.xp_rules (key, points, daily_cap, label) values ('goal', 50, 2, 'Meta concluída');
create or replace function public.album_on_goal() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.done_at is not null and old.done_at is null then
    perform public.album_award(auth.uid(), 'goal', new.id::text, '');
  elsif new.done_at is null and old.done_at is not null then
    perform public.album_revoke(auth.uid(), 'goal', new.id::text, '');
  end if;
  return new;
end $$;
revoke execute on function public.album_on_goal() from public, anon, authenticated;
create trigger album_goal after update of done_at on public.goals for each row execute function public.album_on_goal();

alter table public.special_dates enable row level security;
alter table public.places enable row level security;
alter table public.memories enable row level security;
alter table public.goals enable row level security;

create policy special_dates_all on public.special_dates for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy places_all on public.places for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy memories_all on public.memories for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy goals_all on public.goals for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

grant select, insert, update, delete on public.special_dates, public.places, public.memories, public.goals to authenticated, service_role;
