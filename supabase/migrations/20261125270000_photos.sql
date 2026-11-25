-- Finch · fotos (evolução corporal e memórias). Bucket privado; caminho "<espaço>/<arquivo>" e a RLS usa o espaço.
-- Fotos de corpo só no espaço pessoal (só a própria pessoa é membro). O app reduz a imagem e tira metadados (local) antes de enviar.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- espaço dono do arquivo, a partir do caminho; caminho fora do padrão → null (nega)
create or replace function public.photo_space(p_name text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  if p_name !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' then return null; end if;
  return split_part(p_name, '/', 1)::uuid;
end $$;

create policy photos_select on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.is_member(public.photo_space(name)));
create policy photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.is_member(public.photo_space(name)));
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.is_member(public.photo_space(name)));

-- uma foto por memória
alter table public.memories add column photo_path text
  check (photo_path is null or public.photo_space(photo_path) = workspace_id);

create table public.body_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  path text not null unique,
  taken_on date not null default current_date,
  note text check (char_length(note) <= 140),
  created_at timestamptz not null default now()
);
create index body_photos_user on public.body_photos (user_id, taken_on desc);
alter table public.body_photos enable row level security;
create policy body_photos_all on public.body_photos for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workspaces w
                 where w.id = public.photo_space(path) and w.kind = 'personal' and w.created_by = (select auth.uid()))
  );
grant select, insert, delete on public.body_photos to authenticated;
grant select, insert, update, delete on public.body_photos to service_role;
