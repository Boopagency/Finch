-- Finch · financeiro 2: lançamentos recorrentes (salário, aluguel, assinaturas).
-- Cada regra gera no máximo um lançamento por mês, com id derivado de (regra, mês): reabrir a tela não duplica
-- e um lançamento cancelado (void) não volta. Conta comum entra como "previsto"; cartão entra quando o dia chega.

create table public.fin_recurring (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null check (kind in ('expense', 'income')),
  description text not null check (char_length(description) between 1 and 200),
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 100000000000),
  account_id uuid not null references public.fin_accounts(id) on delete cascade,
  category_id uuid references public.fin_categories(id) on delete set null,
  day_of_month smallint not null check (day_of_month between 1 and 31),
  start_month date not null default date_trunc('month', current_date)::date check (extract(day from start_month) = 1),
  active boolean not null default true,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index fin_recurring_ws on public.fin_recurring (workspace_id) where active;

alter table public.fin_recurring enable row level security;
create policy fin_recurring_all on public.fin_recurring for all to authenticated
  using (public.is_member(workspace_id))
  with check (
    public.is_member(workspace_id)
    and exists (select 1 from public.fin_accounts a where a.id = account_id and a.archived_at is null)
    and (category_id is null or exists (select 1 from public.fin_categories c where c.id = category_id and c.workspace_id = fin_recurring.workspace_id and c.kind = fin_recurring.kind))
  );
grant select, insert, update, delete on public.fin_recurring to authenticated, service_role;

-- gera os lançamentos do mês para as regras visíveis ao usuário; devolve quantos foram criados agora
create or replace function public.fin_materialize(p_month date) returns int
language plpgsql security invoker set search_path = '' as $$
declare r record; v_day date; v_id uuid; v_card boolean; n int := 0;
begin
  if extract(day from p_month) <> 1 then raise exception 'month must be the 1st'; end if;
  if p_month > (date_trunc('month', current_date) + interval '1 month')::date then return 0; end if; -- no máximo o mês que vem
  for r in select * from public.fin_recurring where active and start_month <= p_month loop
    v_day := least(p_month + (r.day_of_month - 1), (p_month + interval '1 month - 1 day')::date);
    v_id := md5(r.id::text || ':' || p_month::text)::uuid;
    if exists (select 1 from public.fin_entries where id = v_id) then continue; end if;
    select kind = 'credit_card' into v_card from public.fin_accounts where id = r.account_id;
    if v_card and v_day > current_date then continue; end if; -- cartão: só quando a compra acontece
    begin
      perform public.fin_record(v_id, r.kind, r.workspace_id, r.account_id, r.amount_cents, r.category_id, r.description, v_day,
                                case when v_card then 'posted' else 'planned' end);
      n := n + 1;
    exception when others then
      null; -- conta pessoal do(a) parceiro(a): quem pode gerar é o dono quando abrir o app
    end;
  end loop;
  return n;
end $$;
revoke execute on function public.fin_materialize(date) from public, anon;
grant execute on function public.fin_materialize(date) to authenticated;
