-- Água e hábitos: privados do dono, data local no fuso do dono, id do cliente idempotente.
\set ON_ERROR_STOP 1
\set QUIET on
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u)::text, false);
$$;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'h1@exemplo.com'),
  ('00000000-0000-0000-0000-0000000000d2', 'h2@exemplo.com');
update public.profiles set tz = 'Asia/Tokyo' where id = '00000000-0000-0000-0000-0000000000d2';

set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
do $$ declare h uuid; begin
  insert into public.water_logs (id, amount_ml) values ('00000000-0000-0000-0000-00000000aaa1', 300);
  -- reenvio da fila offline: mesmo id não duplica
  insert into public.water_logs (id, amount_ml) values ('00000000-0000-0000-0000-00000000aaa1', 300) on conflict (id) do nothing;
  assert (select sum(amount_ml) from public.water_logs) = 300, 'idempotente';
  assert (select local_date from public.water_logs) = (now() at time zone 'America/Sao_Paulo')::date, 'data local SP';
  begin insert into public.water_logs (amount_ml) values (5000); raise exception 'FALHOU: aceitou 5 L num registro';
  exception when check_violation then null; end;
  begin insert into public.water_logs (amount_ml, logged_at) values (200, now() + interval '1 day'); raise exception 'FALHOU: futuro';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  begin update public.user_settings set water_goal_ml = 9000; raise exception 'FALHOU: meta de 9 L';
  exception when check_violation then null; end;
  insert into public.habits (id, name) values ('00000000-0000-0000-0000-00000000bbb1', 'Ler') returning id into h;
  insert into public.habit_logs (habit_id) values (h);
end $$;

select from pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
do $$ begin
  assert (select count(*) from public.water_logs) = 0, 'D2 não vê água de D1';
  assert (select count(*) from public.habits) = 0, 'D2 não vê hábitos de D1';
  assert (select count(*) from public.habit_logs) = 0, 'D2 não vê registros de D1';
  begin
    insert into public.habit_logs (habit_id) values ('00000000-0000-0000-0000-00000000bbb1');
    raise exception 'FALHOU: registrou no hábito alheio';
  exception when insufficient_privilege then null; end;
  delete from public.water_logs; -- não apaga nada alheio
  insert into public.water_logs (amount_ml) values (250);
  assert (select local_date from public.water_logs) = (now() at time zone 'Asia/Tokyo')::date, 'data local no fuso do dono';
end $$;
reset role;
do $$ begin
  assert (select count(*) from public.water_logs where user_id = '00000000-0000-0000-0000-0000000000d1') = 1, 'delete alheio não apagou';
end $$;
\echo 'Saúde: todos os testes passaram'
