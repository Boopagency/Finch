-- Recados e bichinho: os dois veem e escrevem, estranho não vê nada, só o autor edita/apaga,
-- "lido" é marcado pelo outro, e o bichinho soma amor uma vez por dia por pessoa (nunca perde).
\set ON_ERROR_STOP 1
\set QUIET on
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u)::text, false);
$$;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'c1@exemplo.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'c2@exemplo.com'),
  ('00000000-0000-0000-0000-0000000000c3', 'c3@exemplo.com');
insert into public.workspaces (id, kind, name, created_by) values
  ('00000000-0000-0000-0000-00000000c0c0', 'shared', 'Nós', '00000000-0000-0000-0000-0000000000c1');
insert into public.workspace_members (workspace_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000c0c0', '00000000-0000-0000-0000-0000000000c1', 'owner'),
  ('00000000-0000-0000-0000-00000000c0c0', '00000000-0000-0000-0000-0000000000c2', 'member');

-- ---------------------------------------------------------------- recados
set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
do $$ declare ws uuid := '00000000-0000-0000-0000-00000000c0c0'; begin
  insert into public.couple_messages (id, workspace_id, body) values ('00000000-0000-0000-0000-00000000c111', ws, 'passa no mercado?');
  begin insert into public.couple_messages (workspace_id) values (ws); raise exception 'FALHOU: recado vazio';
  exception when check_violation then null; end;
  begin insert into public.couple_messages (workspace_id, author_id, body) values (ws, '00000000-0000-0000-0000-0000000000c2', 'falso'); raise exception 'FALHOU: escrever no nome do outro';
  exception when insufficient_privilege then null; end;
end $$;

select from pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
do $$ declare ws uuid := '00000000-0000-0000-0000-00000000c0c0'; begin
  assert (select count(*) from public.couple_messages) = 1, 'a outra pessoa vê o recado';
  assert (select read_at is null from public.couple_messages where id = '00000000-0000-0000-0000-00000000c111'), 'nasce não lido';
  -- não é dela: não edita nem apaga
  update public.couple_messages set body = 'editado por quem não escreveu' where id = '00000000-0000-0000-0000-00000000c111';
  assert (select body from public.couple_messages where id = '00000000-0000-0000-0000-00000000c111') = 'passa no mercado?', 'só o autor edita';
  delete from public.couple_messages where id = '00000000-0000-0000-0000-00000000c111';
  assert (select count(*) from public.couple_messages) = 1, 'só o autor apaga';
  assert public.mark_messages_read(ws) = 1, 'marcou o recado do outro como lido';
  assert public.mark_messages_read(ws) = 0, 'segunda vez não remarca';
  insert into public.couple_messages (workspace_id, body) values (ws, 'já fui!');
end $$;

select from pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
do $$ begin
  assert (select read_at is not null from public.couple_messages where id = '00000000-0000-0000-0000-00000000c111'), 'autor vê que foi lido';
  update public.couple_messages set body = 'passa na farmácia?', edited_at = now() where id = '00000000-0000-0000-0000-00000000c111';
  assert (select body from public.couple_messages where id = '00000000-0000-0000-0000-00000000c111') = 'passa na farmácia?', 'autor edita';
  assert (select count(*) from public.couple_messages where read_at is null and author_id <> '00000000-0000-0000-0000-0000000000c1') = 1, 'o recado dela está por ler';
end $$;

select from pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
do $$ begin
  assert (select count(*) from public.couple_messages) = 0, 'estranho não vê recado nenhum';
  begin perform public.mark_messages_read('00000000-0000-0000-0000-00000000c0c0'); raise exception 'FALHOU: estranho marcou lido';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
end $$;

-- aviso de recado: vai para a outra pessoa, sem o conteúdo, e não duplica
select from pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
do $$ declare j public.notification_jobs; begin
  assert public.notify_partner_message('00000000-0000-0000-0000-00000000c111') = 1, 'avisou a outra pessoa';
  assert public.notify_partner_message('00000000-0000-0000-0000-00000000c111') = 0, 'o mesmo recado não avisa duas vezes';
end $$;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
do $$ declare j public.notification_jobs; begin
  select * into j from public.notification_jobs where category = 'recado';
  assert j.user_id = '00000000-0000-0000-0000-0000000000c2', 'o aviso é da outra pessoa';
  assert j.body not like '%farmácia%' and j.body not like '%mercado%', 'o texto do recado não vai no push';
  assert j.url = '/vida/nos?v=recados', 'o aviso abre os recados';
  begin perform public.notify_partner_message('00000000-0000-0000-0000-00000000c111'); raise exception 'FALHOU: avisou por recado que não é dela';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
end $$;

-- ---------------------------------------------------------------- bichinho
select from pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
do $$ declare ws uuid := '00000000-0000-0000-0000-00000000c0c0'; r record; begin
  insert into public.pets (id, workspace_id, species, name) values ('00000000-0000-0000-0000-00000000cbbb', ws, 'monstrinho', 'Gruso');
  begin insert into public.pets (workspace_id, species, name) values (ws, 'gato', 'Outro'); raise exception 'FALHOU: dois bichinhos no mesmo espaço';
  exception when unique_violation then null; end;
  begin insert into public.pets (workspace_id, species, name) values (ws, 'jacare', 'x'); raise exception 'FALHOU: espécie inválida';
  exception when check_violation then null; end;

  select * into r from public.pet_care('00000000-0000-0000-0000-00000000cbbb', 'comida');
  assert r.love = 10 and r.gained = 10 and not r.already, 'primeira comida do dia soma';
  select * into r from public.pet_care('00000000-0000-0000-0000-00000000cbbb', 'comida');
  assert r.love = 10 and r.gained = 0 and r.already, 'segunda comida do mesmo dia não soma de novo';
  select * into r from public.pet_care('00000000-0000-0000-0000-00000000cbbb', 'mimo', 'te amo');
  assert r.love = 30 and r.gained = 20, 'outro tipo de cuidado soma no mesmo dia';
  begin perform public.pet_care('00000000-0000-0000-0000-00000000cbbb', 'veneno'); raise exception 'FALHOU: cuidado inventado';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  -- ninguém escreve direto na tabela de cuidados nem mexe no amor por fora da função
  begin insert into public.pet_feeds (pet_id, workspace_id, kind, love, local_date)
    values ('00000000-0000-0000-0000-00000000cbbb', ws, 'comida', 999, current_date); raise exception 'FALHOU: insert direto em pet_feeds';
  exception when insufficient_privilege then null; end;
end $$;

select from pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
do $$ declare r record; begin
  assert (select name from public.pets) = 'Gruso', 'a outra pessoa vê o bichinho';
  assert (select count(*) from public.pet_feeds) = 2, 'e vê os cuidados dela';
  select * into r from public.pet_care('00000000-0000-0000-0000-00000000cbbb', 'comida');
  assert r.love = 40 and r.gained = 10, 'cada pessoa tem o próprio teto diário';
end $$;

select from pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
do $$ begin
  assert (select count(*) from public.pets) = 0 and (select count(*) from public.pet_feeds) = 0, 'estranho não vê o bichinho';
  begin perform public.pet_care('00000000-0000-0000-0000-00000000cbbb', 'comida'); raise exception 'FALHOU: estranho cuidou';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
end $$;
reset role;
do $$ begin
  assert (select love from public.pets) = 40, 'amor total = 10 + 20 + 10, e nunca desceu';
end $$;

select 'Recados e bichinho: todos os testes passaram' as resultado;
