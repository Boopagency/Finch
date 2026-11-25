-- Financeiro: regras obrigatórias da especificação (DATABASE.md §4) + privacidade.
\set ON_ERROR_STOP 1
\set QUIET on
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u)::text, false);
$$;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a9', 'a@x.com'), ('00000000-0000-0000-0000-0000000000b9', 'b@x.com');
insert into public.workspaces (id, kind, name, created_by) values ('00000000-0000-0000-0000-0000000000f9', 'shared', 'Nós', '00000000-0000-0000-0000-0000000000a9');
insert into public.workspace_members (workspace_id, user_id, role, reference_income_cents) values
  ('00000000-0000-0000-0000-0000000000f9', '00000000-0000-0000-0000-0000000000a9', 'owner', 600000),
  ('00000000-0000-0000-0000-0000000000f9', '00000000-0000-0000-0000-0000000000b9', 'member', 400000);
create temp table ids as select created_by as owner, id from public.workspaces where kind = 'personal';
grant select on ids to authenticated;
create temp table r (k text primary key, v bigint);
grant all on r to authenticated;

set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-0000000000a9');
do $$ declare pa uuid; chk uuid; card uuid; vr uuid; cat uuid; e uuid; begin
  select id into pa from ids where owner = '00000000-0000-0000-0000-0000000000a9';
  perform public.fin_ensure_categories(pa);
  select id into cat from public.fin_categories where workspace_id = pa and name = 'Mercado';
  insert into public.fin_accounts (id, workspace_id, name, kind, opening_balance_cents) values ('00000000-0000-0000-0000-0000000c0001', pa, 'Conta', 'checking', 100000) returning id into chk;
  insert into public.fin_accounts (id, workspace_id, name, kind, card_limit_cents, closing_day, due_day) values ('00000000-0000-0000-0000-0000000c0002', pa, 'Cartão', 'credit_card', 500000, 5, 12) returning id into card;
  insert into public.fin_accounts (id, workspace_id, name, kind, opening_balance_cents) values ('00000000-0000-0000-0000-0000000c0003', pa, 'VR', 'meal', 80000) returning id into vr;
  begin
    insert into public.fin_entries (id, workspace_id, kind, occurred_on, month) values (gen_random_uuid(), pa, 'expense', current_date, date_trunc('month', current_date));
    raise exception 'FALHOU: inseriu lançamento direto';
  exception when insufficient_privilege then null; end;

  -- parcelamento 100,00 em 3 no cartão, compra no dia do fechamento → fatura seguinte
  perform public.fin_record('00000000-0000-0000-0000-00000000e001', 'expense', pa, card, 10000, cat, 'Compra', '2026-11-05', 'posted', null, 3);
  assert (select array_agg(-p.amount_cents order by e.installment_no) from public.fin_entries e join public.fin_postings p on p.entry_id = e.id
          where e.group_id = '00000000-0000-0000-0000-00000000e001') = array[3334, 3333, 3333]::bigint[], 'parcelas 33,34 + 33,33 + 33,33';
  assert (select array_agg(month order by installment_no) from public.fin_entries where group_id = '00000000-0000-0000-0000-00000000e001')
         = array['2026-12-01', '2027-01-01', '2027-02-01']::date[], 'fechamento dia 5: compra no dia 5 vai para dezembro';
  -- idempotência: repetir não cria nada
  perform public.fin_record('00000000-0000-0000-0000-00000000e001', 'expense', pa, card, 10000, cat, 'Compra', '2026-11-05', 'posted', null, 3);
  assert (select count(*) from public.fin_entries where group_id = '00000000-0000-0000-0000-00000000e001') = 3, 'idempotente';

  -- despesas do mês antes de transferência e pagamento de fatura
  insert into r select 'desp', sum(-p.amount_cents) from public.fin_entries e join public.fin_postings p on p.entry_id = e.id where e.kind = 'expense' and e.status = 'posted';
  perform public.fin_record(gen_random_uuid(), 'card_payment', pa, chk, 3334, null, 'Fatura', '2026-12-12', 'posted', card);
  perform public.fin_record(gen_random_uuid(), 'transfer', pa, chk, 5000, null, 'Para o VR?', '2026-12-12', 'posted', vr);
  assert (select sum(-p.amount_cents) from public.fin_entries e join public.fin_postings p on p.entry_id = e.id where e.kind = 'expense' and e.status = 'posted') = (select v from r where k = 'desp'),
         'pagar fatura e transferir não mudam o total de despesas';
  assert (select coalesce(sum(p.amount_cents), 0) from public.fin_entries e join public.fin_postings p on p.entry_id = e.id where e.kind = 'income') = 0, 'transferência não vira receita';
  assert (select sum(p.amount_cents) from public.fin_postings p join public.fin_entries e on e.id = p.entry_id where e.kind in ('transfer', 'card_payment')) = 0, 'transferências somam zero';
  assert (select balance_cents from public.fin_account_balances where account_id = card) = -10000 + 3334, 'cartão deve o restante';
  assert (select balance_cents from public.fin_account_balances where account_id = chk) = 100000 - 3334 - 5000, 'saldo da conta';

  -- previsto não mexe no saldo até confirmar
  e := public.fin_record(gen_random_uuid(), 'income', pa, chk, 500000, null, 'Salário', '2026-12-05', 'planned');
  assert (select balance_cents from public.fin_account_balances where account_id = chk) = 100000 - 3334 - 5000, 'previsto fora do saldo';
  perform public.fin_confirm(e);
  assert (select balance_cents from public.fin_account_balances where account_id = chk) = 100000 - 3334 - 5000 + 500000, 'confirmado entra';

  -- cancelar preserva o histórico e cancela todas as parcelas
  perform public.fin_void('00000000-0000-0000-0000-00000000e001');
  assert (select count(*) from public.fin_entries where group_id = '00000000-0000-0000-0000-00000000e001' and status = 'void') = 3, 'parcelas canceladas juntas';
  assert (select count(*) from public.fin_postings p join public.fin_entries e on e.id = p.entry_id where e.group_id = '00000000-0000-0000-0000-00000000e001') = 3, 'partidas preservadas';

  begin perform public.fin_record(gen_random_uuid(), 'expense', pa, chk, 0); raise exception 'FALHOU: valor zero';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  begin perform public.fin_record(gen_random_uuid(), 'expense', pa, chk, 1000, null, 'x', current_date, 'posted', null, 3); raise exception 'FALHOU: parcelou no débito';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  -- despesa do casal paga da conta pessoal, proporcional à renda (60/40)
  perform public.fin_ensure_categories('00000000-0000-0000-0000-0000000000f9');
  perform public.fin_record('00000000-0000-0000-0000-00000000e002', 'expense', '00000000-0000-0000-0000-0000000000f9', chk, 10001, null, 'Mercado do casal', '2026-12-10', 'posted', null, 1, 'income');
  assert (select shares from public.fin_splits where entry_id = '00000000-0000-0000-0000-00000000e002')
         = '{"00000000-0000-0000-0000-0000000000a9": 6001, "00000000-0000-0000-0000-0000000000b9": 4000}'::jsonb, 'proporcional; centavo com quem pagou';
end $$;

select from pg_temp.as_user('00000000-0000-0000-0000-0000000000b9');
do $$ declare pb uuid; begin
  assert (select count(*) from public.fin_accounts) = 0, 'B não vê contas pessoais de A';
  assert (select count(*) from public.fin_entries where workspace_id <> '00000000-0000-0000-0000-0000000000f9') = 0, 'B não vê lançamentos pessoais de A';
  assert (select count(*) from public.fin_entries where id = '00000000-0000-0000-0000-00000000e002') = 1, 'B vê a despesa do casal';
  assert (select count(*) from public.fin_account_balances) = 0, 'B não vê saldos de A';
  begin
    perform public.fin_record(gen_random_uuid(), 'expense', '00000000-0000-0000-0000-0000000000f9', '00000000-0000-0000-0000-0000000c0001', 100);
    raise exception 'FALHOU: B usou a conta de A';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  perform public.fin_settle('00000000-0000-0000-0000-0000000000f9', '00000000-0000-0000-0000-0000000000a9', 4000, '2026-12-11');
  assert (select count(*) from public.fin_settlements) = 1, 'acerto registrado';
end $$;
\echo 'Financeiro: todos os testes passaram'
