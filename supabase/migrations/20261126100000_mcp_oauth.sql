-- Finch · MCP para o Claude: OAuth 2.1 (código + PKCE, registro dinâmico de cliente).
-- O Claude recebe um token opaco do Finch; o servidor guarda uma sessão Supabase dedicada (criada com a senha
-- na tela de autorização) e usa o JWT dela em cada chamada: tudo passa pela RLS como a própria pessoa.
-- Tabelas sem acesso direto da API (sem GRANT): só as funções abaixo, que conferem cada passo.
-- Tokens do Finch são guardados como hash (sha-256); quem tem o token tem o mesmo poder que a sessão.

create table public.mcp_clients (
  id text primary key,
  name text not null check (char_length(name) between 1 and 100),
  redirect_uris text[] not null check (array_length(redirect_uris, 1) between 1 and 10),
  created_at timestamptz not null default now()
);

create table public.mcp_codes (
  code_hash text primary key,
  client_id text not null references public.mcp_clients(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  redirect_uri text not null,
  challenge text not null,
  sb_access text not null,
  sb_refresh text not null,
  sb_expires timestamptz not null,
  expires_at timestamptz not null
);

create table public.mcp_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_id text not null references public.mcp_clients(id) on delete cascade,
  access_hash text unique,
  access_expires timestamptz,
  refresh_hash text unique,
  sb_access text not null,
  sb_refresh text not null,
  sb_expires timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index mcp_grants_user on public.mcp_grants (user_id) where revoked_at is null;

alter table public.mcp_clients enable row level security;
alter table public.mcp_codes enable row level security;
alter table public.mcp_grants enable row level security;

-- endereço de retorno aceitável: https, ou http em localhost (Claude Code/Desktop recebem no próprio computador)
create or replace function public.mcp_valid_redirect(p_uri text) returns boolean
language sql immutable set search_path = '' as $$
  select p_uri ~ '^https://[^\s]+$' or p_uri ~ '^http://(localhost|127\.0\.0\.1)(:\d+)?(/[^\s]*)?$'
$$;

create or replace function public.mcp_register_client(p_name text, p_redirect_uris text[]) returns text
language plpgsql security definer set search_path = '' as $$
declare v_id text := 'mcp_' || replace(gen_random_uuid()::text, '-', ''); u text;
begin
  if p_redirect_uris is null or array_length(p_redirect_uris, 1) is null or array_length(p_redirect_uris, 1) > 10 then raise exception 'invalid redirect_uris'; end if;
  foreach u in array p_redirect_uris loop
    if char_length(u) > 500 or not public.mcp_valid_redirect(u) then raise exception 'invalid redirect_uri'; end if;
  end loop;
  insert into public.mcp_clients (id, name, redirect_uris) values (v_id, left(coalesce(nullif(trim(p_name), ''), 'Cliente MCP'), 100), p_redirect_uris);
  return v_id;
end $$;

create or replace function public.mcp_client(p_id text) returns table (name text, redirect_uris text[])
language sql stable security definer set search_path = '' as $$
  select c.name, c.redirect_uris from public.mcp_clients c where c.id = p_id
$$;

-- tela de autorização: a pessoa logada aprova; guarda a sessão dedicada junto do código (5 min)
create or replace function public.mcp_create_code(
  p_client text, p_redirect text, p_challenge text, p_code_hash text, p_sb_access text, p_sb_refresh text, p_sb_expires timestamptz
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.mcp_clients where id = p_client and p_redirect = any (redirect_uris)) then raise exception 'invalid client'; end if;
  if p_challenge !~ '^[A-Za-z0-9_-]{43}$' or p_code_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid params'; end if;
  delete from public.mcp_codes where expires_at < now();
  insert into public.mcp_codes values (p_code_hash, p_client, (select auth.uid()), p_redirect, p_challenge, p_sb_access, p_sb_refresh, p_sb_expires, now() + interval '5 minutes');
end $$;

-- troca código (uso único) + PKCE por tokens do Finch
create or replace function public.mcp_exchange_code(
  p_code_hash text, p_client text, p_redirect text, p_verifier_challenge text, p_access_hash text, p_refresh_hash text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare c public.mcp_codes; g uuid;
begin
  delete from public.mcp_codes where code_hash = p_code_hash returning * into c;
  if c.code_hash is null or c.expires_at < now() or c.client_id <> p_client or c.redirect_uri <> p_redirect or c.challenge <> p_verifier_challenge then
    return null;
  end if;
  insert into public.mcp_grants (user_id, client_id, access_hash, access_expires, refresh_hash, sb_access, sb_refresh, sb_expires)
  values (c.user_id, c.client_id, p_access_hash, now() + interval '1 hour', p_refresh_hash, c.sb_access, c.sb_refresh, c.sb_expires)
  returning id into g;
  return g;
end $$;

-- renova (rotação: o refresh token antigo deixa de valer)
create or replace function public.mcp_refresh_grant(p_refresh_hash text, p_client text, p_access_hash text, p_new_refresh_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.mcp_grants
     set access_hash = p_access_hash, access_expires = now() + interval '1 hour', refresh_hash = p_new_refresh_hash
   where refresh_hash = p_refresh_hash and client_id = p_client and revoked_at is null;
  return found;
end $$;

-- a cada chamada MCP: token válido → sessão Supabase da pessoa
create or replace function public.mcp_session(p_access_hash text)
returns table (grant_id uuid, user_id uuid, sb_access text, sb_refresh text, sb_expires timestamptz)
language sql security definer set search_path = '' as $$
  update public.mcp_grants g set last_used_at = now()
   where g.access_hash = p_access_hash and g.revoked_at is null and g.access_expires > now()
  returning g.id, g.user_id, g.sb_access, g.sb_refresh, g.sb_expires
$$;

create or replace function public.mcp_save_session(p_grant uuid, p_access_hash text, p_sb_access text, p_sb_refresh text, p_sb_expires timestamptz) returns void
language sql security definer set search_path = '' as $$
  update public.mcp_grants set sb_access = p_sb_access, sb_refresh = p_sb_refresh, sb_expires = p_sb_expires
   where id = p_grant and access_hash = p_access_hash and revoked_at is null
$$;

-- Ajustes: o que está conectado e cortar acesso
create or replace function public.mcp_my_grants() returns table (id uuid, client_name text, created_at timestamptz, last_used_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select g.id, c.name, g.created_at, g.last_used_at from public.mcp_grants g join public.mcp_clients c on c.id = g.client_id
   where g.user_id = (select auth.uid()) and g.revoked_at is null order by g.created_at desc
$$;

create or replace function public.mcp_revoke(p_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.mcp_grants set revoked_at = now(), access_hash = null, refresh_hash = null, sb_access = '', sb_refresh = ''
   where id = p_id and user_id = (select auth.uid())
$$;

revoke execute on function public.mcp_valid_redirect(text), public.mcp_register_client(text, text[]), public.mcp_client(text),
  public.mcp_create_code(text, text, text, text, text, text, timestamptz), public.mcp_exchange_code(text, text, text, text, text, text),
  public.mcp_refresh_grant(text, text, text, text), public.mcp_session(text), public.mcp_save_session(uuid, text, text, text, timestamptz),
  public.mcp_my_grants(), public.mcp_revoke(uuid) from public;
grant execute on function public.mcp_register_client(text, text[]), public.mcp_client(text), public.mcp_exchange_code(text, text, text, text, text, text),
  public.mcp_refresh_grant(text, text, text, text), public.mcp_session(text), public.mcp_save_session(uuid, text, text, text, timestamptz)
  to anon, authenticated, service_role;
grant execute on function public.mcp_create_code(text, text, text, text, text, text, timestamptz), public.mcp_my_grants(), public.mcp_revoke(uuid)
  to authenticated, service_role;
