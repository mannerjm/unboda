-- ============================================================================
-- DRAFT MIGRATION ONLY — NOT EXECUTED — DO NOT APPLY WITHOUT HUMAN REVIEW
-- STEP 57D-46 PHASE 3C: SAFE ACCOUNT RETENTION FK SAFETY & FINALIZATION MARKER (FINAL DRAFT)
-- ============================================================================
--
-- Objective:
-- 1. Decouple financial purchase truth, toss payment records, and entitlement logs
--    from auth.users ON DELETE CASCADE (change to ON DELETE RESTRICT).
-- 2. Add persisted finalization markers to `account_lifecycles` to define an explicit,
--    machine-deterministic cancellation boundary and support idempotent multi-step orchestrator recovery.
--
-- Pure DDL Schema Migration:
-- Contains NO customer cleanup DML (no UPDATE or DELETE statements).
--
-- Status: DRAFT / UNAPPLIED.

-- 1. orders.user_id FK correction
alter table public.orders
  drop constraint if exists orders_user_id_fkey,
  add constraint orders_user_id_fkey
    foreign key (user_id)
    references auth.users (id)
    on delete restrict;

-- 2. purchases.user_id FK correction
alter table public.purchases
  drop constraint if exists purchases_user_id_fkey,
  add constraint purchases_user_id_fkey
    foreign key (user_id)
    references auth.users (id)
    on delete restrict;

-- 3. entitlements.user_id FK correction
alter table public.entitlements
  drop constraint if exists entitlements_user_id_fkey,
  add constraint entitlements_user_id_fkey
    foreign key (user_id)
    references auth.users (id)
    on delete restrict;

-- 4. paid_reports.user_id FK correction
alter table public.paid_reports
  drop constraint if exists paid_reports_user_id_fkey,
  add constraint paid_reports_user_id_fkey
    foreign key (user_id)
    references auth.users (id)
    on delete restrict;

-- 5. Add finalization marker columns to account_lifecycles for cancellation boundary & orchestrator recovery
alter table public.account_lifecycles
  add column if not exists finalization_started_at timestamptz,
  add column if not exists data_scrubbed_at timestamptz,
  add column if not exists finalized_at timestamptz;
