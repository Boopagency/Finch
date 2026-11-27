-- Finch · aviso de recado novo para a outra pessoa.
-- A RLS só deixa cada um criar aviso para si, por isso a função: ela confere o espaço e monta o texto aqui dentro.
-- O recado em si nunca vai no push (D-021: payload sem conteúdo íntimo) — só "fulano te mandou um recado".

create or replace function public.notify_partner_message(p_message uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_ws uuid;
  v_name text;
  v_n integer := 0;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select m.workspace_id into v_ws from public.couple_messages m where m.id = p_message and m.author_id = v_uid;
  if v_ws is null then raise exception 'forbidden'; end if; -- só o autor do próprio recado avisa
  select coalesce(nullif(btrim(display_name), ''), 'Alguém') into v_name from public.profiles where id = v_uid;

  with destinatarios as (
    insert into public.notification_jobs (user_id, category, source_type, source_id, scheduled_for, title, body, url, dedupe_key)
    select m.user_id, 'recado', 'couple_message', p_message, now(), v_name, 'te mandou um recado', '/vida/nos?v=recados',
           'recado:' || p_message || ':' || m.user_id
    from public.workspace_members m
    where m.workspace_id = v_ws
      and m.user_id <> v_uid
      and coalesce((select p.enabled from public.notification_preferences p where p.user_id = m.user_id and p.category = 'recado'), true)
    on conflict (dedupe_key) do nothing
    returning 1
  ) select count(*) into v_n from destinatarios;
  return v_n;
end $$;
revoke execute on function public.notify_partner_message(uuid) from public, anon;
grant execute on function public.notify_partner_message(uuid) to authenticated, service_role;
