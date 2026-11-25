-- Finch · álbum de figurinhas (gamificação, D-017). Pontos → pacotinhos → figurinhas; conquistas → especiais.
-- Tudo concedido pelo banco (triggers e funções), nunca pelo cliente.

-- ---------- catálogo ----------
create table public.sticker_pages (
  code text primary key,
  season int not null default 1,
  name text not null,
  tone text not null,
  position int not null
);
create table public.stickers (
  code text primary key,
  page_code text not null references public.sticker_pages(code),
  name text not null,
  icon text not null,
  rarity text not null check (rarity in ('comum', 'rara', 'especial')),
  achievement text unique, -- só especiais; chave da conquista que libera
  position int not null,
  check ((rarity = 'especial') = (achievement is not null))
);
create table public.xp_rules (
  key text primary key,
  points int not null check (points > 0),
  daily_cap int not null check (daily_cap > 0),
  label text not null
);

insert into public.sticker_pages (code, name, tone, position) values
  ('rotina', 'Rotina', 'sunflower', 1), ('casa', 'Casa', 'tangerine', 2), ('corpo', 'Corpo', 'frog', 3),
  ('dinheiro', 'Dinheiro', 'coral', 4), ('mesa', 'Mesa', 'cobalt', 5), ('nos', 'Nós', 'lavender', 6);

insert into public.stickers (code, page_code, name, icon, rarity, achievement, position) values
  ('ROT-01','rotina','Despertador','AlarmClock','comum',null,1), ('ROT-02','rotina','Café passado','Coffee','comum',null,2),
  ('ROT-03','rotina','Agenda','CalendarDays','comum',null,3), ('ROT-04','rotina','Lista feita','ListChecks','comum',null,4),
  ('ROT-05','rotina','Livro aberto','BookOpen','comum',null,5), ('ROT-06','rotina','Lápis','Pencil','comum',null,6),
  ('ROT-07','rotina','Ampulheta','Hourglass','rara',null,7), ('ROT-08','rotina','Lua cheia','Moon','rara',null,8),
  ('ROT-09','rotina','Primeiro passo','Footprints','especial','primeiro-passo',9), ('ROT-10','rotina','Foguete','Rocket','especial','dez-tarefas',10),
  ('CAS-01','casa','Escova','Brush','comum',null,1), ('CAS-02','casa','Máquina de lavar','WashingMachine','comum',null,2),
  ('CAS-03','casa','Sofá','Sofa','comum',null,3), ('CAS-04','casa','Muda','Sprout','comum',null,4),
  ('CAS-05','casa','Chave','Key','comum',null,5), ('CAS-06','casa','Luminária','Lamp','comum',null,6),
  ('CAS-07','casa','Cama feita','Bed','rara',null,7), ('CAS-08','casa','Banheira','Bath','rara',null,8),
  ('CAS-09','casa','Casa em dia','House','especial','casa-em-dia',9), ('CAS-10','casa','Casa brilhando','Sparkles','especial','casa-brilhando',10),
  ('COR-01','corpo','Halter','Dumbbell','comum',null,1), ('COR-02','corpo','Gota','Droplet','comum',null,2),
  ('COR-03','corpo','Bicicleta','Bike','comum',null,3), ('COR-04','corpo','Maçã','Apple','comum',null,4),
  ('COR-05','corpo','Sol','Sun','comum',null,5), ('COR-06','corpo','Folha','Leaf','comum',null,6),
  ('COR-07','corpo','Batimento','HeartPulse','rara',null,7), ('COR-08','corpo','Raio','Zap','rara',null,8),
  ('COR-09','corpo','Sete dias de água','Rainbow','especial','agua-7',9), ('COR-10','corpo','Medalha','Medal','especial','habito-30',10),
  ('DIN-01','dinheiro','Cofrinho','PiggyBank','comum',null,1), ('DIN-02','dinheiro','Carteira','Wallet','comum',null,2),
  ('DIN-03','dinheiro','Moedas','Coins','comum',null,3), ('DIN-04','dinheiro','Cartão','CreditCard','comum',null,4),
  ('DIN-05','dinheiro','Recibo','Receipt','comum',null,5), ('DIN-06','dinheiro','Calculadora','Calculator','comum',null,6),
  ('DIN-07','dinheiro','Gráfico subindo','TrendingUp','rara',null,7), ('DIN-08','dinheiro','Banco','Landmark','rara',null,8),
  ('DIN-09','dinheiro','Primeira compra','ShoppingBasket','especial','primeira-compra',9), ('DIN-10','dinheiro','Diamante','Gem','especial','cinco-compras',10),
  ('MES-01','mesa','Pizza','Pizza','comum',null,1), ('MES-02','mesa','Croissant','Croissant','comum',null,2),
  ('MES-03','mesa','Cenoura','Carrot','comum',null,3), ('MES-04','mesa','Sopa','Soup','comum',null,4),
  ('MES-05','mesa','Ovo','Egg','comum',null,5), ('MES-06','mesa','Uva','Grape','comum',null,6),
  ('MES-07','mesa','Sorvete','IceCreamCone','rara',null,7), ('MES-08','mesa','Fatia de bolo','CakeSlice','rara',null,8),
  ('MES-09','mesa','Lista cheia','Cherry','especial','lista-cheia',9), ('MES-10','mesa','Mercado a dois','Sandwich','especial','mercado-a-dois',10),
  ('NOS-01','nos','Coração','Heart','comum',null,1), ('NOS-02','nos','Cinema','Clapperboard','comum',null,2),
  ('NOS-03','nos','Música','Music','comum',null,3), ('NOS-04','nos','Câmera','Camera','comum',null,4),
  ('NOS-05','nos','Mapa','Map','comum',null,5), ('NOS-06','nos','Brinde','Wine','comum',null,6),
  ('NOS-07','nos','Avião','Plane','rara',null,7), ('NOS-08','nos','Barraca','Tent','rara',null,8),
  ('NOS-09','nos','Casal conectado','MessageCircleHeart','especial','casal-conectado',9), ('NOS-10','nos','Presente','Gift','especial','presente',10);

insert into public.xp_rules (key, points, daily_cap, label) values
  ('task', 10, 8, 'Tarefa concluída'), ('home', 25, 4, 'Rotina da casa'), ('habit', 15, 6, 'Hábito cumprido'),
  ('water_goal', 20, 1, 'Meta de água'), ('purchase', 15, 2, 'Compra registrada');

-- ---------- estado por usuário ----------
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  rule_key text not null references public.xp_rules(key),
  source_id text not null default '',
  period_key text not null default '',
  points int not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, rule_key, source_id, period_key)
);
create index xp_events_user on public.xp_events (user_id, created_at desc);

create table public.sticker_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('pontos', 'boas-vindas')),
  created_at timestamptz not null default now(),
  opened_at timestamptz
);
create index sticker_packs_user on public.sticker_packs (user_id) where opened_at is null;

create table public.sticker_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  sticker_code text not null references public.stickers(code),
  pack_id uuid references public.sticker_packs(id) on delete set null,
  slot int, -- posição no pacote (sorteio auditável)
  pasted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (pack_id, slot)
);
create index sticker_items_owner on public.sticker_items (owner_id);
-- só uma cópia colada por figurinha por pessoa
create unique index sticker_items_pasted on public.sticker_items (owner_id, sticker_code) where pasted_at is not null;

create table public.sticker_trades (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  give_item uuid not null references public.sticker_items(id) on delete cascade,
  want_item uuid references public.sticker_items(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- ---------- regras internas (não expostas) ----------
create or replace function public.album_grant_packs(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_total int; v_have int;
begin
  select coalesce(sum(points), 0) into v_total from public.xp_events where user_id = p_user and revoked_at is null;
  select count(*) into v_have from public.sticker_packs where user_id = p_user and reason = 'pontos';
  insert into public.sticker_packs (user_id, reason)
  select p_user, 'pontos' from generate_series(1, greatest(0, v_total / 100 - v_have));
end $$;

create or replace function public.album_give_special(p_user uuid, p_achievement text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
  select code into v_code from public.stickers where achievement = p_achievement;
  if v_code is null then return; end if;
  if not exists (select 1 from public.sticker_items where owner_id = p_user and sticker_code = v_code) then
    insert into public.sticker_items (owner_id, sticker_code) values (p_user, v_code);
  end if;
end $$;

create or replace function public.album_check_achievements(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare n_task int; n_home int; n_habit int; n_water int; n_purchase int;
begin
  select count(*) filter (where rule_key = 'task'), count(*) filter (where rule_key = 'home'),
         count(*) filter (where rule_key = 'habit'), count(*) filter (where rule_key = 'water_goal'),
         count(*) filter (where rule_key = 'purchase')
    into n_task, n_home, n_habit, n_water, n_purchase
    from public.xp_events where user_id = p_user and revoked_at is null;
  if n_task + n_home >= 1 then perform public.album_give_special(p_user, 'primeiro-passo'); end if;
  if n_task + n_home >= 10 then perform public.album_give_special(p_user, 'dez-tarefas'); end if;
  if n_home >= 5 then perform public.album_give_special(p_user, 'casa-em-dia'); end if;
  if n_home >= 20 then perform public.album_give_special(p_user, 'casa-brilhando'); end if;
  if n_water >= 7 then perform public.album_give_special(p_user, 'agua-7'); end if;
  if n_habit >= 30 then perform public.album_give_special(p_user, 'habito-30'); end if;
  if n_purchase >= 1 then perform public.album_give_special(p_user, 'primeira-compra'); end if;
  if n_purchase >= 5 then perform public.album_give_special(p_user, 'cinco-compras'); end if;
  if exists (select 1 from public.purchases where created_by = p_user and items_count >= 10) then
    perform public.album_give_special(p_user, 'lista-cheia'); end if;
  if exists (select 1 from public.purchases pu join public.workspaces w on w.id = pu.workspace_id
             where pu.created_by = p_user and w.kind = 'shared') then
    perform public.album_give_special(p_user, 'mercado-a-dois'); end if;
  if exists (select 1 from public.workspace_members m join public.workspaces w on w.id = m.workspace_id
             where m.user_id = p_user and w.kind = 'shared'
               and (select count(*) from public.workspace_members x where x.workspace_id = w.id) >= 2) then
    perform public.album_give_special(p_user, 'casal-conectado'); end if;
end $$;

-- concede pontos (idempotente; respeita teto diário; refazer reativa em vez de duplicar)
create or replace function public.album_award(p_user uuid, p_rule text, p_source text, p_period text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_rule public.xp_rules; v_tz text; v_today int;
begin
  if p_user is null then return; end if;
  select * into v_rule from public.xp_rules where key = p_rule;
  select coalesce(tz, 'America/Sao_Paulo') into v_tz from public.profiles where id = p_user;
  -- já existe? reativa se tinha sido desfeito
  update public.xp_events set revoked_at = null
   where user_id = p_user and rule_key = p_rule and source_id = p_source and period_key = p_period and revoked_at is not null;
  if found then perform public.album_grant_packs(p_user); return; end if;
  select count(*) into v_today from public.xp_events
   where user_id = p_user and rule_key = p_rule and revoked_at is null
     and (created_at at time zone v_tz)::date = (now() at time zone v_tz)::date;
  if v_today >= v_rule.daily_cap then return; end if;
  insert into public.xp_events (user_id, rule_key, source_id, period_key, points)
  values (p_user, p_rule, p_source, p_period, v_rule.points)
  on conflict (user_id, rule_key, source_id, period_key) do nothing;
  perform public.album_grant_packs(p_user);
  perform public.album_check_achievements(p_user);
end $$;

create or replace function public.album_revoke(p_user uuid, p_rule text, p_source text, p_period text) returns void
language sql security definer set search_path = '' as $$
  update public.xp_events set revoked_at = now()
   where user_id = p_user and rule_key = p_rule and source_id = p_source and period_key = p_period and revoked_at is null;
$$;

-- ---------- triggers de pontos ----------
create or replace function public.album_on_task() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_rule text; v_user uuid; v_cat text;
begin
  if tg_table_name = 'tasks' then
    if new.repeat is not null then return new; end if;
    v_cat := new.category;
  else
    select category into v_cat from public.tasks where id = new.task_id;
  end if;
  v_rule := case when v_cat = 'casa' then 'home' else 'task' end;
  if new.status = 'done' and old.status is distinct from 'done' then
    perform public.album_award(coalesce(new.completed_by, auth.uid()), v_rule, new.id::text, '');
  elsif old.status = 'done' and new.status is distinct from 'done' then
    perform public.album_revoke(coalesce(old.completed_by, auth.uid()), v_rule, new.id::text, '');
  end if;
  return new;
end $$;
create trigger album_tasks after update of status on public.tasks for each row execute function public.album_on_task();
create trigger album_task_occ after update of status on public.task_occurrences for each row execute function public.album_on_task();

create or replace function public.album_on_water() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_goal int; v_total int;
begin
  select water_goal_ml into v_goal from public.user_settings where user_id = new.user_id;
  select coalesce(sum(amount_ml), 0) into v_total from public.water_logs where user_id = new.user_id and local_date = new.local_date;
  if v_total >= v_goal then perform public.album_award(new.user_id, 'water_goal', '', new.local_date::text); end if;
  return new;
end $$;
create trigger album_water after insert on public.water_logs for each row execute function public.album_on_water();

create or replace function public.album_on_habit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_h public.habits; v_from date; v_sum int;
begin
  select * into v_h from public.habits where id = new.habit_id;
  v_from := case when v_h.period = 'week' then (new.local_date - ((extract(isodow from new.local_date)::int + 6) % 7)) else new.local_date end;
  select coalesce(sum(value), 0) into v_sum from public.habit_logs
   where habit_id = new.habit_id and local_date between v_from and new.local_date;
  if v_sum >= v_h.target then perform public.album_award(new.user_id, 'habit', new.habit_id::text, v_from::text); end if;
  return new;
end $$;
create trigger album_habit after insert on public.habit_logs for each row execute function public.album_on_habit();

create or replace function public.album_on_purchase() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.album_award(new.created_by, 'purchase', new.id::text, '');
  return new;
end $$;
create trigger album_purchase after insert on public.purchases for each row execute function public.album_on_purchase();

-- ---------- ações expostas (sempre do próprio usuário) ----------
create or replace function public.album_refresh() returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.sticker_packs where user_id = v_uid and reason = 'boas-vindas') then
    insert into public.sticker_packs (user_id, reason) values (v_uid, 'boas-vindas');
  end if;
  perform public.album_grant_packs(v_uid);
  perform public.album_check_achievements(v_uid);
end $$;

-- abre o pacote: 3 figurinhas, sorteio determinístico pelo id do pacote (1 em 5 é rara)
create or replace function public.album_open_pack(p_pack uuid) returns setof public.sticker_items
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_pack public.sticker_packs; i int; v_rarity text; v_code text;
begin
  select * into v_pack from public.sticker_packs where id = p_pack for update;
  if not found or v_pack.user_id <> v_uid then raise exception 'pack not found'; end if;
  if v_pack.opened_at is null then
    for i in 1..3 loop
      v_rarity := case when ('x' || substr(md5(p_pack::text || ':r' || i), 1, 8))::bit(32)::int % 5 = 0 then 'rara' else 'comum' end;
      select code into v_code from public.stickers where rarity = v_rarity order by md5(p_pack::text || ':' || i || ':' || code) limit 1;
      insert into public.sticker_items (owner_id, sticker_code, pack_id, slot) values (v_uid, v_code, p_pack, i);
    end loop;
    update public.sticker_packs set opened_at = now() where id = p_pack;
  end if;
  return query select * from public.sticker_items where pack_id = p_pack order by slot;
end $$;

create or replace function public.album_paste(p_item uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_it public.sticker_items;
begin
  select * into v_it from public.sticker_items where id = p_item for update;
  if not found or v_it.owner_id <> (select auth.uid()) then raise exception 'item not found'; end if;
  if v_it.pasted_at is not null then return; end if;
  if exists (select 1 from public.sticker_items where owner_id = v_it.owner_id and sticker_code = v_it.sticker_code and pasted_at is not null) then
    raise exception 'already pasted';
  end if;
  update public.sticker_items set pasted_at = now() where id = p_item;
end $$;

create or replace function public.album_gift(p_item uuid, p_to uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_it public.sticker_items;
begin
  select * into v_it from public.sticker_items where id = p_item for update;
  if not found or v_it.owner_id <> v_uid then raise exception 'item not found'; end if;
  if v_it.pasted_at is not null then raise exception 'pasted items cannot be given'; end if;
  if p_to = v_uid or not public.shares_workspace(p_to) then raise exception 'invalid recipient'; end if;
  update public.sticker_items set owner_id = p_to, pack_id = null, slot = null where id = p_item;
  update public.sticker_trades set status = 'cancelled', decided_at = now() where status = 'pending' and (give_item = p_item or want_item = p_item);
  perform public.album_give_special(v_uid, 'presente');
end $$;

create or replace function public.album_propose_trade(p_give uuid, p_want uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); g public.sticker_items; w public.sticker_items; v_id uuid;
begin
  select * into g from public.sticker_items where id = p_give;
  select * into w from public.sticker_items where id = p_want;
  if g.owner_id is distinct from v_uid or g.pasted_at is not null then raise exception 'invalid give'; end if;
  if w.id is null or w.pasted_at is not null or w.owner_id = v_uid or not public.shares_workspace(w.owner_id) then raise exception 'invalid want'; end if;
  insert into public.sticker_trades (from_user, to_user, give_item, want_item) values (v_uid, w.owner_id, p_give, p_want) returning id into v_id;
  return v_id;
end $$;

create or replace function public.album_answer_trade(p_trade uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); t public.sticker_trades;
begin
  select * into t from public.sticker_trades where id = p_trade for update;
  if not found or t.status <> 'pending' then raise exception 'trade not pending'; end if;
  if v_uid = t.from_user and not p_accept then
    update public.sticker_trades set status = 'cancelled', decided_at = now() where id = p_trade; return;
  end if;
  if v_uid <> t.to_user then raise exception 'not your trade'; end if;
  if not p_accept then
    update public.sticker_trades set status = 'declined', decided_at = now() where id = p_trade; return;
  end if;
  -- as duas figurinhas ainda precisam estar livres e com os mesmos donos
  if not exists (select 1 from public.sticker_items where id = t.give_item and owner_id = t.from_user and pasted_at is null)
     or not exists (select 1 from public.sticker_items where id = t.want_item and owner_id = t.to_user and pasted_at is null) then
    update public.sticker_trades set status = 'cancelled', decided_at = now() where id = p_trade;
    raise exception 'stickers no longer available';
  end if;
  update public.sticker_items set owner_id = t.to_user, pack_id = null, slot = null where id = t.give_item;
  update public.sticker_items set owner_id = t.from_user, pack_id = null, slot = null where id = t.want_item;
  update public.sticker_trades set status = 'accepted', decided_at = now() where id = p_trade;
end $$;

-- ---------- RLS e grants ----------
alter table public.sticker_pages enable row level security;
alter table public.stickers enable row level security;
alter table public.xp_rules enable row level security;
alter table public.xp_events enable row level security;
alter table public.sticker_packs enable row level security;
alter table public.sticker_items enable row level security;
alter table public.sticker_trades enable row level security;

create policy catalog_pages on public.sticker_pages for select to authenticated using (true);
create policy catalog_stickers on public.stickers for select to authenticated using (true);
create policy catalog_rules on public.xp_rules for select to authenticated using (true);
create policy xp_own on public.xp_events for select to authenticated using (user_id = (select auth.uid()));
create policy packs_own on public.sticker_packs for select to authenticated using (user_id = (select auth.uid()));
-- vê as próprias e as do parceiro (para trocas e álbum do casal)
create policy items_visible on public.sticker_items for select to authenticated
  using (owner_id = (select auth.uid()) or public.shares_workspace(owner_id));
create policy trades_mine on public.sticker_trades for select to authenticated
  using (from_user = (select auth.uid()) or to_user = (select auth.uid()));

grant select on public.sticker_pages, public.stickers, public.xp_rules, public.xp_events, public.sticker_packs, public.sticker_items, public.sticker_trades to authenticated;
grant select, insert, update, delete on public.sticker_pages, public.stickers, public.xp_rules, public.xp_events, public.sticker_packs, public.sticker_items, public.sticker_trades to service_role;

revoke execute on function public.album_grant_packs(uuid), public.album_give_special(uuid, text), public.album_check_achievements(uuid),
  public.album_award(uuid, text, text, text), public.album_revoke(uuid, text, text, text),
  public.album_on_task(), public.album_on_water(), public.album_on_habit(), public.album_on_purchase() from public, anon, authenticated;
revoke execute on function public.album_refresh(), public.album_open_pack(uuid), public.album_paste(uuid), public.album_gift(uuid, uuid),
  public.album_propose_trade(uuid, uuid), public.album_answer_trade(uuid, boolean) from public, anon;
grant execute on function public.album_refresh(), public.album_open_pack(uuid), public.album_paste(uuid), public.album_gift(uuid, uuid),
  public.album_propose_trade(uuid, uuid), public.album_answer_trade(uuid, boolean) to authenticated;
