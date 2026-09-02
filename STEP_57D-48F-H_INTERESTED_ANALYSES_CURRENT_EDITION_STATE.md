# STEP 57D-48F-H: Interested Analyses Current-Edition State

## Purpose

Keep interests as durable, product-level user intent while showing whether the current commercial edition of a saved product is actively owned. An interest represents a subject to revisit; a purchase represents one exact edition of that subject.

## Interest Identity and Capacity

The `interested_analyses` identity remains `user_id + profile_id + product_id`. It has no `analysis_edition_key`, no artificial application count limit, and no per-month or per-year saved rows. The database uniqueness constraint remains the authoritative duplicate-save guard. Different profiles retain independent interest lists.

## Read-Only Current-Edition State

The current state is derived at read time from:

1. The active profile's saved product.
2. The server-resolved current edition for that product.
3. Active entitlement ownership for the exact current edition.

The interests table never persists current, previous, next, or ownership edition state. It is not mutated during a status read, purchase, refund, or entitlement transition.

The resolver reuses the established `resolveAnalysisEditionForOrder()` path. This keeps policy mapping, server/KST anchor resolution, and profile-aware DAEUN calculation authoritative. If a current edition cannot be resolved safely, the saved interest remains visible but is not marked current-owned.

## Ownership and Profile Isolation

Current ownership requires the authenticated user, active profile, canonical product, exact current `analysis_edition_key`, and an active entitlement. The state reader fetches saved interests once and active entitlements once, filters them to the active profile, and derives ownership in memory. It does not use the coarse P0 entitlement helper for display state.

An old owned edition is not current ownership. LEGACY is not equal to a modern current edition. LIFETIME resolves to `LIFETIME` across calendar boundaries and remains current-owned only while that exact entitlement is active. After a refund or revocation, the interest remains saved while current ownership becomes false.

## Edition Transitions

For monthly products, an interest saved in September remains one product-level row when October and later November arrive. If the user purchased `MONTH:2026-09`, skipped October, and reaches November, the state is current-not-owned for `MONTH:2026-11`; purchased history contains September only. Unsold months are not accumulated as interest records, and October is not required before a later edition.

Yearly, target-period, rolling-range, DAEUN, and lifetime products use the same existing edition policy semantics. Calendar transitions never rewrite interest data.

## Sales and Catalog Semantics

For recurring products, the active sales/catalog surface represents the current sellable edition only. It must not become a marketplace of every missed historical month. Historical editions belong in purchased history only after they were actually purchased and while their entitlements remain valid.

The temporary P0 guard remains product-global, so a saved product can correctly display current-not-owned while a new purchase is still intentionally blocked. This transitional discrepancy must not be described to customers as a repurchase promise.

If a product later leaves the active sale catalog, a saved interest is never automatically replaced with a different product. A newly launched product also requires an explicit user save. This step preserves the existing retired-interest policy and does not make retired products newly sellable.

## Customer Experience

Saved products remain visible and removable in all states. Exact-current ownership displays `현재 분석 보유 중` and links to the existing purchased-analysis library. Otherwise the row displays `현재 회차 미보유`. No new-edition purchase, repurchase, or report-generation activation CTA is introduced.

Human visual review passed for unowned, exact-current-owned, old-edition-only, and LIFETIME-owned interest states.

## Pre-Sale Purchase Activation Hardening

The following work is required before public paid activation or exact-edition repurchase is enabled.

### Pending-Order Concurrency and Idempotency

The current P0 active-entitlement guard cannot fully prevent two simultaneous fresh `createPendingOrder()` requests before either request creates an entitlement. Implement same-edition pending-order concurrency and idempotency protection around the conceptual identity `user + profile + product + analysis edition`, including pending, expired, cancelled, failed, and payment-retry cases. Do not claim full duplicate-payment safety before this exists.

### Automatic Exact-Edition Report Generation

A successful paid purchase must automatically enqueue or start generation for the exact purchased edition using the frozen purchase edition, reference snapshot, and input snapshot. Retry must remain exact-edition and idempotent. A normal paid customer must not need to press `심층 분석 생성하기` as a required second action after payment.

### Customer-Friendly Preparation States

The later hardening and polish step should replace unnecessary customer-facing lifecycle terminology such as `생성 전` and `생성 중` with preparation-oriented wording, for example `분석 준비 중`, `분석을 준비하고 있어요`, and `분석 완료`.

### Activation Order

1. Complete pre-sale purchase activation hardening: pending-order concurrency, automatic report generation, customer-friendly preparation states, and financial/report regressions.
2. Activate an exact-edition purchase guard only after that hardening.
3. Enable new-edition repurchase only after the preceding protections are proven.

## Safety and Scope

The P0 global guard remains active. New-edition purchase remains disabled. No migration, pricing, checkout eligibility, launch catalog, purchased-history behavior, entitlement/report identity, or refund semantics changed in this step. Temporary local H review fixtures were removed after approval.
