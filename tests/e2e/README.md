# Testes de ponta a ponta

Rodam o app de verdade (build local) contra o Supabase de produção, com **dois usuários de teste isolados** (e-mails `@finch.test`).
Nunca use contas reais. Os dados de teste ficam isolados pela RLS.

## Criar os usuários de teste (SQL Editor do Supabase)
Troque `SENHA` por uma senha forte e guarde-a só no seu `.env.local` como `E2E_PASSWORD`.

```sql
do $$ declare u record; begin
  for u in select * from (values ('e2e00000-0000-4000-8000-00000000000a'::uuid,'e2e-a@finch.test','Teste A'),
                                 ('e2e00000-0000-4000-8000-00000000000b'::uuid,'e2e-b@finch.test','Teste B')) t(id,email,name) loop
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
      confirmation_token,recovery_token,email_change_token_new,email_change,email_change_token_current,reauthentication_token,phone_change,phone_change_token)
    values ('00000000-0000-0000-0000-000000000000',u.id,'authenticated','authenticated',u.email,extensions.crypt('SENHA',extensions.gen_salt('bf')),now(),
      '{"provider":"email","providers":["email"]}',json_build_object('display_name',u.name)::jsonb,now(),now(),'','','','','','','','');
    insert into auth.identities (id,user_id,provider_id,provider,identity_data,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),u.id,u.id::text,'email',json_build_object('sub',u.id::text,'email',u.email,'email_verified',true)::jsonb,now(),now(),now());
  end loop;
end $$;
with ws as (insert into public.workspaces (kind,name,created_by) values ('shared','Nós (teste)','e2e00000-0000-4000-8000-00000000000a') returning id)
insert into public.workspace_members (workspace_id,user_id,role)
select id,'e2e00000-0000-4000-8000-00000000000a'::uuid,'owner' from ws union all select id,'e2e00000-0000-4000-8000-00000000000b'::uuid,'member' from ws;
```

## Rodar
```bash
npm run build && npx next start -p 3100
```
```bash
E2E_PASSWORD=... npm run test:e2e
```

## Apagar os usuários de teste
```sql
delete from public.fin_entries where workspace_id in (select workspace_id from public.workspace_members where user_id::text like 'e2e%');
delete from auth.users where email like '%@finch.test';
```

## Assistente com API falsa (sem custo)
O teste `assistant.e2e.mjs` sobe uma API falsa na porta 3199. Rode um segundo servidor apontado para ela e passe a URL:
```bash
AI_API_KEY=fake-local-test ANTHROPIC_BASE_URL=http://127.0.0.1:3199 npx next start -p 3101
```
```bash
E2E_AI_BASE=http://localhost:3101 E2E_PASSWORD=... npm run test:e2e
```
Sem `E2E_AI_BASE`, só a parte "sem chave" roda. `E2E_VERBOSE=1` mostra o log completo das falhas.

