# STEP 57D-45D-R10A-R2 — RETRY-DUE BOUNDARY PROOF

## Final Decision

**C. TEST EXPECTATION WAS WRONG — RETRY-DUE PROOF STILL INCOMPLETE**

The first-worker failure already produced durable `REFUND_FAILED_RETRYING` state with a future `next_retry_at`. The original assertion incorrectly expected an immediate automatic claim. The focused regression was corrected to distinguish direct DB rediscovery from due-claim eligibility, but fresh TypeScript output was unavailable in this session.

## Durable Intermediate Interpretation

Observed owner runtime evidence:

- event: `refund_reconciliation_retry`
- operational class: `RETRY_PENDING`
- attempt: `1`
- `nextRetryAt`: `2026-08-26T07:33:24.327Z`
- failure event time: approximately `2026-08-26T07:31:24Z`

This is correct bounded backoff behavior. The workflow exists in the database but is not automatically claimable until `next_retry_at <= now` and its prior lease has expired.

## Test Correction

`scripts/r10a-persistence-failure-recovery.ts` now:

1. asserts the intermediate workflow exists
2. asserts the retry status/provider evidence
3. asserts `nextRetryAt` is in the future
4. calls `listRefundWorkflowsForReconciliation` and asserts the future workflow is not claimed
5. advances only synthetic `next_retry_at` and `reconciliation_claim_expires_at` metadata
6. performs a fresh claim/reconciliation
7. retains the existing final purchase/access/idempotency assertions

No payment amount, provider truth, purchase, or entitlement state is patched.

## TypeScript Result

The required command was issued:

```text
npx.cmd tsc --noEmit --pretty false
```

The shared terminal remained in a PowerShell `>>` continuation state and returned no exit code or compiler output. Fresh TypeScript PASS is therefore not claimed.

## Runtime Result

The corrected focused R10A regression was not run because TypeScript output was unavailable. Fresh-worker recovery remains unverified in this session.

## Safety

- Toss contacted: **NO**
- Evidence `54321` accessed: **NO claimed**
- Production/shared Supabase contacted: **NO**
- Provider cancellation calls: **0 claimed**
- Real payment/order: **NO**
- Historical TEST order mutation: **NO**
- Manual financial DB patch: **NO**
- Commit/push: **NO**
- R10B: **NO**
- Scheduler: **NO**

## Files Changed

- `scripts/r10a-persistence-failure-recovery.ts`
- `STEP_57D-45D-R10A-R2_RETRY_DUE_BOUNDARY_PROOF.md`

## Exact Next Action

From a genuinely fresh terminal, run `npx.cmd tsc --noEmit --pretty false`. If clean, run only `npx.cmd tsx scripts/r10a-persistence-failure-recovery.ts`. Require direct DB rediscovery, before-due claim exclusion, due claim/recovery, final `REFUND_COMPLETED`, purchase `1`, effective entitlement `0`, zero cancellation calls, idempotency, and cleanup baseline before declaring A. Do not start R10B or scheduler.
