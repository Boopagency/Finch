-- O próprio usuário pode apagar os lembretes PENDENTES dele (replanejamento ao mudar configurações).
create policy jobs_delete_pending on public.notification_jobs for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'pending');
grant delete on public.notification_jobs to authenticated;
