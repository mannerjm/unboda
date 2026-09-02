# Exact-Edition Purchase Activation

## Purpose

Activate legitimate purchases for a newly resolved commercial edition while retaining protection against purchasing the same current edition twice.

## Purchase Rule

Purchase eligibility now blocks only when the selected profile has an active entitlement for the exact server-resolved current edition:

`user + profile + canonical product + analysis_edition_key`

The order-creation boundary resolves the canonical launch product and its authoritative edition once, checks exact active ownership with that same value, and persists the same frozen value on the new order. Client-supplied edition keys and browser time are never trusted.

The former product-global entitlement check is no longer the purchase blocker. Its coarse behavior remains available for report-access and broader ownership contexts where any active edition remains meaningful.

## Edition Semantics

- An active current MONTH, YEAR, TARGET_MONTH, TARGET_YEAR, RANGE, DAEUN, or LIFETIME entitlement blocks a duplicate purchase of that same edition.
- A prior monthly or yearly edition does not block a later current edition.
- Users may skip a monthly edition. A later current edition is independently purchasable; missed months are not fabricated into purchase history.
- LEGACY represents unknown historical identity and does not equal a modern current edition.
- LIFETIME resolves to `LIFETIME`; an active lifetime entitlement blocks its duplicate purchase, while a revoked entitlement no longer does.
- Different profiles and products remain independent.

## Concurrency and Payment Pipeline

Migration `032_active_edition_order_uniqueness.sql` remains the active database protection for known non-LEGACY exact editions in `pending` and `paid` order states. Concurrent same-edition requests converge on a single pending order; failed and canceled attempts remain eligible for a new attempt. The existing lifecycle has no expiry state or expiry timestamp, and no expiry behavior is invented here.

Payment confirmation, purchase creation, exact entitlement grant, report claim, automatic generation, and report retry continue to use the frozen edition identity. The purchased-analysis library groups newly purchased editions with historical editions without overwriting old reports.

## Purchase-Facing Status

Catalog status and product detail now project current-edition ownership rather than treating any historical edition as ownership of the current sale. A customer who owns an older edition sees the ordinary existing purchase route for the current analysis. A customer who owns the current edition sees the existing owned/report state.

Interested analyses remain product-level and continue to derive their current-edition ownership independently. Refund and revocation keep their existing exact-edition behavior: revoking one edition does not alter another, and a revoked current edition no longer counts as active ownership.

## Verification

- Focused exact-edition activation regression passed.
- Purchase persistence, report persistence, automatic generation, multi-edition history, auto-refresh, refund/reconciliation, profile, interest, catalog, checkout, and order-freeze regressions passed.
- Human review passed: the new September edition appeared first in the same product group while the completed August edition remained accessible independently.
- Local review fixtures were removed after review.

## Scope

No pricing, catalog membership, adult verification policy, interest identity, purchased-history semantics, refund semantics, or report identity changed. No new migration was introduced by this step; migration 032 was already active from pre-sale hardening.
