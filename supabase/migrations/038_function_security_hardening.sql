alter function public.set_operator_roles_updated_at()
  set search_path = public, pg_catalog;

alter function public.set_profiles_updated_at()
  set search_path = public, pg_catalog;

alter function public.set_paid_reports_updated_at()
  set search_path = public, pg_catalog;

alter function public.set_active_profiles_updated_at()
  set search_path = public, pg_catalog;

alter function public.set_free_analysis_results_updated_at()
  set search_path = public, pg_catalog;

alter function public.set_guest_free_analyses_updated_at()
  set search_path = public, pg_catalog;

alter function public.prevent_account_lifecycle_generation_change()
  set search_path = public, pg_catalog;

alter function public.set_account_lifecycles_updated_at()
  set search_path = public, pg_catalog;

alter function public.prevent_free_analysis_personal_nulls()
  set search_path = public;

alter function public.protect_account_closure_financial_writes()
  set search_path = public, pg_catalog;

revoke all on function public.prevent_free_analysis_personal_nulls() from public;
revoke all on function public.prevent_free_analysis_personal_nulls() from anon, authenticated;
revoke all on function public.protect_account_closure_financial_writes() from public;
revoke all on function public.protect_account_closure_financial_writes() from anon, authenticated;
