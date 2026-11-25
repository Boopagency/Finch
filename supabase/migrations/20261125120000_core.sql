-- Finch · core: perfis, configurações, workspaces, membros, convites.
-- Regra: toda tabela nasce com RLS e policies na mesma migration.

-- ---------- utilitários ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- perfis ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  avatar_path text,
  tz text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  home_layout jsonb not null default '[]'::jsonb,
  quiet_start time not null default '22:00',
  quiet_end time not null default '07:30',
  updated_at timestamptz not null default now()
);
create trigger user_settings_touch before update on public.user_settings
  for each row execute function public.touch_updated_at();

-- ---------- workspaces ----------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('personal', 'shared')),
  name text not null check (char_length(name) between 1 and 60),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index workspaces_one_personal on public.workspaces (created_by) where kind = 'personal';

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  -- renda de referência autorizada para divisão proporcional (não lê finanças pessoais)
  reference_income_cents bigint check (reference_income_cents >= 0),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user on public.workspace_members (user_id);

-- workspace pessoal nunca recebe outro membro
create or replace function public.guard_personal_membership() returns trigger
language plpgsql set search_path = '' as $$
declare v_kind text; v_owner uuid;
begin
  select kind, created_by into v_kind, v_owner from public.workspaces where id = new.workspace_id;
  if v_kind = 'personal' and new.user_id <> v_owner then
    raise exception 'personal workspace cannot have other members';
  end if;
  return new;
end $$;
create trigger workspace_members_guard before insert or update on public.workspace_members
  for each row execute function public.guard_personal_membership();

-- ---------- convites ----------
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  token_hash text not null unique,
  invited_email text not null check (invited_email = lower(invited_email)),
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index invitations_workspace on public.invitations (workspace_id);

-- ---------- helpers de autorização ----------
create or replace function public.is_member(ws uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = (select auth.uid())
  )
$$;

create or replace function public.is_owner(ws uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = (select auth.uid()) and m.role = 'owner'
  )
$$;

create or replace function public.shares_workspace(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members a
    join public.workspace_members b on a.workspace_id = b.workspace_id
    where a.user_id = (select auth.uid()) and b.user_id = other
  )
$$;

-- ---------- novo usuário: perfil + configurações + workspace pessoal ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_ws uuid; v_name text;
begin
  v_name := coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1), '');
  insert into public.profiles (id, display_name) values (new.id, left(v_name, 60));
  insert into public.user_settings (user_id) values (new.id);
  insert into public.workspaces (kind, name, created_by) values ('personal', 'Pessoal', new.id) returning id into v_ws;
  insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, new.id, 'owner');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RPCs ----------
create or replace function public.create_shared_workspace(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_ws uuid; v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  insert into public.workspaces (kind, name, created_by) values ('shared', p_name, v_uid) returning id into v_ws;
  insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, v_uid, 'owner');
  return v_ws;
end $$;

-- aceita um convite com o token em claro; o hash é comparado no banco
create or replace function public.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := lower(coalesce((select auth.jwt()) ->> 'email', ''));
  v_inv public.invitations;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_inv from public.invitations
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
   for update;
  if not found then raise exception 'invitation not found'; end if;
  if v_inv.revoked_at is not null then raise exception 'invitation revoked'; end if;
  if v_inv.accepted_at is not null then
    if v_inv.accepted_by = v_uid then return v_inv.workspace_id; end if; -- idempotente
    raise exception 'invitation already used';
  end if;
  if v_inv.expires_at < now() then raise exception 'invitation expired'; end if;
  if v_inv.invited_email <> v_email then raise exception 'invitation is for another email'; end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_inv.workspace_id, v_uid, 'member') on conflict do nothing;
  update public.invitations set accepted_by = v_uid, accepted_at = now() where id = v_inv.id;
  return v_inv.workspace_id;
end $$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invitations enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy settings_all on public.user_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy workspaces_select on public.workspaces for select to authenticated
  using (public.is_member(id));
create policy workspaces_update on public.workspaces for update to authenticated
  using (public.is_owner(id)) with check (public.is_owner(id));

create policy members_select on public.workspace_members for select to authenticated
  using (public.is_member(workspace_id));
create policy members_update_self on public.workspace_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- sair de um workspace compartilhado, ou o dono remover alguém; nunca do pessoal
create policy members_delete on public.workspace_members for delete to authenticated
  using (
    (user_id = (select auth.uid()) or public.is_owner(workspace_id))
    and exists (select 1 from public.workspaces w where w.id = workspace_id and w.kind = 'shared')
  );

create policy invitations_select on public.invitations for select to authenticated
  using (public.is_member(workspace_id));
create policy invitations_insert on public.invitations for insert to authenticated
  with check (
    created_by = (select auth.uid()) and public.is_member(workspace_id)
    and exists (select 1 from public.workspaces w where w.id = workspace_id and w.kind = 'shared')
  );
create policy invitations_revoke on public.invitations for update to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

-- ---------- grants finos ----------
revoke all on public.profiles, public.user_settings, public.workspaces, public.workspace_members, public.invitations from anon;
revoke update on public.workspace_members from authenticated;
grant update (reference_income_cents) on public.workspace_members to authenticated;
revoke update on public.invitations from authenticated;
grant update (revoked_at) on public.invitations to authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_path, tz) on public.profiles to authenticated;
revoke insert, delete on public.profiles from authenticated;
revoke insert, delete on public.workspaces from authenticated;
revoke update on public.workspaces from authenticated;
grant update (name) on public.workspaces to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.create_shared_workspace(text) from public, anon;
revoke execute on function public.accept_invitation(text) from public, anon;
grant execute on function public.create_shared_workspace(text) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
