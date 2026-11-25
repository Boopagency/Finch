-- Finch · coisas da casa (Etapa 5): itens com garantia e foto da nota, e histórico de manutenções.

create table public.home_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null default 'eletro' check (kind in ('eletro', 'movel', 'veiculo', 'eletronico', 'imovel', 'outro')),
  bought_on date,
  price_cents bigint check (price_cents >= 0),
  warranty_until date check (warranty_until is null or bought_on is null or warranty_until >= bought_on),
  notes text check (char_length(notes) <= 1000),
  photo_path text check (photo_path is null or public.photo_space(photo_path) = workspace_id), -- nota fiscal / garantia
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index home_items_ws on public.home_items (workspace_id, name);

create table public.home_maintenance (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.home_items(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  done_on date not null default current_date,
  description text not null check (char_length(description) between 1 and 200),
  cost_cents bigint check (cost_cents >= 0),
  next_on date check (next_on is null or next_on > done_on),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index home_maintenance_item on public.home_maintenance (item_id, done_on desc);

-- manutenção herda o espaço do item (o cliente não escolhe)
create or replace function public.maintenance_workspace() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select workspace_id into new.workspace_id from public.home_items where id = new.item_id;
  return new;
end $$;
revoke execute on function public.maintenance_workspace() from public, anon, authenticated;
create trigger home_maintenance_ws before insert or update of item_id on public.home_maintenance
  for each row execute function public.maintenance_workspace();

alter table public.home_items enable row level security;
alter table public.home_maintenance enable row level security;
create policy home_items_all on public.home_items for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy home_maintenance_all on public.home_maintenance for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
grant select, insert, update, delete on public.home_items, public.home_maintenance to authenticated, service_role;
