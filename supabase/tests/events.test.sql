-- Agenda: isolamento por espaço e validações de horário.
\set ON_ERROR_STOP 1
\set QUIET on
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u)::text, false);
$$;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'e1@x.com'), ('00000000-0000-0000-0000-0000000000e2', 'e2@x.com');
create temp table ids as select created_by as owner, id from public.workspaces where kind = 'personal';
grant select on ids to authenticated;
set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
do $$ declare ws uuid; begin
  select id into ws from ids where owner = '00000000-0000-0000-0000-0000000000e1';
  insert into public.events (workspace_id, title, start_date, end_date, start_time, end_time) values (ws, 'Consulta', '2026-11-26', '2026-11-26', '14:00', '15:00');
  insert into public.events (workspace_id, title, start_date, end_date) values (ws, 'Feriado', '2026-12-25', '2026-12-25');
  begin
    insert into public.events (workspace_id, title, start_date, end_date, start_time, end_time) values (ws, 'x', '2026-11-26', '2026-11-26', '15:00', '14:00');
    raise exception 'FALHOU: fim antes do início';
  exception when check_violation then null; end;
  begin
    insert into public.events (workspace_id, title, start_date, end_date, start_time) values (ws, 'x', '2026-11-26', '2026-11-26', '15:00');
    raise exception 'FALHOU: só início';
  exception when check_violation then null; end;
end $$;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000000e2');
do $$ begin
  assert (select count(*) from public.events) = 0, 'e2 não vê eventos pessoais de e1';
  update public.events set title = 'x';
end $$;
reset role;
do $$ begin assert (select count(*) from public.events where title = 'Consulta') = 1, 'intacto'; end $$;
\echo 'Agenda: todos os testes passaram'
