-- Fotos: cada um só acessa arquivos dos espaços de que participa; foto de corpo só no espaço pessoal.
\set ON_ERROR_STOP 1
\set QUIET on
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u)::text, false);
$$;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000003a1', 'f1@x.com'), ('00000000-0000-0000-0000-0000000003b1', 'f2@x.com'), ('00000000-0000-0000-0000-0000000003c1', 'f3@x.com');
insert into public.workspaces (id, kind, name, created_by) values ('00000000-0000-0000-0000-0000000003f1', 'shared', 'Nós', '00000000-0000-0000-0000-0000000003a1');
insert into public.workspace_members (workspace_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000003f1', '00000000-0000-0000-0000-0000000003a1', 'owner'),
  ('00000000-0000-0000-0000-0000000003f1', '00000000-0000-0000-0000-0000000003b1', 'member');
create temp table ids as select created_by as owner, id from public.workspaces where kind = 'personal';
grant select on ids to authenticated;

set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000003a1');
do $$ declare pa uuid; nos uuid := '00000000-0000-0000-0000-0000000003f1'; m uuid; begin
  select id into pa from ids where owner = '00000000-0000-0000-0000-0000000003a1';
  insert into storage.objects (bucket_id, name) values ('photos', pa || '/00000000-0000-0000-0000-00000000aa01.jpg');
  insert into storage.objects (bucket_id, name) values ('photos', nos || '/00000000-0000-0000-0000-00000000aa02.jpg');
  insert into public.body_photos (path) values (pa || '/00000000-0000-0000-0000-00000000aa01.jpg');
  begin insert into public.body_photos (path) values (nos || '/00000000-0000-0000-0000-00000000aa02.jpg'); raise exception 'FALHOU: foto de corpo no espaço do casal';
  exception when insufficient_privilege then null; end;
  begin insert into storage.objects (bucket_id, name) values ('photos', '../' || pa || '/x.jpg'); raise exception 'FALHOU: caminho fora do padrão';
  exception when insufficient_privilege then null; end;
  insert into public.memories (id, workspace_id, title, photo_path) values ('00000000-0000-0000-0000-00000000ab01', nos, 'Praia', nos || '/00000000-0000-0000-0000-00000000aa02.jpg');
  begin update public.memories set photo_path = pa || '/00000000-0000-0000-0000-00000000aa01.jpg' where id = '00000000-0000-0000-0000-00000000ab01';
    raise exception 'FALHOU: memória do casal apontando para foto pessoal';
  exception when check_violation then null; end;
end $$;

select from pg_temp.as_user('00000000-0000-0000-0000-0000000003b1');
do $$ declare pa uuid; begin
  select id into pa from ids where owner = '00000000-0000-0000-0000-0000000003a1';
  assert (select count(*) from storage.objects) = 1, 'parceira vê só a foto do casal';
  assert (select count(*) from public.body_photos) = 0, 'não vê fotos de corpo alheias';
  begin insert into storage.objects (bucket_id, name) values ('photos', pa || '/00000000-0000-0000-0000-00000000aa09.jpg'); raise exception 'FALHOU: enviou para o espaço pessoal alheio';
  exception when insufficient_privilege then null; end;
  delete from storage.objects where name like pa || '%'; -- não apaga nada alheio
end $$;

select from pg_temp.as_user('00000000-0000-0000-0000-0000000003c1');
do $$ begin
  assert (select count(*) from storage.objects) = 0, 'estranho não vê nada';
end $$;
reset role;
do $$ begin assert (select count(*) from storage.objects) = 2, 'nada foi apagado por quem não podia'; end $$;
\echo 'Fotos: todos os testes passaram'
