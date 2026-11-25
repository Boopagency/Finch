-- Finch · água e hábitos (Etapa 2). Dados de saúde: sempre do próprio usuário, nunca compartilhados.
-- Registros aceitam id gerado no cliente (fila offline idempotente).

-- ---------- configurações de água ----------
alter table public.user_settings
  add column water_goal_ml int not null default 2000 check (water_goal_ml between 500 and 5000),
  add column water_presets int[] not null default '{200,300,500}'
    check (array_length(water_presets, 1) between 1 and 4 and 10 <= all (water_presets) and 1500 >= all (water_presets)),
  add column water_reminders boolean not null default true,
  add column water_from time not null default '09:00',
  add column water_to time not null default '21:00',
  add column water_every_min int not null default 90 check (water_every_min between 30 and 240);

-- data local do registro, no fuso do dono (calculada no banco, não no cliente)
create or replace function public.set_local_date() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.logged_at > now() + interval '10 minutes' then raise exception 'logged_at in the future'; end if;
  if new.logged_at < now() - interval '14 days' then raise exception 'logged_at too old'; end if;
  new.local_date := (new.logged_at at time zone coalesce(
    (select tz from public.profiles where id = new.user_id), 'America/Sao_Paulo'))::date;
  return new;
end $$;
revoke execute on function public.set_local_date() from public, anon, authenticated;

-- ---------- água ----------
create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  amount_ml int not null check (amount_ml between 10 and 1500),
  logged_at timestamptz not null default now(),
  local_date date not null,
  created_at timestamptz not null default now()
);
create index water_logs_user_day on public.water_logs (user_id, local_date);
create trigger water_logs_local_date before insert on public.water_logs
  for each row execute function public.set_local_date();

-- ---------- hábitos ----------
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  kind text not null default 'check' check (kind in ('check', 'quantity')),
  period text not null default 'day' check (period in ('day', 'week')),
  target int not null default 1 check (target between 1 and 1000),
  unit text check (char_length(unit) <= 12),
  days smallint[] not null default '{0,1,2,3,4,5,6}'  -- 0 = domingo; vale para period = 'day'
    check (array_length(days, 1) between 1 and 7 and 0 <= all (days) and 6 >= all (days)),
  reminder_time time,
  tone text not null default 'sunflower'
    check (tone in ('coral', 'sunflower', 'tangerine', 'cobalt', 'lavender', 'frog')),
  position int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index habits_user on public.habits (user_id) where archived_at is null;

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  value int not null default 1 check (value between 1 and 1000),
  logged_at timestamptz not null default now(),
  local_date date not null,
  created_at timestamptz not null default now()
);
create index habit_logs_habit_day on public.habit_logs (habit_id, local_date);
create index habit_logs_user_day on public.habit_logs (user_id, local_date);
create trigger habit_logs_local_date before insert on public.habit_logs
  for each row execute function public.set_local_date();

-- ---------- RLS ----------
alter table public.water_logs enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

create policy water_select on public.water_logs for select to authenticated using (user_id = (select auth.uid()));
create policy water_insert on public.water_logs for insert to authenticated with check (user_id = (select auth.uid()));
create policy water_delete on public.water_logs for delete to authenticated using (user_id = (select auth.uid()));

create policy habits_all on public.habits for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy habit_logs_select on public.habit_logs for select to authenticated using (user_id = (select auth.uid()));
create policy habit_logs_insert on public.habit_logs for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid()))
  );
create policy habit_logs_delete on public.habit_logs for delete to authenticated using (user_id = (select auth.uid()));

-- ---------- grants (D-020) ----------
grant select, insert, delete on public.water_logs to authenticated;
grant select, insert, update, delete on public.habits to authenticated;
grant select, insert, delete on public.habit_logs to authenticated;
grant select, insert, update, delete on public.water_logs, public.habits, public.habit_logs to service_role;
