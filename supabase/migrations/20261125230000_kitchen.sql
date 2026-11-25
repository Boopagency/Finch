-- Finch · cozinha (Etapa 5): despensa, receitas e cardápio, por espaço (normalmente o "Nós").

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  qty numeric(8, 2) not null default 0 check (qty >= 0 and qty <= 9999),
  unit text check (char_length(unit) <= 10),
  min_qty numeric(8, 2) not null default 0 check (min_qty >= 0 and min_qty <= 9999),
  category text not null default 'outros',
  expires_on date,
  updated_at timestamptz not null default now()
);
create unique index pantry_ws_name on public.pantry_items (workspace_id, lower(name));

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  servings int not null default 2 check (servings between 1 and 50),
  prep_min int check (prep_min between 1 and 1440),
  ingredients text not null default '' check (char_length(ingredients) <= 4000), -- um por linha: "2 tomate"
  steps text not null default '' check (char_length(steps) <= 8000),
  created_at timestamptz not null default now()
);
create index recipes_ws on public.recipes (workspace_id, title);

create table public.meal_plan (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  day date not null,
  slot text not null check (slot in ('cafe', 'almoco', 'jantar')),
  recipe_id uuid references public.recipes(id) on delete set null,
  title text not null check (char_length(title) between 1 and 80),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  unique (workspace_id, day, slot)
);

-- finalizar compra repõe o que a despensa acompanha (só itens que já estão nela)
create or replace function public.pantry_on_purchase() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  update public.pantry_items p
     set qty = least(9999, p.qty + s.qty), updated_at = now()
    from (select lower(name) as n, sum(qty) as qty from public.shopping_items
           where list_id = new.list_id and checked group by lower(name)) s
   where p.workspace_id = new.workspace_id and lower(p.name) = s.n;
  return new;
end $$;
create trigger pantry_purchase after insert on public.purchases
  for each row when (new.list_id is not null) execute function public.pantry_on_purchase();

alter table public.pantry_items enable row level security;
alter table public.recipes enable row level security;
alter table public.meal_plan enable row level security;

create policy pantry_all on public.pantry_items for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy recipes_all on public.recipes for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy meal_plan_all on public.meal_plan for all to authenticated
  using (public.is_member(workspace_id))
  with check (
    public.is_member(workspace_id)
    and (recipe_id is null or exists (select 1 from public.recipes r where r.id = recipe_id and r.workspace_id = meal_plan.workspace_id))
  );

grant select, insert, update, delete on public.pantry_items, public.recipes, public.meal_plan to authenticated, service_role;
