-- Nós e metas: casal vê, estranho não; soma atômica conclui e dá pontos; voltar abaixo do alvo desfaz.
\set ON_ERROR_STOP 1
\set QUIET on
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u)::text, false);
$$;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a7', 'n1@exemplo.com'),
  ('00000000-0000-0000-0000-0000000000a8', 'n2@exemplo.com'),
  ('00000000-0000-0000-0000-0000000000a9', 'n3@exemplo.com');
insert into public.workspaces (id, kind, name, created_by) values
  ('00000000-0000-0000-0000-00000000a0a0', 'shared', 'Nós', '00000000-0000-0000-0000-0000000000a7');
insert into public.workspace_members (workspace_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000a0a0', '00000000-0000-0000-0000-0000000000a7', 'owner'),
  ('00000000-0000-0000-0000-00000000a0a0', '00000000-0000-0000-0000-0000000000a8', 'member');

set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000000a7');
do $$ declare ws uuid := '00000000-0000-0000-0000-00000000a0a0'; g public.goals; begin
  insert into public.special_dates (workspace_id, title, on_date) values (ws, 'Namoro', '2021-02-14');
  insert into public.places (workspace_id, name, kind) values (ws, 'Japão', 'viagem');
  insert into public.memories (workspace_id, title) values (ws, 'Primeira viagem');
  insert into public.goals (id, workspace_id, title, target, unit) values ('00000000-0000-0000-0000-00000000a111', ws, 'Reserva', 1000, 'R$');
  begin insert into public.places (workspace_id, name, rating) values (ws, 'x', 9); raise exception 'FALHOU: nota 9';
  exception when check_violation then null; end;
  g := public.goal_add('00000000-0000-0000-0000-00000000a111', 400);
  assert g.current = 400 and g.done_at is null, 'soma parcial';
  begin perform public.goal_add('00000000-0000-0000-0000-00000000a111', 0); raise exception 'FALHOU: delta zero';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
end $$;

select from pg_temp.as_user('00000000-0000-0000-0000-0000000000a8');
do $$ declare g public.goals; begin
  assert (select count(*) from public.special_dates) = 1 and (select count(*) from public.places) = 1 and (select count(*) from public.memories) = 1, 'parceira vê tudo do Nós';
  g := public.goal_add('00000000-0000-0000-0000-00000000a111', 700);
  assert g.current = 1100 and g.done_at is not null, 'bateu a meta';
end $$;
reset role;
do $$ begin
  assert (select count(*) from public.xp_events where rule_key = 'goal' and user_id = '00000000-0000-0000-0000-0000000000a8' and revoked_at is null) = 1, 'quem concluiu ganhou pontos';
end $$;

set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000000a8');
do $$ declare g public.goals; begin
  g := public.goal_add('00000000-0000-0000-0000-00000000a111', -200);
  assert g.done_at is null, 'voltou abaixo do alvo: reabre';
  assert g.current = 900, 'valor descontado';
end $$;
reset role;
do $$ begin
  assert (select count(*) from public.xp_events where rule_key = 'goal' and revoked_at is null) = 0, 'pontos desfeitos';
end $$;

set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000000a9');
do $$ begin
  assert (select count(*) from public.special_dates) = 0, 'estranho não vê datas';
  assert (select count(*) from public.places) = 0, 'estranho não vê lugares';
  assert (select count(*) from public.memories) = 0, 'estranho não vê memórias';
  assert (select count(*) from public.goals) = 0, 'estranho não vê metas';
  begin perform public.goal_add('00000000-0000-0000-0000-00000000a111', 1); raise exception 'FALHOU: somou na meta alheia';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
end $$;
reset role;
do $$ begin
  assert (select current from public.goals) = 900, 'meta alheia intacta';
end $$;
\echo 'Nós e metas: todos os testes passaram'
