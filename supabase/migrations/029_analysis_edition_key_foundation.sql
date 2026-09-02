-- STEP 57D-48F-B: Analysis edition foundation (additive plumbing only).
--
-- This migration ONLY adds a nullable analysis_edition_key column to the
-- existing commercial tables and performs a conservative, non-speculative
-- backfill of historical rows. It intentionally does NOT:
--   * widen or drop any existing unique constraint
--   * make analysis_edition_key NOT NULL
--   * change any live grant/report/refund lookup semantics
-- The application must continue to behave exactly as before this migration.
--
-- Sentinel meanings (do not conflate):
--   'LIFETIME' = this specific product's edition policy intentionally never
--                renews (career-job-fit, relationship-partner-pattern,
--                lifetime-overview) — a known, non-speculative product fact.
--   'LEGACY'   = a pre-edition row whose exact historical edition cannot be
--                proven from persisted data. Never guessed from
--                created_at/purchased_at.
--
-- The three LIFETIME product ids are hardcoded here only for this one-time,
-- historical backfill; they are not a live behavioral path. The single
-- source of truth for ongoing edition-policy decisions is
-- app/lib/analysisEditionPolicy.ts.

alter table public.orders
  add column if not exists analysis_edition_key text;

alter table public.purchases
  add column if not exists analysis_edition_key text;

alter table public.entitlements
  add column if not exists analysis_edition_key text;

alter table public.paid_reports
  add column if not exists analysis_edition_key text;

create index if not exists orders_edition_key_idx
  on public.orders (analysis_edition_key)
  where analysis_edition_key is not null;

create index if not exists purchases_edition_key_idx
  on public.purchases (analysis_edition_key)
  where analysis_edition_key is not null;

create index if not exists entitlements_edition_key_idx
  on public.entitlements (analysis_edition_key)
  where analysis_edition_key is not null;

create index if not exists paid_reports_edition_key_idx
  on public.paid_reports (analysis_edition_key)
  where analysis_edition_key is not null;

-- ---------------------------------------------------------------------------
-- Backfill: orders / purchases / entitlements
-- Conservative: only a known-LIFETIME product identity is non-speculative.
-- Everything else becomes LEGACY (never inferred from a timestamp).
-- ---------------------------------------------------------------------------
update public.orders
  set analysis_edition_key = 'LIFETIME'
  where analysis_edition_key is null
    and product_id in ('career-job-fit', 'relationship-partner-pattern', 'lifetime-overview');

update public.orders
  set analysis_edition_key = 'LEGACY'
  where analysis_edition_key is null;

update public.purchases
  set analysis_edition_key = 'LIFETIME'
  where analysis_edition_key is null
    and product_id in ('career-job-fit', 'relationship-partner-pattern', 'lifetime-overview');

update public.purchases
  set analysis_edition_key = 'LEGACY'
  where analysis_edition_key is null;

update public.entitlements
  set analysis_edition_key = 'LIFETIME'
  where analysis_edition_key is null
    and resource_id in ('career-job-fit', 'relationship-partner-pattern', 'lifetime-overview');

update public.entitlements
  set analysis_edition_key = 'LEGACY'
  where analysis_edition_key is null;

-- ---------------------------------------------------------------------------
-- Backfill: paid_reports
-- A. LIFETIME-policy product -> LIFETIME.
-- B. PERIOD report with a valid persisted content.referencePeriod from which
--    the exact historical edition can be proven -> derive the historical key.
-- C/D. TOPIC pre-edition rows and any malformed/incomplete PERIOD snapshot
--    (missing fields) -> LEGACY (never guessed).
-- ---------------------------------------------------------------------------
update public.paid_reports
  set analysis_edition_key = 'LIFETIME'
  where analysis_edition_key is null
    and product_id in ('career-job-fit', 'relationship-partner-pattern', 'lifetime-overview');

update public.paid_reports
  set analysis_edition_key = 'TARGET_MONTH:' ||
    (content -> 'referencePeriod' ->> 'referenceYear') || '-' ||
    lpad(content -> 'referencePeriod' ->> 'referenceMonth', 2, '0')
  where analysis_edition_key is null
    and product_id in ('monthly-current', 'monthly-next')
    and content -> 'referencePeriod' ->> 'referenceYear' is not null
    and content -> 'referencePeriod' ->> 'referenceMonth' is not null;

update public.paid_reports
  set analysis_edition_key = 'TARGET_YEAR:' || (content -> 'referencePeriod' ->> 'referenceYear')
  where analysis_edition_key is null
    and product_id in ('yearly-current', 'annual-next')
    and content -> 'referencePeriod' ->> 'referenceYear' is not null;

update public.paid_reports
  set analysis_edition_key = 'RANGE:' ||
    (content -> 'referencePeriod' ->> 'referenceYear') || '-' ||
    substring(content -> 'referencePeriod' -> 'coverage' ->> 'to' from 1 for 4)
  where analysis_edition_key is null
    and product_id = 'annual-3years'
    and content -> 'referencePeriod' ->> 'referenceYear' is not null
    and content -> 'referencePeriod' -> 'coverage' ->> 'to' is not null;

update public.paid_reports
  set analysis_edition_key = 'DAEUN:' ||
    (content -> 'referencePeriod' ->> 'daeunOrder') || ':' ||
    (content -> 'referencePeriod' ->> 'daeunGanji')
  where analysis_edition_key is null
    and product_id = 'daeun-current'
    and content -> 'referencePeriod' ->> 'daeunOrder' is not null
    and content -> 'referencePeriod' ->> 'daeunGanji' is not null;

-- Catch-all: any remaining null (TOPIC pre-edition rows, generating/failed
-- rows with no content, or a PERIOD row whose snapshot was incomplete).
update public.paid_reports
  set analysis_edition_key = 'LEGACY'
  where analysis_edition_key is null;
