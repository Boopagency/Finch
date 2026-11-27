-- Finch · recados do casal (conversa dentro de "Nós") e o bichinho que vocês cuidam juntos.
-- Sem punição (D-017): o bichinho nunca morre, nunca perde amor; ficar sem carinho só muda o humor.

-- ---------------------------------------------------------------- recados
create table public.couple_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text check (char_length(body) between 1 and 2000),
  photo_path text check (photo_path is null or public.photo_space(photo_path) = workspace_id),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  read_at timestamptz,
  constraint couple_messages_not_empty check (body is not null or photo_path is not null)
);
create index couple_messages_ws on public.couple_messages (workspace_id, created_at desc);
-- quantos recados não lidos do outro: o Hoje pergunta isso a cada abertura
create index couple_messages_unread on public.couple_messages (workspace_id, author_id) where read_at is null;

alter table public.couple_messages enable row level security;
-- ler: quem é do espaço. escrever/mudar/apagar: só o autor, e sempre no próprio nome
create policy couple_messages_select on public.couple_messages for select to authenticated
  using (public.is_member(workspace_id));
create policy couple_messages_insert on public.couple_messages for insert to authenticated
  with check (public.is_member(workspace_id) and author_id = (select auth.uid()));
create policy couple_messages_update on public.couple_messages for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy couple_messages_delete on public.couple_messages for delete to authenticated
  using (author_id = (select auth.uid()));
grant select, insert, update, delete on public.couple_messages to authenticated;
grant select, insert, update, delete on public.couple_messages to service_role;

-- marcar como lidos os recados do outro (a policy de update é só do autor, por isso a função)
create or replace function public.mark_messages_read(p_workspace uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_n integer;
begin
  if v_uid is null or not public.is_member(p_workspace) then raise exception 'forbidden'; end if;
  with marked as (
    update public.couple_messages set read_at = now()
    where workspace_id = p_workspace and author_id <> v_uid and read_at is null
    returning 1
  ) select count(*) into v_n from marked;
  return v_n;
end $$;
revoke execute on function public.mark_messages_read(uuid) from public, anon;
grant execute on function public.mark_messages_read(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------- bichinho
create table public.pets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  species text not null check (species in ('gato', 'cachorro', 'coelho', 'passarinho', 'monstrinho', 'dragao')),
  name text not null check (char_length(name) between 1 and 30),
  love integer not null default 0 check (love >= 0), -- só sobe: amor acumulado vira o nível
  cared_at timestamptz not null default now(),       -- último cuidado, de qualquer um dos dois
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.pet_feeds (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('comida', 'carinho', 'brincar', 'mimo')),
  note text check (char_length(note) <= 140),
  love integer not null check (love between 0 and 50),
  local_date date not null, -- dia da pessoa (fuso do perfil): o teto diário é por dia local
  created_at timestamptz not null default now()
);
create index pet_feeds_pet on public.pet_feeds (pet_id, created_at desc);
-- teto diário por pessoa e por tipo de cuidado (anti-exploração, como o álbum)
create unique index pet_feeds_cap on public.pet_feeds (pet_id, user_id, kind, local_date);

alter table public.pets enable row level security;
alter table public.pet_feeds enable row level security;
create policy pets_all on public.pets for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy pet_feeds_select on public.pet_feeds for select to authenticated
  using (public.is_member(workspace_id));
grant select, insert, update, delete on public.pets to authenticated, service_role;
grant select on public.pet_feeds to authenticated;
grant select, insert, update, delete on public.pet_feeds to service_role;

/**
 * Cuidar do bichinho: registra o carinho, soma amor e marca a hora — tudo de uma vez.
 * Cada pessoa pode dar cada tipo de cuidado uma vez por dia (o segundo não dá erro: devolve "já tinha dado hoje").
 * Nada é tirado em nenhuma hipótese: amor só sobe.
 */
create or replace function public.pet_care(p_pet uuid, p_kind text, p_note text default null)
returns table (love integer, gained integer, already boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_ws uuid;
  v_day date;
  v_love integer := case p_kind when 'comida' then 10 when 'carinho' then 10 when 'brincar' then 15 when 'mimo' then 20 else 0 end;
  v_new integer;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_love = 0 then raise exception 'invalid kind'; end if;
  select p.workspace_id into v_ws from public.pets p where p.id = p_pet;
  if v_ws is null or not public.is_member(v_ws) then raise exception 'forbidden'; end if;
  v_day := (now() at time zone coalesce((select tz from public.profiles where id = v_uid), 'America/Sao_Paulo'))::date;

  insert into public.pet_feeds (pet_id, workspace_id, user_id, kind, note, love, local_date)
  values (p_pet, v_ws, v_uid, p_kind, nullif(btrim(coalesce(p_note, '')), ''), v_love, v_day)
  on conflict (pet_id, user_id, kind, local_date) do nothing;

  if not found then -- já tinha dado esse cuidado hoje: o bichinho agradece, mas não soma de novo
    select p.love into v_new from public.pets p where p.id = p_pet;
    return query select v_new, 0, true;
    return; -- return query não encerra a função: sem isso o amor somaria de novo
  end if;

  update public.pets p set love = p.love + v_love, cared_at = now() where p.id = p_pet returning p.love into v_new;
  return query select v_new, v_love, false;
end $$;
revoke execute on function public.pet_care(uuid, text, text) from public, anon;
grant execute on function public.pet_care(uuid, text, text) to authenticated, service_role;

-- recados e bichinho aparecem na hora para os dois (como o mercado)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.couple_messages, public.pets;
  end if;
end $$;
