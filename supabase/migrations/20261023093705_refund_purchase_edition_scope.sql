-- Refunds only revoke the exact purchase behind the original order.
-- The workflow lock fences both initial requests and recovery workers.
create or replace function public.revoke_refund_entitlement(
  target_order_id uuid,
  claim_token uuid,
  reason text
)
returns setof public.entitlements
language sql
security definer
set search_path = ''
as $$
  with refund_scope as materialized (
    select purchase.id as purchase_id, purchase.user_id, purchase.profile_id,
      purchase.product_id, purchase.analysis_edition_key
    from public.refund_workflows workflow
    join public.orders ord on ord.id = workflow.order_id
      and ord.user_id = workflow.user_id
      and ord.profile_id = workflow.profile_id
      and ord.product_id = workflow.product_id
    join public.purchases purchase on purchase.order_id = ord.id
      and purchase.user_id = ord.user_id
      and purchase.profile_id = ord.profile_id
      and purchase.product_id = ord.product_id
      and purchase.analysis_edition_key is not distinct from ord.analysis_edition_key
    where workflow.order_id = target_order_id
      and workflow.reconciliation_claim_token = claim_token
      and workflow.status in ('REFUND_REQUESTED', 'REFUND_PROCESSING', 'REFUND_FAILED_RETRYING')
    for update of workflow
  )
  update public.entitlements entitlement
  set is_active = false,
      revoked_at = now(),
      revocation_reason = reason
  from refund_scope scope
  where entitlement.is_active = true
    and entitlement.purchase_id = scope.purchase_id
    and entitlement.user_id = scope.user_id
    and entitlement.profile_id = scope.profile_id
    and entitlement.resource_id = scope.product_id
    and entitlement.resource_type = 'paid_analysis'
    and entitlement.analysis_edition_key is not distinct from scope.analysis_edition_key
  returning entitlement.*;
$$;

revoke all on function public.revoke_refund_entitlement(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.revoke_refund_entitlement(uuid, uuid, text) to service_role;
