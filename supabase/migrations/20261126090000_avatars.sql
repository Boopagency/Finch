-- Finch · foto de perfil e foto do casal. Arquivos no bucket privado "photos" (RLS por espaço).
-- Gravação só por funções que conferem: o arquivo está num espaço de que a pessoa participa.

-- avatar_path já existe (core): só passa a exigir caminho válido de foto
alter table public.profiles add constraint profiles_avatar_path_format check (avatar_path is null or public.photo_space(avatar_path) is not null);
alter table public.workspaces add column cover_path text check (cover_path is null or public.photo_space(cover_path) = id);

-- foto de perfil: guardada num espaço da pessoa (o do casal, para a outra pessoa ver)
create or replace function public.set_avatar(p_path text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  if p_path is not null and not public.is_member(public.photo_space(p_path)) then raise exception 'forbidden'; end if;
  update public.profiles set avatar_path = p_path where id = (select auth.uid());
end $$;

-- foto do espaço (foto do casal no "Nós"): qualquer membro troca
create or replace function public.set_space_cover(p_space uuid, p_path text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member(p_space) then raise exception 'forbidden'; end if;
  if p_path is not null and public.photo_space(p_path) is distinct from p_space then raise exception 'invalid path'; end if;
  update public.workspaces set cover_path = p_path where id = p_space;
end $$;

revoke execute on function public.set_avatar(text), public.set_space_cover(uuid, text) from public, anon;
grant execute on function public.set_avatar(text), public.set_space_cover(uuid, text) to authenticated;
-- só pela função (que confere o espaço do arquivo)
revoke update (avatar_path) on public.profiles from authenticated;
