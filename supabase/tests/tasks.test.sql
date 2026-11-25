-- Tarefas: isolamento por espaço, responsável só membro, filhos herdam espaço.
\set ON_ERROR_STOP 1
\set QUIET on
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u)::text, false);
$$;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@x.com'), ('00000000-0000-0000-0000-0000000000b1', 'b@x.com'), ('00000000-0000-0000-0000-0000000000c1', 'c@x.com');
create temp table ids as
  select created_by as owner, id from public.workspaces where kind = 'personal';
insert into public.workspaces (id, kind, name, created_by) values ('00000000-0000-0000-0000-0000000000f1', 'shared', 'Nós', '00000000-0000-0000-0000-0000000000a1');
insert into public.workspace_members (workspace_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b1', 'member');
grant select on ids to authenticated;

set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
do $$ declare pa uuid; t uuid; begin
  select id into pa from ids where owner = '00000000-0000-0000-0000-0000000000a1';
  insert into public.tasks (id, workspace_id, title) values ('00000000-0000-0000-0000-00000000aa01', pa, 'Pessoal de A');
  insert into public.tasks (id, workspace_id, title, repeat, repeat_start, rotation) values
    ('00000000-0000-0000-0000-00000000aa02', '00000000-0000-0000-0000-0000000000f1', 'Lavar roupa', '{"freq":"weekly","days":[3]}', '2026-11-25',
     array['00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1']::uuid[]);
  -- filho tenta apontar para outro espaço: trigger corrige
  insert into public.task_occurrences (task_id, workspace_id, occurs_on) values ('00000000-0000-0000-0000-00000000aa02', pa, '2026-11-25');
  assert (select workspace_id from public.task_occurrences) = '00000000-0000-0000-0000-0000000000f1', 'ocorrência herda espaço';
  begin
    insert into public.tasks (workspace_id, title, assignee_id) values ('00000000-0000-0000-0000-0000000000f1', 'x', '00000000-0000-0000-0000-0000000000c1');
    raise exception 'FALHOU: responsável de fora';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
end $$;

select from pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
do $$ begin
  assert (select count(*) from public.tasks) = 1, 'B vê só a tarefa do Nós';
  assert (select title from public.tasks) = 'Lavar roupa';
  update public.task_occurrences set status = 'done', completed_by = '00000000-0000-0000-0000-0000000000b1';
  assert (select status from public.task_occurrences) = 'done', 'B conclui ocorrência compartilhada';
  update public.tasks set title = 'hack' where id = '00000000-0000-0000-0000-00000000aa01';
  begin
    insert into public.tasks (workspace_id, title) select id, 'invasão' from ids where owner = '00000000-0000-0000-0000-0000000000a1';
    raise exception 'FALHOU: B criou tarefa no pessoal de A';
  exception when insufficient_privilege then null; end;
end $$;

select from pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
do $$ begin
  assert (select count(*) from public.tasks) = 0, 'C não vê nada';
  assert (select count(*) from public.task_occurrences) = 0, 'C não vê ocorrências';
end $$;
reset role;
do $$ begin
  assert (select title from public.tasks where id = '00000000-0000-0000-0000-00000000aa01') = 'Pessoal de A', 'B não editou pessoal de A';
end $$;
\echo 'Tarefas: todos os testes passaram'
