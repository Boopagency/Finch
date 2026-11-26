-- Foto de perfil e do casal: só com arquivo de um espaço da pessoa; estranho não troca a foto do casal.
\set ON_ERROR_STOP 1
\set QUIET on
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u)::text, false);
$$;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000005a1', 'p1@x.com'), ('00000000-0000-0000-0000-0000000005b1', 'p2@x.com'), ('00000000-0000-0000-0000-0000000005c1', 'p3@x.com');
insert into public.workspaces (id, kind, name, created_by) values ('00000000-0000-0000-0000-0000000005f1', 'shared', 'Nós', '00000000-0000-0000-0000-0000000005a1');
insert into public.workspace_members (workspace_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000005f1', '00000000-0000-0000-0000-0000000005a1', 'owner'),
  ('00000000-0000-0000-0000-0000000005f1', '00000000-0000-0000-0000-0000000005b1', 'member');

set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000005a1');
do $$ declare nos uuid := '00000000-0000-0000-0000-0000000005f1'; begin
  perform public.set_avatar(nos || '/00000000-0000-0000-0000-00000000ab51.jpg');
  perform public.set_space_cover(nos, nos || '/00000000-0000-0000-0000-00000000ab52.jpg');
  assert (select avatar_path from public.profiles where id = '00000000-0000-0000-0000-0000000005a1') like nos || '/%', 'avatar salvo';
  begin update public.profiles set avatar_path = '00000000-0000-0000-0000-0000000005ee/00000000-0000-0000-0000-00000000ab59.jpg' where id = '00000000-0000-0000-0000-0000000005a1'; raise exception 'FALHOU: gravou avatar direto';
  exception when insufficient_privilege then null; end;
  begin perform public.set_space_cover(nos, '00000000-0000-0000-0000-0000000005ee/00000000-0000-0000-0000-00000000ab53.jpg'); raise exception 'FALHOU: capa de outro espaço';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
end $$;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000005b1');
do $$ begin
  assert (select avatar_path from public.profiles where id = '00000000-0000-0000-0000-0000000005a1') is not null, 'parceira vê o caminho do avatar';
  assert (select cover_path from public.workspaces where id = '00000000-0000-0000-0000-0000000005f1') is not null, 'parceira vê a capa';
end $$;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000005c1');
do $$ begin
  begin perform public.set_space_cover('00000000-0000-0000-0000-0000000005f1', null); raise exception 'FALHOU: estranho trocou a capa';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  begin perform public.set_avatar('00000000-0000-0000-0000-0000000005f1/00000000-0000-0000-0000-00000000ab54.jpg'); raise exception 'FALHOU: avatar em espaço alheio';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
end $$;
reset role;
do $$ begin assert (select cover_path from public.workspaces where id = '00000000-0000-0000-0000-0000000005f1') is not null, 'capa intacta'; end $$;
\echo 'Fotos de perfil e do casal: todos os testes passaram'
