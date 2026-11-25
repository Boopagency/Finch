-- Mercado: compartilhado entre membros, compra única por lista, pendentes vão para nova lista.
\set ON_ERROR_STOP 1
\set QUIET on
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u)::text, false);
$$;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a5', 'a@x.com'), ('00000000-0000-0000-0000-0000000000b5', 'b@x.com'), ('00000000-0000-0000-0000-0000000000c5', 'c@x.com');
insert into public.workspaces (id, kind, name, created_by) values ('00000000-0000-0000-0000-0000000000f5', 'shared', 'Nós', '00000000-0000-0000-0000-0000000000a5');
insert into public.workspace_members (workspace_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000a5', 'owner'), ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000b5', 'member');

set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000000a5');
do $$ begin
  insert into public.shopping_lists (id, workspace_id, name) values ('00000000-0000-0000-0000-00000000a1a1', '00000000-0000-0000-0000-0000000000f5', 'Mercado');
  insert into public.shopping_items (id, list_id, name, est_price_cents) values
    ('00000000-0000-0000-0000-00000000b1b1', '00000000-0000-0000-0000-00000000a1a1', 'Leite', 550),
    ('00000000-0000-0000-0000-00000000b1b2', '00000000-0000-0000-0000-00000000a1a1', 'Ovos', 1500),
    ('00000000-0000-0000-0000-00000000b1b3', '00000000-0000-0000-0000-00000000a1a1', 'Detergente', null);
  -- reenvio offline do mesmo item não duplica
  insert into public.shopping_items (id, list_id, name) values ('00000000-0000-0000-0000-00000000b1b1', '00000000-0000-0000-0000-00000000a1a1', 'Leite') on conflict (id) do nothing;
  assert (select count(*) from public.shopping_items) = 3, 'idempotente';
end $$;

select from pg_temp.as_user('00000000-0000-0000-0000-0000000000b5');
do $$ declare p1 uuid; p2 uuid; newlist uuid; begin
  update public.shopping_items set checked = true where name in ('Leite', 'Ovos');
  p1 := public.finish_shopping('00000000-0000-0000-0000-00000000a1a1', 'Mercado X', 2050, '2026-11-25', '00000000-0000-0000-0000-0000000000b5', 'pix', true);
  p2 := public.finish_shopping('00000000-0000-0000-0000-00000000a1a1', 'Mercado X', 2050, '2026-11-25', '00000000-0000-0000-0000-0000000000b5', 'pix', true);
  assert p1 = p2, 'finalizar de novo não cria outra compra';
  assert (select count(*) from public.purchases) = 1, 'uma compra';
  assert (select status from public.shopping_lists where id = '00000000-0000-0000-0000-00000000a1a1') = 'done';
  select list_id into newlist from public.shopping_items where name = 'Detergente';
  assert newlist <> '00000000-0000-0000-0000-00000000a1a1', 'pendente foi para nova lista';
  assert (select times_bought from public.products where name = 'Leite') = 1, 'catálogo atualizado';
  assert (select count(*) from public.price_history) = 2, 'histórico de preço';
end $$;

select from pg_temp.as_user('00000000-0000-0000-0000-0000000000c5');
do $$ begin
  assert (select count(*) from public.shopping_lists) = 0, 'C não vê listas';
  assert (select count(*) from public.purchases) = 0, 'C não vê compras';
  begin
    perform public.finish_shopping('00000000-0000-0000-0000-00000000a1a1', 'x', 1, '2026-11-25', null, 'pix', false);
    raise exception 'FALHOU: C finalizou lista alheia';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
end $$;
\echo 'Mercado: todos os testes passaram'
