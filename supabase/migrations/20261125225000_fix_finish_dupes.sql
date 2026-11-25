-- Corrige finalizar compra com o mesmo item repetido na lista ("arroz" e "Arroz"):
-- o catálogo recebia duas linhas para o mesmo produto e o upsert falhava.
create or replace function public.finish_shopping(
  p_list_id uuid, p_store text, p_total_cents bigint, p_purchased_on date, p_paid_by uuid, p_payment text, p_carry_over boolean
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare v_list public.shopping_lists; v_purchase uuid; v_new_list uuid;
begin
  select * into v_list from public.shopping_lists where id = p_list_id for update;
  if not found then raise exception 'list not found'; end if;
  select id into v_purchase from public.purchases where list_id = p_list_id;
  if v_purchase is not null then return v_purchase; end if; -- já finalizada: idempotente

  insert into public.purchases (workspace_id, list_id, store, total_cents, purchased_on, paid_by, payment, items_count)
  values (v_list.workspace_id, p_list_id, nullif(p_store, ''), p_total_cents, p_purchased_on, p_paid_by, p_payment,
          (select count(*) from public.shopping_items where list_id = p_list_id and checked))
  returning id into v_purchase;

  -- catálogo: conta compras e guarda último preço estimado
  insert into public.products (workspace_id, name, category, unit, times_bought, last_price_cents)
  select distinct on (lower(i.name)) v_list.workspace_id, i.name, i.category, i.unit, 1, i.est_price_cents
    from public.shopping_items i where i.list_id = p_list_id and i.checked
   order by lower(i.name), i.est_price_cents desc nulls last
  on conflict (workspace_id, lower(name)) do update
    set times_bought = public.products.times_bought + 1,
        last_price_cents = coalesce(excluded.last_price_cents, public.products.last_price_cents),
        category = excluded.category, updated_at = now();
  insert into public.price_history (product_id, workspace_id, price_cents, store, seen_on)
  select p.id, v_list.workspace_id, i.est_price_cents, nullif(p_store, ''), p_purchased_on
    from public.shopping_items i join public.products p on p.workspace_id = v_list.workspace_id and lower(p.name) = lower(i.name)
   where i.list_id = p_list_id and i.checked and i.est_price_cents is not null;

  update public.shopping_lists set status = 'done', done_at = now() where id = p_list_id;

  if p_carry_over and exists (select 1 from public.shopping_items where list_id = p_list_id and not checked) then
    insert into public.shopping_lists (workspace_id, name) values (v_list.workspace_id, v_list.name) returning id into v_new_list;
    update public.shopping_items set list_id = v_new_list where list_id = p_list_id and not checked;
  end if;
  return v_purchase;
end $$;
