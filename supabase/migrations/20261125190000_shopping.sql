-- Finch · mercado (Etapa 2). Listas por espaço, itens com id do aparelho (offline), compras registradas.

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  budget_cents bigint check (budget_cents >= 0),
  status text not null default 'open' check (status in ('open', 'done')),
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index shopping_lists_ws on public.shopping_lists (workspace_id, status);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  qty numeric(8, 2) not null default 1 check (qty > 0 and qty <= 9999),
  unit text check (char_length(unit) <= 10),
  category text not null default 'outros',
  est_price_cents bigint check (est_price_cents >= 0),
  note text check (char_length(note) <= 200),
  checked boolean not null default false,
  checked_by uuid references public.profiles(id) on delete set null,
  checked_at timestamptz,
  added_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index shopping_items_list on public.shopping_items (list_id);

-- catálogo do espaço: autocompletar, favoritos, último preço
create table public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  category text not null default 'outros',
  unit text,
  favorite boolean not null default false,
  last_price_cents bigint,
  times_bought int not null default 0,
  updated_at timestamptz not null default now()
);
create unique index products_ws_name on public.products (workspace_id, lower(name));

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  list_id uuid unique references public.shopping_lists(id) on delete set null, -- uma compra por lista (sem duplicar)
  store text check (char_length(store) <= 80),
  total_cents bigint not null check (total_cents >= 0),
  purchased_on date not null,
  paid_by uuid references public.profiles(id) on delete set null,
  payment text not null default 'pix' check (payment in ('pix', 'debito', 'credito', 'dinheiro', 'vr', 'va', 'outro')),
  items_count int not null default 0,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index purchases_ws on public.purchases (workspace_id, purchased_on desc);

create table public.price_history (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  price_cents bigint not null check (price_cents >= 0),
  store text,
  seen_on date not null default current_date
);
create index price_history_product on public.price_history (product_id, seen_on desc);

-- itens herdam o espaço da lista
create or replace function public.inherit_list_workspace() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select workspace_id into new.workspace_id from public.shopping_lists where id = new.list_id;
  return new;
end $$;
revoke execute on function public.inherit_list_workspace() from public, anon, authenticated;
create trigger shopping_items_ws before insert or update of list_id on public.shopping_items
  for each row execute function public.inherit_list_workspace();

-- finaliza a compra de forma atômica e idempotente (uma compra por lista)
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
  select v_list.workspace_id, i.name, i.category, i.unit, 1, i.est_price_cents
    from public.shopping_items i where i.list_id = p_list_id and i.checked
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
revoke execute on function public.finish_shopping(uuid, text, bigint, date, uuid, text, boolean) from public, anon;
grant execute on function public.finish_shopping(uuid, text, bigint, date, uuid, text, boolean) to authenticated;

alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;
alter table public.products enable row level security;
alter table public.purchases enable row level security;
alter table public.price_history enable row level security;

create policy shopping_lists_all on public.shopping_lists for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy shopping_items_all on public.shopping_items for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy products_all on public.products for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy purchases_all on public.purchases for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy price_history_all on public.price_history for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

grant select, insert, update, delete on public.shopping_lists, public.shopping_items, public.products, public.purchases to authenticated;
grant select, insert on public.price_history to authenticated;
grant select, insert, update, delete on public.shopping_lists, public.shopping_items, public.products, public.purchases, public.price_history to service_role;
grant usage, select on sequence public.price_history_id_seq to authenticated, service_role;

-- tempo real: os dois aparelhos veem a lista mudar na hora (RLS vale também no realtime)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.shopping_items, public.shopping_lists;
  end if;
end $$;
