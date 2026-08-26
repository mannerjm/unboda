# STEP 57D-45D-R10D — STALE-WORKER FENCING DB PROOF

## 1. Final Decision

**B. STALE-WORKER FENCING PRODUCTION BLOCKER**

Claim-token fenced mutation primitives were added, but the required TypeScript and disposable DB regression could not be executed because the shared terminal remained in a PowerShell `>>` continuation state. No stale-worker proof is claimed.

## 2. Implementation

Added claim-owned mutation paths:

- provider evidence update guarded by claim token
- retry update guarded by claim token
- owner escalation update guarded by claim token
- final completion guarded by claim token
- entitlement revocation guarded atomically by a claim-token-aware PostgreSQL RPC

The existing normal production recovery path remains claim-token based. No provider verification was weakened.

## 3. Migration

Added local-only migration 023:

- `supabase/migrations/023_refund_claim_fenced_entitlement_revoke.sql`
- atomic `revoke_refund_entitlement(order_id, claim_token, reason)` RPC
- service-role-only execute privilege

The migration has not been applied in this step because the required validation terminal was unavailable.

## 4. Required Runtime Proof

Not executed:

- Worker A claim token
- lease expiry
- Worker B new claim token
- stale provider evidence write
- stale retry update
- stale escalation update
- stale entitlement revoke
- stale final completion
- valid Worker B completion
- post-completion stale write
- cleanup baseline

## 5. TypeScript Result

Issued:

```text
npx.cmd tsc --noEmit --pretty false
```

No exit code or compiler output was returned because the shared terminal remained in `>>` continuation mode. Fresh TypeScript PASS is not claimed.

## 6. Safety

- Disposable target intended: `http://127.0.0.1:55321`
- Toss network: **NO**
- Provider cancellation: `0`
- Real payment/order: **NO**
- Evidence `54321`: **NO claimed**
- Production/shared Supabase: **NO**
- Historical TEST order: **NO mutation**
- Manual financial DB patch: **NO**
- Commit/push: **NO**
- Retry exhaustion: **NO**
- Scheduler: **NO**
- STEP 57D-46: **NO**

## 7. Files Changed

- `app/lib/refunds/server.ts`
- `app/lib/purchases/server.ts`
- `supabase/migrations/023_refund_claim_fenced_entitlement_revoke.sql`
- `STEP_57D-45D-R10D_STALE_WORKER_FENCING_DB_PROOF.md`

## 8. Remaining Blocker

Migration 023 must be applied to disposable Supabase, then a dedicated R10D DB regression must prove every stale token mutation is rejected/no-op while the current token can complete. TypeScript and focused regressions must pass first.

## 9. Exact Next Action

From a genuinely fresh terminal, apply migration 023 to the disposable environment only, run TypeScript, and execute a dedicated `scripts/r10d-stale-worker-fencing.ts` regression. Do not access evidence `54321`, contact Toss, start retry exhaustion, scheduler, or STEP 57D-46.
