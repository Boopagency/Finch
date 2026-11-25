-- Helpers de RLS não precisam ser chamáveis por anon (linter 0028).
revoke execute on function public.is_member(uuid), public.is_owner(uuid), public.shares_workspace(uuid) from public, anon;
grant execute on function public.is_member(uuid), public.is_owner(uuid), public.shares_workspace(uuid) to authenticated, service_role;
revoke execute on function public.touch_updated_at(), public.guard_personal_membership() from public, anon, authenticated;
