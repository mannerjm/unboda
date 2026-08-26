-- STEP 57D-45D-R10D: atomically fence entitlement revocation by refund claim.
create or replace function public.revoke_refund_entitlement(
  target_order_id uuid,
  claim_token uuid,
  reason text
)
returns setof public.entitlements
language sql
security definer
set search_path = public
as $$
  update public.entitlements entitlement
  set is_active = false,
      revoked_at = now(),
      revocation_reason = reason
  where entitlement.is_active = true
    and exists (
      select 1
      from public.refund_workflows workflow
      where workflow.order_id = target_order_id
        and workflow.reconciliation_claim_token = claim_token
        and workflow.status in ('REFUND_REQUESTED', 'REFUND_PROCESSING', 'REFUND_FAILED_RETRYING')
        and workflow.user_id = entitlement.user_id
        and workflow.profile_id = entitlement.profile_id
        and workflow.product_id = entitlement.resource_id
    )
  returning entitlement.*;
$$;

revoke all on function public.revoke_refund_entitlement(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.revoke_refund_entitlement(uuid, uuid, text) to service_role;