-- Cozinha: espaço compartilhado vê, estranho não; compra repõe a despensa; cardápio não usa receita de outro espaço.
\set ON_ERROR_STOP 1
\set QUIET on
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u)::text, false);
$$;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'k1@exemplo.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'k2@exemplo.com'),
  ('00000000-0000-0000-0000-0000000000c3', 'k3@exemplo.com');
insert into public.workspaces (id, kind, name, created_by) values
  ('00000000-0000-0000-0000-00000000c0c0', 'shared', 'Nós', '00000000-0000-0000-0000-0000000000c1');
insert into public.workspace_members (workspace_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000c0c0', '00000000-0000-0000-0000-0000000000c1', 'owner'),
  ('00000000-0000-0000-0000-00000000c0c0', '00000000-0000-0000-0000-0000000000c2', 'member');

set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
do $$ declare ws uuid := '00000000-0000-0000-0000-00000000c0c0'; l uuid; r uuid; begin
  insert into public.pantry_items (workspace_id, name, qty, min_qty) values (ws, 'Arroz', 0.5, 2), (ws, 'Café', 1, 1);
  begin insert into public.pantry_items (workspace_id, name) values (ws, 'arroz'); raise exception 'FALHOU: item duplicado';
  exception when unique_violation then null; end;
  begin insert into public.pantry_items (workspace_id, name, qty) values (ws, 'Sal', -1); raise exception 'FALHOU: negativo';
  exception when check_violation then null; end;

  insert into public.shopping_lists (id, workspace_id, name) values ('00000000-0000-0000-0000-00000000c111', ws, 'Mercado') returning id into l;
  insert into public.shopping_items (list_id, workspace_id, name, qty, checked) values
    (l, ws, 'arroz', 2, true), (l, ws, 'Arroz', 1, true), (l, ws, 'Banana', 6, true), (l, ws, 'Café', 1, false);
  perform public.finish_shopping(l, 'Mercado X', 5000, current_date, null, 'pix', false);
  assert (select qty from public.pantry_items where name = 'Arroz') = 3.5, 'compra somou na despensa';
  assert (select qty from public.pantry_items where name = 'Café') = 1, 'item não marcado não entra';
  assert not exists (select 1 from public.pantry_items where name = 'Banana'), 'não cria itens que a despensa não acompanha';
  -- finalizar de novo não soma de novo
  perform public.finish_shopping(l, 'Mercado X', 5000, current_date, null, 'pix', false);
  assert (select qty from public.pantry_items where name = 'Arroz') = 3.5, 'idempotente';

  insert into public.recipes (id, workspace_id, title, ingredients) values ('00000000-0000-0000-0000-00000000c222', ws, 'Risoto', '1 kg arroz') returning id into r;
  insert into public.meal_plan (workspace_id, day, slot, recipe_id, title) values (ws, current_date, 'jantar', r, 'Risoto');
  begin insert into public.meal_plan (workspace_id, day, slot, title) values (ws, current_date, 'jantar', 'Pizza'); raise exception 'FALHOU: duas refeições no mesmo horário';
  exception when unique_violation then null; end;
end $$;

select from pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
do $$ begin
  assert (select count(*) from public.pantry_items) = 2, 'parceira vê a despensa';
  assert (select count(*) from public.recipes) = 1, 'parceira vê receitas';
end $$;

select from pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
do $$ declare mine uuid; begin
  assert (select count(*) from public.pantry_items) = 0, 'estranho não vê despensa';
  assert (select count(*) from public.recipes) = 0, 'estranho não vê receitas';
  assert (select count(*) from public.meal_plan) = 0, 'estranho não vê cardápio';
  begin insert into public.pantry_items (workspace_id, name) values ('00000000-0000-0000-0000-00000000c0c0', 'Invasor'); raise exception 'FALHOU: escreveu no espaço alheio';
  exception when insufficient_privilege then null; end;
  select id into mine from public.workspaces where kind = 'personal';
  begin
    insert into public.meal_plan (workspace_id, day, slot, recipe_id, title) values (mine, current_date, 'almoco', '00000000-0000-0000-0000-00000000c222', 'x');
    raise exception 'FALHOU: usou receita de outro espaço';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
\echo 'Cozinha: todos os testes passaram'
