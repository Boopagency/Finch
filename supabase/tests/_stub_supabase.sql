-- Stub mínimo do ambiente Supabase para rodar migrations e testes de RLS num Postgres puro.
-- NÃO é aplicado em produção.
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
grant usage on schema auth, public to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
-- Como os projetos Supabase novos: tabelas NÃO são expostas por padrão aos papéis da API.
-- Cada migration precisa conceder explicitamente o que cada papel pode fazer.
alter default privileges in schema public revoke all on tables from public;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
