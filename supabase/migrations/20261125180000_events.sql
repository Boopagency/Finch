-- Finch · agenda (Etapa 2). Eventos em data/hora locais; recorrência expandida na leitura.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  notes text check (char_length(notes) <= 2000),
  location text check (char_length(location) <= 200),
  category text not null default 'geral'
    check (category in ('geral', 'saude', 'trabalho', 'casa', 'nos', 'viagem', 'contas', 'treino')),
  start_date date not null,
  end_date date not null,
  start_time time, -- nulo = dia inteiro
  end_time time,
  repeat jsonb,
  repeat_until date,
  remind_min int check (remind_min between 0 and 10080),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check ((start_time is null) = (end_time is null)),
  check (start_time is null or end_date > start_date or end_time > start_time)
);
create index events_ws_dates on public.events (workspace_id, start_date, end_date);
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();

alter table public.events enable row level security;
create policy events_all on public.events for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
grant select, insert, update, delete on public.events to authenticated, service_role;
