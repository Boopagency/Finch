-- Finch · assistente (Etapa 7): uso por pessoa e dia, para limitar custo. Só o próprio usuário lê; só a função escreve.

create table public.ai_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  requests int not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
create policy ai_usage_select on public.ai_usage for select to authenticated using (user_id = (select auth.uid()));
grant select on public.ai_usage to authenticated;
grant select, insert, update, delete on public.ai_usage to service_role;

-- reserva uma chamada se ainda houver cota hoje (dia no fuso do usuário); devolve false quando estourou
create or replace function public.ai_reserve(p_daily_limit int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_day date; v_n int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  v_day := (now() at time zone coalesce((select tz from public.profiles where id = v_uid), 'America/Sao_Paulo'))::date;
  insert into public.ai_usage (user_id, day, requests) values (v_uid, v_day, 1)
  on conflict (user_id, day) do update set requests = public.ai_usage.requests + 1
  where public.ai_usage.requests < greatest(1, least(p_daily_limit, 500))
  returning requests into v_n;
  return v_n is not null;
end $$;

create or replace function public.ai_track(p_input bigint, p_output bigint) returns void
language sql security definer set search_path = '' as $$
  update public.ai_usage
     set input_tokens = input_tokens + greatest(0, p_input), output_tokens = output_tokens + greatest(0, p_output)
   where user_id = (select auth.uid())
     and day = (now() at time zone coalesce((select tz from public.profiles where id = (select auth.uid())), 'America/Sao_Paulo'))::date;
$$;
revoke execute on function public.ai_reserve(int), public.ai_track(bigint, bigint) from public, anon;
grant execute on function public.ai_reserve(int), public.ai_track(bigint, bigint) to authenticated;
