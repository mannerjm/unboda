# STEP 57D-45D-R10E — RETRY EXHAUSTION + FULL FINANCIAL MISMATCH MATRIX

## Final Decision

**A. RETRY EXHAUSTION + FINANCIAL MISMATCH MATRIX VERIFIED**

## Environment and Safety

All fixtures ran against disposable Supabase only: `http://127.0.0.1:55321`.

- Toss network: not contacted
- Provider cancellation calls: `0`
- New real payment/order: none
- Historical TEST order: unchanged
- Evidence Supabase `54321`: not accessed
- Production/shared Supabase: not accessed
- Manual financial DB patch: none
- Commit/push: none
- Scheduler: not started
- STEP 57D-46: not started

## Retry Budget

Fixture: `R10E_RETRYABLE_FAILURE`.

1. A mocked retryable provider lookup failure transitioned the workflow to `REFUND_FAILED_RETRYING`.
2. `retry_count` incremented to `1`.
3. `last_attempt_at` was populated.
4. `next_retry_at` was persisted after the attempt and was later than the attempt time.
5. While `next_retry_at` was in the future, automatic claim excluded the workflow and did not change its retry count or status.
6. Synthetic scheduling metadata alone was advanced to make the workflow due. No provider or financial operation was used for this advance.
7. A due reclaim succeeded and the second retryable failure recorded retry count `2` and a subsequent backoff timestamp.
8. At the configured ceiling, the workflow transitioned to `OWNER_REVIEW_REQUIRED`.
9. The exhausted workflow was excluded from future automatic claims.

Result:

- `retryExhaustion = verified`
- `ownerReviewExclusion = verified`
- `notDueExclusion = verified`
- `dueReclaim = verified`
- No completion occurred and no entitlement mutation occurred.

## Financial Mismatch Matrix

Each case used an independent paid order with local authoritative amount `16900`, currency `KRW`, one purchase, and one active entitlement. Provider responses were mocked locally. Every case preserved the purchase and active entitlement and did not reach `REFUND_COMPLETED`.

| Case | Provider contradiction | Result |
|---|---|---|
| Amount mismatch | Canceled amount and total amount differed from `16900` | Fail closed / owner review |
| Currency mismatch | Provider currency was `USD` | `OWNER_REVIEW_REQUIRED` |
| Order reference mismatch | Provider order reference differed from internal order ID | `OWNER_REVIEW_REQUIRED` |
| Provider still `DONE` | No cancellation proof | `OWNER_REVIEW_REQUIRED` |
| Cancellation status not `DONE` | Cancellation detail was `PENDING` | `OWNER_REVIEW_REQUIRED` |
| `PARTIAL_CANCELED` | Partial cancellation only | `OWNER_REVIEW_REQUIRED` |
| Under-refund | Canceled amount was below full paid amount | `OWNER_REVIEW_REQUIRED` |
| Malformed evidence | Missing cancellation evidence / malformed provider shape | Fail closed through retryable lookup handling; no completion or entitlement revoke |

Result:

- `mismatchMatrix = verified`
- `purchaseCount = 1` for every mismatch fixture
- `effectiveEntitlementCount = 1` for every mismatch fixture
- No false entitlement revoke
- No false `REFUND_COMPLETED`
- `providerCancellationCalls = 0`

The malformed case is intentionally treated as unverified lookup evidence. It remains retryable under the existing policy rather than being interpreted as a successful cancellation; retry exhaustion escalates to owner review.

## Observability

The run emitted safe events for:

- `refund_reconciliation_retry`
- `refund_retry_budget_exhausted`
- reconciliation start/convergence context

Events contained internal IDs, hashed profile references, and correlation IDs only. No full payment key, secret, authorization header, raw provider payload, or card/bank data was logged.

## Cleanup

Only R10E synthetic fixtures were removed. Disposable financial counts returned to the required baseline:

- orders: `0`
- purchases: `0`
- entitlements: `0`
- toss_payment_records: `0`
- refund_workflows: `0`

## Validation

- `npx.cmd tsc --noEmit --pretty false`: **PASS**
- `npx.cmd tsx scripts/r10e-retry-exhaustion-mismatch-matrix.ts`: **PASS**
- disposable cleanup count query: **PASS**
- touched-file diagnostics: **PASS**
- `git diff --check`: **PASS**

## Scope Boundary

R10A-R10D were not reopened. Scheduler, retry scheduler HTTP behavior, and STEP 57D-46 were intentionally not started.
