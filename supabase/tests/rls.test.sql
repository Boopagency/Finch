-- Testes de isolamento. Cada bloco falha com exceção se a regra quebrar.
\set ON_ERROR_STOP 1
create or replace function pg_temp.as_user(u uuid, email text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u, 'email', email)::text, false);
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'jabez@exemplo.com', '{"display_name":"Jabez"}'),
  ('00000000-0000-0000-0000-00000000000b', 'duda@exemplo.com',  '{"display_name":"Duda"}'),
  ('00000000-0000-0000-0000-00000000000c', 'outra@exemplo.com', '{}');

\set QUIET on
create temp table ids as select created_by as owner, id from public.workspaces where kind = 'personal';
grant select on ids to authenticated;

-- trigger criou perfil + pessoal
do $$ begin
  assert (select count(*) from public.workspaces where kind = 'personal') = 3, 'workspace pessoal por usuário';
  assert (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'Jabez';
end $$;

set role authenticated;
select from pg_temp.as_user('00000000-0000-0000-0000-00000000000a', 'jabez@exemplo.com');
do $$ declare ws uuid; begin
  assert (select count(*) from public.workspaces) = 1, 'A vê só o próprio pessoal';
  assert (select count(*) from public.profiles) = 1, 'A não vê perfis alheios antes do vínculo';
  ws := public.create_shared_workspace('Nós');
  insert into public.invitations (workspace_id, token_hash, invited_email, created_by)
  values (ws, encode(sha256(convert_to('token-duda', 'UTF8')), 'hex'), 'duda@exemplo.com', '00000000-0000-0000-0000-00000000000a');
end $$;

-- A não consegue convidar para o pessoal
do $$ begin
  begin
    insert into public.invitations (workspace_id, token_hash, invited_email, created_by)
    select id, 'x', 'c@exemplo.com', '00000000-0000-0000-0000-00000000000a' from ids where owner = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FALHOU: convite para workspace pessoal foi aceito';
  exception when insufficient_privilege then null; end;
end $$;

-- C tenta usar o convite da Duda
select from pg_temp.as_user('00000000-0000-0000-0000-00000000000c', 'outra@exemplo.com');
do $$ begin
  begin perform public.accept_invitation('token-duda'); raise exception 'FALHOU: outro e-mail aceitou';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;
  assert (select count(*) from public.invitations) = 0, 'C não vê convites';
end $$;

-- B aceita
select from pg_temp.as_user('00000000-0000-0000-0000-00000000000b', 'duda@exemplo.com');
do $$ begin
  perform public.accept_invitation('token-duda');
  perform public.accept_invitation('token-duda'); -- idempotente
  assert (select count(*) from public.workspaces) = 2, 'B vê pessoal + Nós';
  assert (select count(*) from public.workspaces where kind = 'personal') = 1, 'B não vê pessoal de A';
  assert (select count(*) from public.profiles) = 2, 'B vê o perfil de A após vínculo';
  assert (select count(*) from public.workspace_members) = 3, 'B vê membros de Nós + o próprio pessoal';
end $$;

-- B não entra no pessoal de A nem muda papel
do $$ begin
  begin
    insert into public.workspace_members (workspace_id, user_id)
    select id, '00000000-0000-0000-0000-00000000000b' from ids where owner = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FALHOU: inseriu membro';
  exception when insufficient_privilege then null; end;
  begin
    update public.workspace_members set role = 'owner' where user_id = '00000000-0000-0000-0000-00000000000b';
    raise exception 'FALHOU: mudou papel';
  exception when insufficient_privilege then null; end;
  update public.workspace_members set reference_income_cents = 500000 where user_id = '00000000-0000-0000-0000-00000000000b';
end $$;

-- notificações: B registra aparelho; A não vê
do $$ begin
  perform public.register_push_subscription('https://push.example/b1', 'k', 'a', 'iPhone Duda', 'ua');
  insert into public.notification_jobs (user_id, category, scheduled_for, title) values ('00000000-0000-0000-0000-00000000000b', 'test', now(), 'oi');
  begin
    insert into public.notification_jobs (user_id, category, scheduled_for, title) values ('00000000-0000-0000-0000-00000000000a', 'test', now(), 'spam');
    raise exception 'FALHOU: criou job para outro usuário';
  exception when insufficient_privilege then null; end;
  begin perform public.claim_notification_jobs(10); raise exception 'FALHOU: authenticated reivindicou jobs';
  exception when insufficient_privilege then null; end;
end $$;
select from pg_temp.as_user('00000000-0000-0000-0000-00000000000a', 'jabez@exemplo.com');
do $$ begin
  assert (select count(*) from public.push_subscriptions) = 0, 'A não vê aparelhos de B';
  assert (select count(*) from public.notification_jobs) = 0, 'A não vê jobs de B';
end $$;

-- anônimo não vê nada
reset role; set role anon;
do $$ begin
  begin perform 1 from public.profiles; raise exception 'FALHOU: anon leu perfis';
  exception when insufficient_privilege then null; end;
end $$;

-- service_role reivindica e não duplica
reset role; set role service_role;
do $$ begin
  assert (select count(*) from public.claim_notification_jobs(10)) = 1, 'claim pega 1';
  assert (select count(*) from public.claim_notification_jobs(10)) = 0, 'claim não repete';
  -- caminho do dispatcher: ler aparelhos, gravar log, marcar enviado
  perform 1 from public.push_subscriptions;
  insert into public.notification_logs (job_id, status_code) select id, 201 from public.notification_jobs limit 1;
  update public.notification_jobs set status = 'sent', sent_at = now();
  assert (select count(*) from public.notification_jobs where status = 'sent') = 1, 'service_role atualiza job';
end $$;
reset role;
\echo 'RLS: todos os testes passaram'
