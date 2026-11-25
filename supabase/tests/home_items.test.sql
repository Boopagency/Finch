-- Coisas da casa: casal vê, estranho não; manutenção herda o espaço do item (não dá para "pendurar" em item alheio).
\set ON_ERROR_STOP 1
\set QUIET on
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u)::text, false);
$$;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000004a1', 'c1@x.com'), ('00000000-0000-0000-0000-0000000004b1', 'c2@x.com'), ('00000000-0000-0000-0000-0000000004c1', 'c3@x.com');
insert into public.workspaces (id, kind, name, created_by) values ('00000000-0000-0000-0000-0000000004f1', 'shared', 'Nós', '00000000-0000-0000-0000-0000000004a1');
insert into public.workspace_members (workspace_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000004f1', '00000000-0000-0000-0000-0000000004a1', 'owner'),
  ('00000000-0000-0000-0000-0000000004f1', '00000000-0000-0000-0000-0000000004b1', 'member');

set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000004a1');
do $$ declare ws uuid := '00000000-0000-0000-0000-0000000004f1'; begin
  insert into public.home_items (id, workspace_id, name, bought_on, warranty_until, price_cents)
    values ('00000000-0000-0000-0000-00000000a401', ws, 'Geladeira', '2026-01-10', '2027-01-10', 349900);
  begin insert into public.home_items (workspace_id, name, bought_on, warranty_until) values (ws, 'x', '2026-02-01', '2026-01-01'); raise exception 'FALHOU: garantia antes da compra';
  exception when check_violation then null; end;
  insert into public.home_maintenance (item_id, workspace_id, description, done_on, next_on)
    values ('00000000-0000-0000-0000-00000000a401', (select id from public.workspaces where kind = 'personal'), 'Limpeza', '2026-11-01', '2027-05-01');
  assert (select workspace_id from public.home_maintenance) = ws, 'herdou o espaço do item (ignora o que o cliente mandou)';
  begin insert into public.home_maintenance (item_id, description, done_on, next_on) values ('00000000-0000-0000-0000-00000000a401', 'x', '2026-11-01', '2026-10-01'); raise exception 'FALHOU: próxima antes da feita';
  exception when check_violation then null; end;
end $$;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000004b1');
do $$ begin
  assert (select count(*) from public.home_items) = 1 and (select count(*) from public.home_maintenance) = 1, 'parceira vê';
end $$;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000004c1');
do $$ begin
  assert (select count(*) from public.home_items) = 0 and (select count(*) from public.home_maintenance) = 0, 'estranho não vê';
  begin insert into public.home_maintenance (item_id, description) values ('00000000-0000-0000-0000-00000000a401', 'invasão'); raise exception 'FALHOU: manutenção em item alheio';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
\echo 'Coisas da casa: todos os testes passaram'
