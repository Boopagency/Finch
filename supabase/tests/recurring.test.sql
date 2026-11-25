-- Recorrências: um lançamento por regra e mês, previsto na conta, cartão só quando o dia chega,
-- cancelado não volta, privado do espaço, regra com conta alheia não quebra a geração.
\set ON_ERROR_STOP 1
\set QUIET on
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u)::text, false);
$$;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000001a1', 'r1@x.com'), ('00000000-0000-0000-0000-0000000001b1', 'r2@x.com');
insert into public.workspaces (id, kind, name, created_by) values ('00000000-0000-0000-0000-0000000001f1', 'shared', 'Nós', '00000000-0000-0000-0000-0000000001a1');
insert into public.workspace_members (workspace_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000001f1', '00000000-0000-0000-0000-0000000001a1', 'owner'),
  ('00000000-0000-0000-0000-0000000001f1', '00000000-0000-0000-0000-0000000001b1', 'member');
create temp table ids as select created_by as owner, id from public.workspaces where kind = 'personal';
grant select on ids to authenticated;

set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000001a1');
do $$ declare pa uuid; chk uuid; card uuid; m date := date_trunc('month', current_date)::date; n int; begin
  select id into pa from ids where owner = '00000000-0000-0000-0000-0000000001a1';
  perform public.fin_ensure_categories(pa);
  insert into public.fin_accounts (id, workspace_id, name, kind) values ('00000000-0000-0000-0000-0000000cc001', pa, 'Conta', 'checking') returning id into chk;
  insert into public.fin_accounts (id, workspace_id, name, kind, card_limit_cents, closing_day, due_day)
    values ('00000000-0000-0000-0000-0000000cc002', pa, 'Cartão', 'credit_card', 100000, 5, 12) returning id into card;
  insert into public.fin_recurring (id, workspace_id, kind, description, amount_cents, account_id, day_of_month) values
    ('00000000-0000-0000-0000-0000000ff001', pa, 'income', 'Salário', 600000, chk, 5),
    ('00000000-0000-0000-0000-0000000ff002', pa, 'expense', 'Aluguel', 200000, chk, 31),
    ('00000000-0000-0000-0000-0000000ff003', pa, 'expense', 'Streaming', 3990, card, 1);
  n := public.fin_materialize(m);
  assert n = 3, format('gerou 3 no mês atual (gerou %s)', n);
  assert public.fin_materialize(m) = 0, 'reabrir não duplica';
  assert (select status from public.fin_entries where description = 'Salário') = 'planned', 'conta comum entra como previsto';
  assert (select status from public.fin_entries where description = 'Streaming') = 'posted', 'cartão entra lançado';
  assert (select extract(day from occurred_on) from public.fin_entries where description = 'Aluguel')
       = extract(day from (m + interval '1 month - 1 day')), 'dia 31 vira o último dia do mês';
  -- mês que vem: conta comum já aparece como previsto; cartão espera o dia
  n := public.fin_materialize((m + interval '1 month')::date);
  assert n = 2, format('mês seguinte: só os previstos (gerou %s)', n);
  assert public.fin_materialize((m + interval '2 month')::date) = 0, 'não gera mais longe que o mês que vem';
  -- cancelado não volta
  perform public.fin_void((select id from public.fin_entries where description = 'Aluguel' and month = m));
  assert public.fin_materialize(m) = 0, 'cancelado não é recriado';
  -- regra pausada não gera
  update public.fin_recurring set active = false where id = '00000000-0000-0000-0000-0000000ff001';
end $$;

-- regra no espaço do casal usando a conta pessoal de A: B gera o que pode e não quebra
select from pg_temp.as_user('00000000-0000-0000-0000-0000000001a1');
do $$ begin
  insert into public.fin_recurring (workspace_id, kind, description, amount_cents, account_id, day_of_month)
    values ('00000000-0000-0000-0000-0000000001f1', 'expense', 'Internet da casa', 12000, '00000000-0000-0000-0000-0000000cc001', 10);
end $$;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000001b1');
do $$ begin
  assert (select count(*) from public.fin_recurring) = 1, 'B vê só a regra do casal';
  assert public.fin_materialize(date_trunc('month', current_date)::date) = 0, 'B não usa a conta pessoal de A (pula sem erro)';
  begin
    insert into public.fin_recurring (workspace_id, kind, description, amount_cents, account_id, day_of_month)
      values ((select id from ids where owner = '00000000-0000-0000-0000-0000000001a1'), 'expense', 'x', 100, '00000000-0000-0000-0000-0000000cc001', 1);
    raise exception 'FALHOU: criou regra no espaço pessoal alheio';
  exception when insufficient_privilege then null; end;
end $$;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000001a1');
do $$ begin
  assert public.fin_materialize(date_trunc('month', current_date)::date) = 1, 'A gera a do casal';
end $$;
reset role;
\echo 'Recorrências: todos os testes passaram'
