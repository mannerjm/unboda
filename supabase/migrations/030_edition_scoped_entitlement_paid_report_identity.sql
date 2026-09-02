-- STEP 57D-48F-D: edition-safe commercial core (entitlement + paid report identity).
--
-- Widens entitlement/paid-report uniqueness from product-global to
-- edition-scoped, and adds an immutable analysis reference snapshot
-- companion to analysis_edition_key. Non-destructive: no data wipe, no reset.
--
-- NEW-EDITION SALES REMAIN DISABLED after this migration: the 57D-48F-A P0
-- guard (product-global "any active edition blocks a new order") is
-- application-layer code, untouched by this schema change.
--
-- NULLABILITY: analysis_edition_key stays NULLABLE on all four tables.
-- Dozens of pre-existing regression/fixture scripts (refund, reconciliation,
-- retry, account-closure suites — e.g. r10a-r10f, refund-r3/r4/r5,
-- phase3d-account-closure-finalization, refund-reconciliation-db-integration)
-- insert directly into orders/purchases/entitlements/paid_reports without
-- setting this column, and rewriting that broad, unrelated test surface is
-- out of scope for this phase. Production code (createPendingOrder,
-- createPurchaseFromPaidOrder, grantEntitlement, claimPaidReport) always
-- populates a real value going forward. NULLs never collide with each other
-- or any other value under a UNIQUE constraint, so this is schema-safe.

-- ---------------------------------------------------------------------------
-- Immutable analysis reference snapshot: the edition key identifies WHICH
-- edition was sold, but for DAEUN in particular (seunGanji is not part of the
-- key) and for any anchor-date-derived context, it does not by itself carry
-- enough information to deterministically regenerate that exact historical
-- report if generation happens later. This snapshot is frozen alongside the
-- edition key at order creation and must never be recomputed from "now".
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists analysis_reference_snapshot jsonb;

alter table public.purchases
  add column if not exists analysis_reference_snapshot jsonb;

-- ---------------------------------------------------------------------------
-- Entitlements: product-global -> edition-scoped identity.
-- ---------------------------------------------------------------------------
alter table public.entitlements
  drop constraint if exists entitlements_user_profile_resource_unique,
  add constraint entitlements_user_profile_resource_edition_unique unique (
    user_id,
    profile_id,
    resource_id,
    resource_type,
    analysis_edition_key
  );

drop index if exists public.entitlements_lookup_idx;
create index if not exists entitlements_lookup_idx
  on public.entitlements (
    user_id,
    profile_id,
    resource_id,
    resource_type,
    analysis_edition_key,
    is_active
  );

-- ---------------------------------------------------------------------------
-- Paid reports: product-global -> edition-scoped identity.
-- ---------------------------------------------------------------------------
alter table public.paid_reports
  drop constraint if exists paid_reports_user_profile_product_unique,
  add constraint paid_reports_user_profile_product_edition_unique unique (
    user_id,
    profile_id,
    product_id,
    analysis_edition_key
  );

drop index if exists public.paid_reports_profile_product_idx;
create index if not exists paid_reports_profile_product_idx
  on public.paid_reports (profile_id, product_id, analysis_edition_key, status);

-- ---------------------------------------------------------------------------
-- Refund entitlement revocation must fence on the frozen order edition, not
-- merely product identity. Resolved via order_id (strongest immutable link),
-- never recomputed. IS NOT DISTINCT FROM safely treats NULL=NULL as a match
-- for any legacy row that predates edition tracking entirely.
-- ---------------------------------------------------------------------------
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
      join public.orders ord on ord.id = workflow.order_id
      where workflow.order_id = target_order_id
        and workflow.reconciliation_claim_token = claim_token
        and workflow.status in ('REFUND_REQUESTED', 'REFUND_PROCESSING', 'REFUND_FAILED_RETRYING')
        and workflow.user_id = entitlement.user_id
        and workflow.profile_id = entitlement.profile_id
        and workflow.product_id = entitlement.resource_id
        and ord.analysis_edition_key is not distinct from entitlement.analysis_edition_key
    )
  returning entitlement.*;
$$;

revoke all on function public.revoke_refund_entitlement(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.revoke_refund_entitlement(uuid, uuid, text) to service_role;
