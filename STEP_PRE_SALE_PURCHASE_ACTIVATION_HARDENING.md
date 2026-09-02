# Pre-Sale Purchase Activation Hardening

## Purpose

This phase closes two blockers before any exact-edition repurchase activation: concurrent fresh orders for the same commercial edition and mandatory manual report generation after payment.

## Pending-Order Race and Idempotency

Previously, `createPendingOrder()` applied the global active-entitlement guard and then inserted a pending order. Two concurrent fresh requests could both pass before either payment created an entitlement.

Migration `032_active_edition_order_uniqueness.sql` adds a partial unique index over `user_id + profile_id + product_id + analysis_edition_key` for orders in `pending` or `paid` status. Newly created orders always have a known, non-LEGACY edition key. Historical NULL and LEGACY rows are intentionally excluded because their exact historical edition cannot be proven and existing historical data may contain duplicates.

On a unique collision, the server reloads the exact active order. A pending order is safely returned for reuse. A paid order is rejected as already paid. Failed and canceled orders are outside the partial index and allow a new safe attempt. The current order lifecycle has no explicit expiry status or expiry timestamp, so this phase does not invent expiry behavior.

The P0 global active-entitlement guard remains in place and still blocks any new order for a product already actively owned by the same profile. New-edition repurchase remains disabled.

## Payment Confirmation Idempotency

Payment confirmation continues to use the existing idempotency boundaries:

- Paid orders are replay-safe.
- Purchases are unique by order.
- Entitlements are upserted by exact user/profile/resource/type/edition identity.
- Paid reports are claimed by exact user/profile/product/edition identity.

A confirmation replay for an already-paid order now also replays purchase, entitlement, and report preparation. This heals a partial persistence interruption without creating new financial or report identities.

## Automatic Report Generation

After payment truth is confirmed, purchase creation and entitlement grant succeed first. The exact purchased report is then claimed durably and scheduled with `after()` so payment completion does not wait for AI work or become contingent on its success.

Generation uses only the frozen purchase `analysis_edition_key`, `analysis_reference_snapshot`, and `analysis_input_snapshot`. It rechecks the exact active entitlement and account lifecycle before expensive computation and again before report publication. A refund/revocation or account closure during generation therefore cannot publish or restore access to the report.

AI generation failure marks the report failed through the existing retryable report lifecycle. It does not roll back payment, entitlement, or financial truth and does not automatically refund.

## Customer Preparation Experience

Normal paid customer surfaces now show preparation-oriented status:

- `분석 준비 중`
- `분석을 준비하고 있어요`
- `분석 완료`

A normal paid customer is no longer asked to press `심층 분석 생성하기` as a required post-payment action. Existing report-generation endpoints remain available for exceptional recovery and retry behavior.

## Purchased-Library Automatic Refresh

`PurchasedAnalysesAutoRefresh` refreshes only the server-backed purchased-analysis page while at least one visible edition is `none` or `generating`. It uses a four-second interval, skips hidden-browser-tab ticks, clears its interval on unmount, and stops automatically when every visible edition is `completed` or `failed`.

Refreshes run through `router.refresh()` only. They do not claim reports, start generation, mutate financial state, or establish client-side entitlement truth. A transition guard prevents overlapping refreshes while a prior server refresh is pending. Each refresh preserves active-profile filtering, exact edition grouping, and active-entitlement revocation exclusion.

Human review passed the customer transition from `분석 준비 중` / `분석을 준비하고 있어요` to `분석 완료` / `분석 결과 보기` after the server report became completed, without a manual browser reload.

## Remaining Activation Step

This phase does not enable exact-edition purchase activation or new-edition repurchase. The next step is to validate the full pending-order lifecycle under payment-provider failure and retry conditions, then activate the exact-edition purchase guard only after those controls are proven.
