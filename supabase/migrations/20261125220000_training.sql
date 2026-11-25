-- Finch · treinos e saúde corporal (Etapa 4). Dados de saúde: sempre do próprio usuário.
-- Séries e fim de sessão vêm da fila offline (id do cliente = chave, reenviar não duplica).

-- ---------- biblioteca de exercícios (global + do usuário) ----------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references public.profiles(id) on delete cascade, -- null = biblioteca do Finch
  name text not null check (char_length(name) between 1 and 60),
  muscle text not null default 'outro'
    check (muscle in ('peito', 'costas', 'pernas', 'ombros', 'bracos', 'core', 'cardio', 'outro')),
  kind text not null default 'weight' check (kind in ('weight', 'bodyweight', 'time')),
  created_at timestamptz not null default now()
);
create unique index exercises_name on public.exercises (coalesce(user_id, '00000000-0000-0000-0000-000000000000'), lower(name));

insert into public.exercises (user_id, name, muscle, kind) values
  (null, 'Supino reto', 'peito', 'weight'), (null, 'Supino inclinado com halteres', 'peito', 'weight'), (null, 'Crucifixo', 'peito', 'weight'),
  (null, 'Flexão', 'peito', 'bodyweight'), (null, 'Puxada frontal', 'costas', 'weight'), (null, 'Remada curvada', 'costas', 'weight'),
  (null, 'Remada baixa', 'costas', 'weight'), (null, 'Barra fixa', 'costas', 'bodyweight'), (null, 'Agachamento livre', 'pernas', 'weight'),
  (null, 'Leg press', 'pernas', 'weight'), (null, 'Cadeira extensora', 'pernas', 'weight'), (null, 'Mesa flexora', 'pernas', 'weight'),
  (null, 'Levantamento terra', 'pernas', 'weight'), (null, 'Afundo', 'pernas', 'weight'), (null, 'Panturrilha em pé', 'pernas', 'weight'),
  (null, 'Desenvolvimento', 'ombros', 'weight'), (null, 'Elevação lateral', 'ombros', 'weight'), (null, 'Rosca direta', 'bracos', 'weight'),
  (null, 'Rosca martelo', 'bracos', 'weight'), (null, 'Tríceps corda', 'bracos', 'weight'), (null, 'Tríceps francês', 'bracos', 'weight'),
  (null, 'Prancha', 'core', 'time'), (null, 'Abdominal', 'core', 'bodyweight'), (null, 'Esteira', 'cardio', 'time'),
  (null, 'Bicicleta', 'cardio', 'time'), (null, 'Corda', 'cardio', 'time');

-- ---------- fichas ----------
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  position int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index workouts_user on public.workouts (user_id) where archived_at is null;

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  position int not null default 0,
  sets int not null default 3 check (sets between 1 and 20),
  reps int not null default 10 check (reps between 1 and 100),
  rest_s int not null default 90 check (rest_s between 0 and 600)
);
create index workout_exercises_workout on public.workout_exercises (workout_id, position);

-- ---------- sessões e séries ----------
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  name text not null check (char_length(name) between 1 and 40),
  logged_at timestamptz not null default now(), -- início
  local_date date not null,
  finished_at timestamptz check (finished_at is null or finished_at >= logged_at),
  created_at timestamptz not null default now()
);
create index workout_sessions_user on public.workout_sessions (user_id, logged_at desc);
create trigger workout_sessions_local_date before insert on public.workout_sessions
  for each row execute function public.set_local_date();

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  weight_g int check (weight_g between 0 and 1000000),
  reps int check (reps between 0 and 500),
  duration_s int check (duration_s between 0 and 86400),
  done_at timestamptz not null default now(),
  check (reps is not null or duration_s is not null)
);
create index workout_sets_session on public.workout_sets (session_id, done_at);
create index workout_sets_user_ex on public.workout_sets (user_id, exercise_id);

-- ---------- registros corporais ----------
create table public.body_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  logged_at timestamptz not null default now(),
  local_date date not null,
  weight_g int check (weight_g between 20000 and 400000),
  waist_mm int check (waist_mm between 300 and 2500),
  sleep_min int check (sleep_min between 0 and 1440),
  mood smallint check (mood between 1 and 5),
  note text check (char_length(note) <= 280),
  check (weight_g is not null or waist_mm is not null or sleep_min is not null or mood is not null)
);
create index body_logs_user on public.body_logs (user_id, logged_at desc);
create trigger body_logs_local_date before insert on public.body_logs
  for each row execute function public.set_local_date();

-- ---------- RLS ----------
alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;
alter table public.body_logs enable row level security;

create policy exercises_select on public.exercises for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy exercises_write on public.exercises for insert to authenticated with check (user_id = (select auth.uid()));
create policy exercises_delete on public.exercises for delete to authenticated using (user_id = (select auth.uid()));

create policy workouts_all on public.workouts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy wex_all on public.workout_exercises for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e where e.id = exercise_id and (e.user_id is null or e.user_id = (select auth.uid())))
  );

create policy sessions_all on public.workout_sessions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (workout_id is null or exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid())))
  );

create policy sets_select on public.workout_sets for select to authenticated using (user_id = (select auth.uid()));
create policy sets_insert on public.workout_sets for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e where e.id = exercise_id and (e.user_id is null or e.user_id = (select auth.uid())))
  );
create policy sets_delete on public.workout_sets for delete to authenticated using (user_id = (select auth.uid()));

create policy body_select on public.body_logs for select to authenticated using (user_id = (select auth.uid()));
create policy body_insert on public.body_logs for insert to authenticated with check (user_id = (select auth.uid()));
create policy body_delete on public.body_logs for delete to authenticated using (user_id = (select auth.uid()));

-- ---------- álbum: treino concluído vale pontos (1 por dia) ----------
insert into public.xp_rules (key, points, daily_cap, label) values ('workout', 30, 1, 'Treino concluído');

create or replace function public.album_on_workout() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.finished_at is not null and old.finished_at is null
     and exists (select 1 from public.workout_sets where session_id = new.id) then
    perform public.album_award(new.user_id, 'workout', new.id::text, '');
  end if;
  return new;
end $$;
revoke execute on function public.album_on_workout() from public, anon, authenticated;
create trigger album_workout after update of finished_at on public.workout_sessions
  for each row execute function public.album_on_workout();

-- ---------- grants (D-020) ----------
grant select, insert, delete on public.exercises to authenticated;
grant select, insert, update, delete on public.workouts, public.workout_exercises, public.workout_sessions to authenticated;
grant select, insert, delete on public.workout_sets, public.body_logs to authenticated;
grant select, insert, update, delete on public.exercises, public.workouts, public.workout_exercises,
  public.workout_sessions, public.workout_sets, public.body_logs to service_role;
