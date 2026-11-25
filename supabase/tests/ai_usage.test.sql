-- Uso do assistente: cota diária respeitada, cada um só vê o seu, ninguém escreve direto.
\set ON_ERROR_STOP 1
\set QUIET on
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u)::text, false);
$$;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000002a1', 'ai1@x.com'), ('00000000-0000-0000-0000-0000000002b1', 'ai2@x.com');

set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000002a1');
do $$ begin
  assert public.ai_reserve(2), '1ª chamada';
  assert public.ai_reserve(2), '2ª chamada';
  assert not public.ai_reserve(2), 'cota de 2 por dia estourou';
  perform public.ai_track(1200, 300);
  assert (select requests from public.ai_usage) = 2, 'conta só as reservadas';
  assert (select input_tokens from public.ai_usage) = 1200 and (select output_tokens from public.ai_usage) = 300, 'tokens somados';
  begin update public.ai_usage set requests = 0; raise exception 'FALHOU: zerou a própria cota';
  exception when insufficient_privilege then null; end;
  begin insert into public.ai_usage (user_id, day) values ('00000000-0000-0000-0000-0000000002a1', current_date + 1); raise exception 'FALHOU: inseriu direto';
  exception when insufficient_privilege then null; end;
end $$;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000002b1');
do $$ begin
  assert (select count(*) from public.ai_usage) = 0, 'não vê o uso alheio';
  assert public.ai_reserve(2), 'cota é por pessoa';
end $$;
reset role;
\echo 'Uso da IA: todos os testes passaram'
