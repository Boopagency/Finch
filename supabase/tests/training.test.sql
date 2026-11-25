-- Treinos e corpo: privados, biblioteca global legível, séries idempotentes, pontos ao concluir.
\set ON_ERROR_STOP 1
\set QUIET on
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u)::text, false);
$$;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 't1@exemplo.com'),
  ('00000000-0000-0000-0000-0000000000e2', 't2@exemplo.com');

set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
do $$ declare ex uuid; w uuid; begin
  assert (select count(*) from public.exercises where user_id is null) >= 20, 'biblioteca global visível';
  select id into ex from public.exercises where name = 'Supino reto';
  insert into public.exercises (name, muscle) values ('Supino máquina', 'peito');
  begin insert into public.exercises (user_id, name) values (null, 'Global falso'); raise exception 'FALHOU: criou exercício global';
  exception when insufficient_privilege then null; end;
  begin update public.exercises set name = 'x' where id = ex; exception when insufficient_privilege then null; end;
  assert (select name from public.exercises where id = ex) = 'Supino reto', 'não altera biblioteca global';

  insert into public.workouts (id, name) values ('00000000-0000-0000-0000-00000000f001', 'Treino A') returning id into w;
  insert into public.workout_exercises (workout_id, exercise_id, sets, reps) values (w, ex, 4, 8);
  insert into public.workout_sessions (id, workout_id, name) values ('00000000-0000-0000-0000-00000000f101', w, 'Treino A');
  assert (select local_date from public.workout_sessions) = (now() at time zone 'America/Sao_Paulo')::date, 'data local';
  insert into public.workout_sets (id, session_id, exercise_id, weight_g, reps)
    values ('00000000-0000-0000-0000-00000000f201', '00000000-0000-0000-0000-00000000f101', ex, 60000, 8);
  -- reenvio da fila: não duplica
  insert into public.workout_sets (id, session_id, exercise_id, weight_g, reps)
    values ('00000000-0000-0000-0000-00000000f201', '00000000-0000-0000-0000-00000000f101', ex, 60000, 8) on conflict (id) do nothing;
  assert (select count(*) from public.workout_sets) = 1, 'série idempotente';
  begin insert into public.workout_sets (session_id, exercise_id, weight_g) values ('00000000-0000-0000-0000-00000000f101', ex, 1000);
    raise exception 'FALHOU: série sem reps nem tempo';
  exception when check_violation then null; end;

  update public.workout_sessions set finished_at = now() where id = '00000000-0000-0000-0000-00000000f101';
  insert into public.body_logs (weight_g, sleep_min, mood) values (82500, 420, 4);
  begin insert into public.body_logs (note) values ('vazio'); raise exception 'FALHOU: registro sem medida';
  exception when check_violation then null; end;
end $$;
reset role;
do $$ begin
  assert (select count(*) from public.xp_events where user_id = '00000000-0000-0000-0000-0000000000e1' and rule_key = 'workout') = 1,
    'treino concluído dá pontos';
end $$;

set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000000e2');
do $$ declare ex uuid; begin
  assert (select count(*) from public.exercises where name = 'Supino máquina') = 0, 'exercício próprio é privado';
  assert (select count(*) from public.workouts) = 0, 'fichas privadas';
  assert (select count(*) from public.workout_sessions) = 0, 'sessões privadas';
  assert (select count(*) from public.workout_sets) = 0, 'séries privadas';
  assert (select count(*) from public.body_logs) = 0, 'corpo privado';
  select id into ex from public.exercises where name = 'Agachamento livre';
  begin
    insert into public.workout_sets (session_id, exercise_id, reps) values ('00000000-0000-0000-0000-00000000f101', ex, 5);
    raise exception 'FALHOU: série na sessão alheia';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.workout_exercises (workout_id, exercise_id) values ('00000000-0000-0000-0000-00000000f001', ex);
    raise exception 'FALHOU: exercício na ficha alheia';
  exception when insufficient_privilege then null; end;
  -- sessão vazia concluída não pontua
  insert into public.workout_sessions (id, name) values ('00000000-0000-0000-0000-00000000f102', 'Livre');
  update public.workout_sessions set finished_at = now() where id = '00000000-0000-0000-0000-00000000f102';
end $$;
reset role;
do $$ begin
  assert (select count(*) from public.xp_events where user_id = '00000000-0000-0000-0000-0000000000e2') = 0, 'sessão vazia não pontua';
end $$;
\echo 'Treinos: todos os testes passaram'
