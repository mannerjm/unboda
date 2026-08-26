# STEP 57D-45D-R10D-R8 — VALID WORKER-B DIRECT RPC PROOF

## 1. Final Decision

**A. VALID WORKER-B RPC VERIFIED**

The live disposable migration 023 contract was verified, a self-contained Worker A/B fixture was created, the valid Worker B entitlement-revoke RPC was executed exactly once, and the stale Worker A RPC was a no-op. The full R10D reconciliation regression was intentionally not run.

## 2. Live RPC Contract

- target: `http://127.0.0.1:55321`
- disposable identity: verified
- live RPC exists: `true`
- signature: `target_order_id uuid, claim_token uuid, reason text`
- return type: `SETOF entitlements`
- migration 023 function body: present
- security definer: `true`

## 3. Worker B Pre-RPC State

- workflow exists: `true`
- Worker A claim present: `true`
- Worker B claim present: `true`
- claim token changed: `true`
- Worker B token matches DB: `true`
- lease valid: `true`
- entitlement exists: `true`
- entitlement active before RPC: `true`
- purchase count: `1`
- internal workflow status: `REFUND_PROCESSING`

No full claim token was printed.

## 4. Valid Worker B Direct RPC

The real disposable `public.revoke_refund_entitlement` RPC was called exactly once using Worker B's current token.

- `rpcSuccess`: `true`
- error code: none
- safe error message: none
- returned row count: `1`
- entitlement revoked: `true`
- `revoked_at` populated: `true`

The reason was a safe internal test reason. No amount, provider status, or customer payment data was supplied to the RPC.

## 5. Stale Worker A Negative Check

The same RPC path was called with Worker A's stale token after Worker B's valid revoke.

- stale RPC returned row count: `0`
- stale RPC error: none
- no second entitlement mutation: `true`
- stale no-op: `true`

## 6. Cleanup

The synthetic fixture was removed in `finally`. Disposable financial baseline after cleanup:

- orders: `0`
- purchases: `0`
- entitlements: `0`
- toss_payment_records: `0`
- refund_workflows: `0`

## 7. Validation

- TypeScript: **PASS**
- focused R10D-R8 trace: **PASS**
- disposable cleanup query: **PASS**
- full R10D reconciliation: intentionally not run
- retry exhaustion: not run
- mismatch matrix: not run
- scheduler: not run

## 8. Safety

- Toss contacted: **NO**
- Real cancellation calls: **0**
- Evidence Supabase `54321`: **NO**
- Production/shared Supabase: **NO**
- Real payment/order: **NO**
- Historical TEST order: **NO**
- Manual financial DB patch: **NO**
- Commit/push: **NO**

## 9. Files Changed

- `scripts/r10d-rpc-boundary-trace.ts`
- `STEP_57D-45D-R10D-R8_VALID_WORKER_B_RPC_PROOF.md`

## 10. Exact Next Action

The valid Worker B direct RPC boundary is verified. Do not run full R10D, retry exhaustion, scheduler, R10E, or STEP 57D-46 automatically. The next controlled step may use this verified primitive for the separately authorized stale-worker full mutation regression.

## R10D-R8 Execution Confirmation

The focused trace was executed after TypeScript passed. Runtime output confirmed the live RPC contract, Worker A/B claim transition, Worker B token/DB match, valid lease, active entitlement, and purchase count `1`. The valid Worker B RPC returned one revoked entitlement with `revoked_at` populated. The stale Worker A RPC returned zero rows and was a no-op.

The disposable cleanup query returned zero rows in orders, purchases, entitlements, toss payment records, and refund workflows. No full R10D reconciliation, retry exhaustion, scheduler, R10E, or STEP 57D-46 was started.
