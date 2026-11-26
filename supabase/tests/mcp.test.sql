-- MCP/OAuth: tabelas fechadas; código de uso único com PKCE; rotação de refresh; revogar corta; cada um vê só o seu.
\set ON_ERROR_STOP 1
\set QUIET on
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u)::text, false);
$$;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000006a1', 'm1@x.com'), ('00000000-0000-0000-0000-0000000006b1', 'm2@x.com');
create temp table t (k text primary key, v text);
grant all on t to anon, authenticated;

set role anon;
select set_config('request.jwt.claims', '{}', false);
do $$ declare c text; begin
  begin perform * from public.mcp_grants; raise exception 'FALHOU: anon leu grants';
  exception when insufficient_privilege then null; end;
  begin perform public.mcp_register_client('x', array['javascript:alert(1)']); raise exception 'FALHOU: redirect inválido aceito';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  begin perform public.mcp_register_client('x', array['http://evil.com/cb']); raise exception 'FALHOU: http fora de localhost aceito';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  c := public.mcp_register_client('Claude', array['https://claude.ai/api/mcp/auth_callback', 'http://localhost:33418/callback']);
  insert into t values ('client', c);
  begin perform public.mcp_create_code(c, 'https://claude.ai/api/mcp/auth_callback', repeat('a', 43), repeat('0', 64), 'x', 'y', now()); raise exception 'FALHOU: anon criou código';
  exception when insufficient_privilege or raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
end $$;

set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000006a1');
do $$ declare c text := (select v from t where k = 'client'); begin
  begin perform public.mcp_create_code(c, 'https://evil.com/cb', repeat('a', 43), repeat('1', 64), 'x', 'y', now()); raise exception 'FALHOU: redirect fora do cadastro';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  perform public.mcp_create_code(c, 'https://claude.ai/api/mcp/auth_callback', repeat('a', 43), repeat('1', 64), 'sb-access', 'sb-refresh', now() + interval '1 hour');
end $$;

set role anon;
select set_config('request.jwt.claims', '{}', false);
do $$ declare c text := (select v from t where k = 'client'); g uuid; s record; begin
  -- PKCE errado: código é consumido e nada sai
  g := public.mcp_exchange_code(repeat('1', 64), c, 'https://claude.ai/api/mcp/auth_callback', repeat('b', 43), repeat('2', 64), repeat('3', 64));
  assert g is null, 'PKCE errado não troca';
  assert public.mcp_exchange_code(repeat('1', 64), c, 'https://claude.ai/api/mcp/auth_callback', repeat('a', 43), repeat('2', 64), repeat('3', 64)) is null, 'código é de uso único';
end $$;

set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000006a1');
do $$ declare c text := (select v from t where k = 'client'); begin
  perform public.mcp_create_code(c, 'https://claude.ai/api/mcp/auth_callback', repeat('a', 43), repeat('4', 64), 'sb-access', 'sb-refresh', now() + interval '1 hour');
end $$;
set role anon;
select set_config('request.jwt.claims', '{}', false);
do $$ declare c text := (select v from t where k = 'client'); g uuid; s record; begin
  g := public.mcp_exchange_code(repeat('4', 64), c, 'https://claude.ai/api/mcp/auth_callback', repeat('a', 43), repeat('5', 64), repeat('6', 64));
  assert g is not null, 'troca com PKCE certo';
  select * into s from public.mcp_session(repeat('5', 64));
  assert s.user_id = '00000000-0000-0000-0000-0000000006a1' and s.sb_access = 'sb-access', 'sessão da pessoa certa';
  assert public.mcp_refresh_grant(repeat('6', 64), c, repeat('7', 64), repeat('8', 64)), 'refresh gira';
  assert not public.mcp_refresh_grant(repeat('6', 64), c, repeat('9', 64), repeat('a', 64)), 'refresh antigo não vale mais';
  assert (select count(*) from public.mcp_session(repeat('5', 64))) = 0, 'access antigo não vale mais';
  assert (select count(*) from public.mcp_session(repeat('7', 64))) = 1, 'access novo vale';
  insert into t values ('grant', g::text);
end $$;

set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000006b1');
do $$ begin
  assert (select count(*) from public.mcp_my_grants()) = 0, 'B não vê conexões de A';
  perform public.mcp_revoke((select v::uuid from t where k = 'grant')); -- não tem efeito
end $$;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000006a1');
do $$ begin
  assert (select count(*) from public.mcp_my_grants()) = 1, 'A vê a conexão';
  perform public.mcp_revoke((select v::uuid from t where k = 'grant'));
  assert (select count(*) from public.mcp_my_grants()) = 0, 'revogada some';
  assert (select count(*) from public.mcp_session(repeat('7', 64))) = 0, 'revogar corta o acesso na hora';
end $$;
reset role;
\echo 'MCP/OAuth: todos os testes passaram'
