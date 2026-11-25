-- Finch · financeiro (Etapa 3, núcleo). Centavos inteiros; lançamentos só por funções transacionais e idempotentes.
-- Razão simplificada (D-005 revisado): partidas por conta real; transferência e pagamento de fatura somam zero;
-- despesa/receita têm uma partida e a categoria no lançamento. Relatórios contam só despesas/receitas.

create table public.fin_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid default auth.uid() references public.profiles(id) on delete set null,
  name text not null check (char_length(name) between 1 and 60),
  kind text not null check (kind in ('checking', 'savings', 'cash', 'wallet', 'investment', 'meal', 'food', 'credit_card')),
  opening_balance_cents bigint not null default 0,
  card_limit_cents bigint check (card_limit_cents >= 0),
  closing_day smallint check (closing_day between 1 and 31),
  due_day smallint check (due_day between 1 and 31),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  check ((kind = 'credit_card') = (closing_day is not null and due_day is not null and card_limit_cents is not null))
);
create index fin_accounts_ws on public.fin_accounts (workspace_id);

create table public.fin_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  name text not null check (char_length(name) between 1 and 40),
  archived_at timestamptz
);
create unique index fin_categories_name on public.fin_categories (workspace_id, kind, lower(name));

create table public.fin_entries (
  id uuid primary key, -- gerado no aparelho: chave de idempotência
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null check (kind in ('expense', 'income', 'transfer', 'card_payment', 'refund')),
  description text not null default '' check (char_length(description) <= 200),
  category_id uuid references public.fin_categories(id) on delete set null,
  occurred_on date not null,
  month date not null check (extract(day from month) = 1), -- competência (cartão: mês da fatura)
  status text not null default 'posted' check (status in ('planned', 'posted', 'void')),
  group_id uuid, -- parcelas da mesma compra
  installment_no smallint,
  installments smallint,
  purchase_id uuid unique references public.purchases(id) on delete set null,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  voided_at timestamptz
);
create index fin_entries_ws_month on public.fin_entries (workspace_id, month);
create index fin_entries_group on public.fin_entries (group_id);

create table public.fin_postings (
  id bigint generated always as identity primary key,
  entry_id uuid not null references public.fin_entries(id) on delete cascade,
  account_id uuid not null references public.fin_accounts(id) on delete restrict,
  amount_cents bigint not null check (amount_cents <> 0)
);
create index fin_postings_entry on public.fin_postings (entry_id);
create index fin_postings_account on public.fin_postings (account_id);

create table public.fin_splits (
  entry_id uuid primary key references public.fin_entries(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  method text not null check (method in ('equal', 'income', 'percent', 'fixed')),
  paid_by uuid not null references public.profiles(id) on delete cascade,
  total_cents bigint not null check (total_cents > 0),
  shares jsonb not null
);

create table public.fin_settlements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  occurred_on date not null,
  note text check (char_length(note) <= 200),
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  check (from_user <> to_user)
);

create table public.fin_budgets (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_id uuid not null references public.fin_categories(id) on delete cascade,
  limit_cents bigint not null check (limit_cents > 0),
  primary key (workspace_id, category_id)
);

-- saldo por conta (só lançamentos efetivados); security_invoker = a RLS de quem consulta vale
create view public.fin_account_balances with (security_invoker = true) as
  select a.id as account_id,
         a.opening_balance_cents + coalesce(sum(p.amount_cents) filter (where e.status = 'posted'), 0) as balance_cents
    from public.fin_accounts a
    left join public.fin_postings p on p.account_id = a.id
    left join public.fin_entries e on e.id = p.entry_id
   group by a.id;

-- ---------- funções ----------
create or replace function public.fin_ensure_categories(p_workspace uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_member(p_workspace) then raise exception 'forbidden'; end if;
  if exists (select 1 from public.fin_categories where workspace_id = p_workspace) then return; end if;
  insert into public.fin_categories (workspace_id, kind, name)
  select p_workspace, 'expense', n from unnest(array['Mercado','Delivery','Restaurantes','Transporte','Moradia','Contas','Saúde','Assinaturas','Lazer','Casa','Compras','Pets','Educação','Outros']) n
  union all
  select p_workspace, 'income', n from unnest(array['Salário','Extra','Benefícios','Reembolso','Outros']) n;
end $$;

create or replace function public.fin_statement_month(p_date date, p_closing int) returns date
language sql immutable set search_path = '' as $$
  select (date_trunc('month', p_date) + case when extract(day from p_date) >= p_closing then interval '1 month' else interval '0' end)::date
$$;

-- conta que o usuário pode movimentar: do espaço do lançamento ou do próprio espaço pessoal
create or replace function public.fin_can_use_account(p_account uuid, p_workspace uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.fin_accounts a
     where a.id = p_account and a.archived_at is null and public.is_member(a.workspace_id)
       and (a.workspace_id = p_workspace
            or exists (select 1 from public.workspaces w where w.id = a.workspace_id and w.kind = 'personal' and w.created_by = (select auth.uid())))
  )
$$;

create or replace function public.fin_shares(p_workspace uuid, p_total bigint, p_method text, p_weights jsonb, p_payer uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_ids uuid[]; v_w numeric[]; v_sum numeric; v_out jsonb := '{}'; v_acc bigint := 0; v_part bigint; i int;
begin
  select array_agg(user_id order by user_id) into v_ids from public.workspace_members where workspace_id = p_workspace;
  v_w := array(select case p_method
                        when 'equal' then 1
                        when 'income' then coalesce((select reference_income_cents from public.workspace_members where workspace_id = p_workspace and user_id = u), 0)
                        else coalesce((p_weights ->> u::text)::numeric, 0) end
                 from unnest(v_ids) u);
  v_sum := (select sum(x) from unnest(v_w) x);
  if p_method = 'fixed' then
    if v_sum <> p_total then raise exception 'fixed shares must sum to total'; end if;
  elsif v_sum <= 0 then
    raise exception 'invalid split weights';
  end if;
  for i in 1 .. array_length(v_ids, 1) loop
    v_part := case when p_method = 'fixed' then v_w[i]::bigint else floor(p_total * v_w[i] / v_sum)::bigint end;
    v_acc := v_acc + v_part;
    v_out := v_out || jsonb_build_object(v_ids[i]::text, v_part);
  end loop;
  -- centavos de arredondamento ficam com quem pagou
  if v_acc <> p_total then
    v_out := jsonb_set(v_out, array[p_payer::text], to_jsonb((v_out ->> p_payer::text)::bigint + (p_total - v_acc)));
  end if;
  return v_out;
end $$;

/**
 * Registra um lançamento. Idempotente: o mesmo p_id devolve o que já existe.
 * expense em cartão com N parcelas cria N lançamentos (mesmo group_id), cada um na sua fatura.
 */
create or replace function public.fin_record(
  p_id uuid, p_kind text, p_workspace uuid, p_account uuid, p_amount_cents bigint,
  p_category uuid default null, p_description text default '', p_occurred_on date default current_date,
  p_status text default 'posted', p_to_account uuid default null, p_installments int default 1,
  p_split_method text default null, p_split_weights jsonb default null, p_paid_by uuid default null, p_purchase uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_acc public.fin_accounts; v_to public.fin_accounts;
  v_base bigint; v_rest bigint; v_amt bigint; v_month date; v_eid uuid; i int; v_n int := greatest(1, coalesce(p_installments, 1));
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.fin_entries where id = p_id or group_id = p_id) then return p_id; end if; -- idempotente
  if not public.is_member(p_workspace) then raise exception 'forbidden'; end if;
  if p_amount_cents is null or p_amount_cents <= 0 then raise exception 'amount must be positive'; end if;
  if p_status not in ('planned', 'posted') then raise exception 'invalid status'; end if;
  if not public.fin_can_use_account(p_account, p_workspace) then raise exception 'account not allowed'; end if;
  if p_category is not null and not exists (select 1 from public.fin_categories where id = p_category and workspace_id = p_workspace) then
    raise exception 'category not in workspace';
  end if;
  select * into v_acc from public.fin_accounts where id = p_account;

  if p_kind in ('transfer', 'card_payment') then
    if p_to_account is null or p_to_account = p_account or not public.fin_can_use_account(p_to_account, p_workspace) then raise exception 'invalid destination'; end if;
    select * into v_to from public.fin_accounts where id = p_to_account;
    if p_kind = 'card_payment' and (v_to.kind <> 'credit_card' or v_acc.kind = 'credit_card') then raise exception 'card payment goes from an account to a card'; end if;
    insert into public.fin_entries (id, workspace_id, kind, description, occurred_on, month, status)
    values (p_id, p_workspace, p_kind, coalesce(p_description, ''), p_occurred_on, date_trunc('month', p_occurred_on)::date, 'posted');
    insert into public.fin_postings (entry_id, account_id, amount_cents) values (p_id, p_account, -p_amount_cents), (p_id, p_to_account, p_amount_cents);
    return p_id;
  end if;

  if p_kind not in ('expense', 'income', 'refund') then raise exception 'invalid kind'; end if;
  if p_kind = 'income' and v_acc.kind = 'credit_card' then raise exception 'income cannot go to a card'; end if;
  if v_n > 1 and (p_kind <> 'expense' or v_acc.kind <> 'credit_card') then raise exception 'installments only for card expenses'; end if;
  if v_acc.kind = 'credit_card' and p_status = 'planned' then raise exception 'card purchases are always posted'; end if;

  v_base := p_amount_cents / v_n;
  v_rest := p_amount_cents - v_base * v_n;
  for i in 1 .. v_n loop
    v_amt := v_base + case when i = 1 then v_rest else 0 end;
    if v_amt = 0 then continue; end if;
    v_eid := case when i = 1 then p_id else md5(p_id::text || ':' || i)::uuid end;
    v_month := case when v_acc.kind = 'credit_card'
                    then (public.fin_statement_month(p_occurred_on, v_acc.closing_day) + make_interval(months => i - 1))::date
                    else date_trunc('month', p_occurred_on)::date end;
    insert into public.fin_entries (id, workspace_id, kind, description, category_id, occurred_on, month, status, group_id, installment_no, installments, purchase_id)
    values (v_eid, p_workspace, p_kind, coalesce(p_description, ''), p_category, p_occurred_on, v_month, p_status,
            case when v_n > 1 then p_id end, case when v_n > 1 then i end, case when v_n > 1 then v_n end, case when i = 1 then p_purchase end);
    insert into public.fin_postings (entry_id, account_id, amount_cents)
    values (v_eid, p_account, case when p_kind = 'expense' then -v_amt else v_amt end);
  end loop;

  if p_split_method is not null and p_kind = 'expense' then
    if not exists (select 1 from public.workspaces where id = p_workspace and kind = 'shared') then raise exception 'split only in shared space'; end if;
    insert into public.fin_splits (entry_id, workspace_id, method, paid_by, total_cents, shares)
    values (p_id, p_workspace, p_split_method, coalesce(p_paid_by, v_uid), p_amount_cents,
            public.fin_shares(p_workspace, p_amount_cents, p_split_method, p_split_weights, coalesce(p_paid_by, v_uid)));
  end if;
  return p_id;
end $$;

-- cancelar preserva o histórico (status void); parcelas da mesma compra vão juntas
create or replace function public.fin_void(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_e public.fin_entries;
begin
  select * into v_e from public.fin_entries where id = p_id;
  if not found or not public.is_member(v_e.workspace_id) then raise exception 'not found'; end if;
  update public.fin_entries set status = 'void', voided_at = now()
   where status <> 'void' and (id = p_id or (v_e.group_id is not null and group_id = v_e.group_id));
end $$;

create or replace function public.fin_confirm(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_e public.fin_entries;
begin
  select * into v_e from public.fin_entries where id = p_id;
  if not found or not public.is_member(v_e.workspace_id) then raise exception 'not found'; end if;
  update public.fin_entries set status = 'posted' where id = p_id and status = 'planned';
end $$;

create or replace function public.fin_settle(p_workspace uuid, p_to uuid, p_amount bigint, p_on date, p_note text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_member(p_workspace) or not exists (select 1 from public.workspace_members where workspace_id = p_workspace and user_id = p_to) then
    raise exception 'forbidden';
  end if;
  insert into public.fin_settlements (workspace_id, from_user, to_user, amount_cents, occurred_on, note)
  values (p_workspace, (select auth.uid()), p_to, p_amount, p_on, p_note) returning id into v_id;
  return v_id;
end $$;

-- ---------- RLS ----------
alter table public.fin_accounts enable row level security;
alter table public.fin_categories enable row level security;
alter table public.fin_entries enable row level security;
alter table public.fin_postings enable row level security;
alter table public.fin_splits enable row level security;
alter table public.fin_settlements enable row level security;
alter table public.fin_budgets enable row level security;

create policy fin_accounts_all on public.fin_accounts for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy fin_categories_all on public.fin_categories for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy fin_entries_select on public.fin_entries for select to authenticated using (public.is_member(workspace_id));
create policy fin_postings_select on public.fin_postings for select to authenticated
  using (exists (select 1 from public.fin_entries e where e.id = entry_id and public.is_member(e.workspace_id)));
create policy fin_splits_select on public.fin_splits for select to authenticated using (public.is_member(workspace_id));
create policy fin_settlements_select on public.fin_settlements for select to authenticated using (public.is_member(workspace_id));
create policy fin_settlements_void on public.fin_settlements for update to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy fin_budgets_all on public.fin_budgets for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

grant select, insert, update on public.fin_accounts, public.fin_categories to authenticated;
grant select on public.fin_entries, public.fin_postings, public.fin_splits, public.fin_settlements, public.fin_account_balances to authenticated;
grant update (voided_at) on public.fin_settlements to authenticated;
grant select, insert, update, delete on public.fin_budgets to authenticated;
grant select, insert, update, delete on public.fin_accounts, public.fin_categories, public.fin_entries, public.fin_postings,
  public.fin_splits, public.fin_settlements, public.fin_budgets to service_role;
grant select on public.fin_account_balances to service_role;
grant usage, select on sequence public.fin_postings_id_seq to service_role;

revoke execute on function public.fin_can_use_account(uuid, uuid), public.fin_shares(uuid, bigint, text, jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.fin_record(uuid, text, uuid, uuid, bigint, uuid, text, date, text, uuid, int, text, jsonb, uuid, uuid),
  public.fin_void(uuid), public.fin_confirm(uuid), public.fin_settle(uuid, uuid, bigint, date, text), public.fin_ensure_categories(uuid) from public, anon;
grant execute on function public.fin_record(uuid, text, uuid, uuid, bigint, uuid, text, date, text, uuid, int, text, jsonb, uuid, uuid),
  public.fin_void(uuid), public.fin_confirm(uuid), public.fin_settle(uuid, uuid, bigint, date, text), public.fin_ensure_categories(uuid),
  public.fin_statement_month(date, int) to authenticated;
