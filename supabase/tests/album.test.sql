-- Álbum: pontos idempotentes, desfazer/refazer sem exploração, teto diário, pacotes, sorteio determinístico, trocas.
\set ON_ERROR_STOP 1
\set QUIET on
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u)::text, false);
$$;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a7', 'a@x.com'), ('00000000-0000-0000-0000-0000000000b7', 'b@x.com'), ('00000000-0000-0000-0000-0000000000c7', 'c@x.com');
insert into public.workspaces (id, kind, name, created_by) values ('00000000-0000-0000-0000-0000000000f7', 'shared', 'Nós', '00000000-0000-0000-0000-0000000000a7');
insert into public.workspace_members (workspace_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-0000000000a7', 'owner'), ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-0000000000b7', 'member');

set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000000a7');
do $$ declare t uuid; begin
  assert (select count(*) from public.stickers) = 60, '60 figurinhas';
  insert into public.tasks (id, workspace_id, title) values ('00000000-0000-0000-0000-00000000a701', '00000000-0000-0000-0000-0000000000f7', 'Tarefa');
  update public.tasks set status = 'done', completed_by = '00000000-0000-0000-0000-0000000000a7' where id = '00000000-0000-0000-0000-00000000a701';
  assert (select sum(points) from public.xp_events where revoked_at is null) = 10, '10 pontos';
  -- desfaz e refaz várias vezes: continua 10
  for i in 1..3 loop
    update public.tasks set status = 'open' where id = '00000000-0000-0000-0000-00000000a701';
    update public.tasks set status = 'done', completed_by = '00000000-0000-0000-0000-0000000000a7' where id = '00000000-0000-0000-0000-00000000a701';
  end loop;
  assert (select sum(points) from public.xp_events where revoked_at is null) = 10, 'sem exploração por desfazer/refazer';
  assert (select count(*) from public.xp_events) = 1, 'um evento só';
  update public.tasks set status = 'open' where id = '00000000-0000-0000-0000-00000000a701';
  assert (select coalesce(sum(points), 0) from public.xp_events where revoked_at is null) = 0, 'desfazer revoga';
  update public.tasks set status = 'done', completed_by = '00000000-0000-0000-0000-0000000000a7' where id = '00000000-0000-0000-0000-00000000a701';

  -- teto diário de tarefas comuns (8): a 12ª não pontua
  for i in 1..11 loop
    insert into public.tasks (workspace_id, title) values ('00000000-0000-0000-0000-0000000000f7', 'T' || i) returning id into t;
    update public.tasks set status = 'done', completed_by = '00000000-0000-0000-0000-0000000000a7' where id = t;
  end loop;
  assert (select count(*) from public.xp_events where rule_key = 'task' and revoked_at is null) = 8, 'teto diário';
  -- 80 pontos de tarefa + 1 rotina da casa (25) = 105 → 1 pacote
  insert into public.tasks (workspace_id, title, category) values ('00000000-0000-0000-0000-0000000000f7', 'Casa', 'casa') returning id into t;
  update public.tasks set status = 'done', completed_by = '00000000-0000-0000-0000-0000000000a7' where id = t;
  assert (select count(*) from public.sticker_packs where reason = 'pontos') = 1, 'um pacote a cada 100 pontos';
  assert exists (select 1 from public.sticker_items i join public.stickers s on s.code = i.sticker_code where s.achievement = 'primeiro-passo'), 'especial por conquista';
  assert not exists (select 1 from public.sticker_items i join public.stickers s on s.code = i.sticker_code where s.achievement = 'dez-tarefas'), 'teto diário também limita conquista (9 < 10)';
  assert exists (select 1 from public.sticker_items i join public.stickers s on s.code = i.sticker_code where s.achievement = 'casal-conectado'), 'casal conectado';
end $$;

do $$ declare p uuid; first text; again text; n int; begin
  perform public.album_refresh();
  assert (select count(*) from public.sticker_packs where reason = 'boas-vindas') = 1, 'pacote de boas-vindas';
  perform public.album_refresh();
  assert (select count(*) from public.sticker_packs where reason = 'boas-vindas') = 1, 'boas-vindas só uma vez';
  select id into p from public.sticker_packs where reason = 'pontos';
  select string_agg(sticker_code, ',' order by slot) into first from public.album_open_pack(p);
  select string_agg(sticker_code, ',' order by slot) into again from public.album_open_pack(p);
  assert first = again, 'abrir de novo devolve as mesmas (determinístico, sem duplicar)';
  select count(*) into n from public.sticker_items where pack_id = p;
  assert n = 3, 'três figurinhas';
  assert not exists (select 1 from public.sticker_items i join public.stickers s on s.code = i.sticker_code where i.pack_id = p and s.rarity = 'especial'), 'especial nunca sai em pacote';
  perform public.album_paste((select id from public.sticker_items where pack_id = p and slot = 1));
  begin
    insert into public.sticker_items (owner_id, sticker_code) values ('00000000-0000-0000-0000-0000000000a7', 'ROT-01');
    raise exception 'FALHOU: cliente criou figurinha';
  exception when insufficient_privilege then null; end;
end $$;

-- B não abre pacote de A; troca e presente entre o casal
select from pg_temp.as_user('00000000-0000-0000-0000-0000000000b7');
do $$ declare pa uuid; itema uuid; itemb uuid; tr uuid; begin
  select id into pa from public.sticker_packs limit 1;
  assert pa is null, 'B não vê pacotes de A';
  perform public.album_refresh();
  select id into pa from public.sticker_packs where reason = 'boas-vindas';
  perform public.album_open_pack(pa);
  select id into itemb from public.sticker_items where owner_id = '00000000-0000-0000-0000-0000000000b7' and pasted_at is null limit 1;
  select id into itema from public.sticker_items where owner_id = '00000000-0000-0000-0000-0000000000a7' and pasted_at is null and pack_id is not null limit 1;
  assert itema is not null, 'B vê repetidas de A (para trocar)';
  tr := public.album_propose_trade(itemb, itema);
  perform set_config('finch.trade', tr::text, false);
  perform set_config('finch.itemb', itemb::text, false);
end $$;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000000c7');
do $$ begin
  begin perform public.album_answer_trade(current_setting('finch.trade')::uuid, true); raise exception 'FALHOU: C aceitou troca alheia';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  assert (select count(*) from public.sticker_items) = 0, 'C não vê figurinhas do casal';
end $$;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000000a7');
do $$ begin
  perform public.album_answer_trade(current_setting('finch.trade')::uuid, true);
  assert (select owner_id from public.sticker_items where id = current_setting('finch.itemb')::uuid) = '00000000-0000-0000-0000-0000000000a7', 'troca feita';
  perform public.album_gift(current_setting('finch.itemb')::uuid, '00000000-0000-0000-0000-0000000000b7');
  assert exists (select 1 from public.sticker_items i join public.stickers s on s.code = i.sticker_code
                 where i.owner_id = '00000000-0000-0000-0000-0000000000a7' and s.achievement = 'presente'), 'conquista do presente';
  begin perform public.album_gift((select id from public.sticker_items where pasted_at is not null limit 1), '00000000-0000-0000-0000-0000000000b7');
    raise exception 'FALHOU: deu figurinha colada';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  begin perform public.album_gift((select id from public.sticker_items where owner_id = '00000000-0000-0000-0000-0000000000a7' and pasted_at is null limit 1), '00000000-0000-0000-0000-0000000000c7');
    raise exception 'FALHOU: deu para quem não é do casal';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
end $$;

-- água: meta do dia dá pontos uma vez só
do $$ begin
  update public.user_settings set water_goal_ml = 500;
  insert into public.water_logs (amount_ml) values (300), (300), (300);
  assert (select count(*) from public.xp_events where rule_key = 'water_goal') = 1, 'meta de água uma vez por dia';
end $$;
\echo 'Álbum: todos os testes passaram'
