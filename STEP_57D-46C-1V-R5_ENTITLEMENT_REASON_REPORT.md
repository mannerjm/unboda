# STEP 57D-46C-1V-R5 ENTITLEMENT REASON REPORT

## Current Model

`public.entitlements` already has `revoked_at` and `revocation_reason` fields from the existing refund foundation. Revocation is an idempotent update from `is_active = true` to `is_active = false`; the purchase row is not deleted.

Evidence:

- `supabase/migrations/020_toss_refund_workflows.sql`
- `app/lib/purchases/server.ts`
- `supabase/migrations/023_refund_claim_fenced_entitlement_revoke.sql`

## Whether Separation Already Existed

The storage column existed, but the server API did not enforce a distinct reason contract:

- the refund function accepted an arbitrary caller-supplied string;
- the claim-token RPC stored the supplied reason;
- there was no account-closure-specific revoke function.

Therefore reason separation was **not complete** at the application contract boundary.

## Defect and Root Cause

Defect: refund and account-closure causes were not represented by a constrained server-side reason model.

Root cause: `revokeEntitlementForRefund()` exposed a free-form `reason` parameter, while account-closure revocation had no dedicated API.

## Files Changed

- `app/lib/purchases/server.ts`
  - added `EntitlementRevocationReason`;
  - added shared idempotent revoke implementation;
  - fixed refund path to always use `REFUND_CANCELLATION`;
  - added account-closure path using `ACCOUNT_CLOSURE`.
- `scripts/account-lifecycle-foundation-regression.ts`
  - added static checks for both reasons and provider independence.
- `STEP_57D-46C-1_IMPLEMENTATION_REPORT.md`
  - updated the C-1 implementation record.
- `STEP_57D-46C-1V-R5_ENTITLEMENT_REASON_REPORT.md`
  - this report.

No migration was required because `revocation_reason text` already exists. No historical purchase or entitlement rows were rewritten.

## Exact Reason Model

```text
REFUND_CANCELLATION
ACCOUNT_CLOSURE
```

`revokeEntitlementForRefund()` is fixed to `REFUND_CANCELLATION`.

`revokeEntitlementForAccountClosure()` is fixed to `ACCOUNT_CLOSURE`.

Neither reason is inferred from profile birth data or payment provider identity.

## Idempotency Behavior

The shared revoke update includes `is_active = true`:

- first call deactivates the entitlement and records its reason/timestamp;
- repeated calls find no active row and return `null`;
- repeated calls do not overwrite the original reason;
- repeated calls do not duplicate destructive effects;
- purchase rows remain present;
- the two causes cannot convert into one another through the public wrappers.

## No Payment-Side Effect

`revokeEntitlementForAccountClosure()` performs only an entitlement update. It:

- does not call Toss cancellation;
- does not create a refund workflow;
- does not mark a refund completed;
- does not alter payment amount/status;
- does not delete purchase evidence.

## Refund Compatibility

The claim-token refund reconciliation path remains unchanged. It still uses the existing `revoke_refund_entitlement` RPC and receives the explicit refund reason from `completeRefund` through the fixed refund wrapper contract. Existing stale-worker fencing and refund reconciliation behavior are not redesigned.

## Regression

Manual regression to run:

```text
npx.cmd tsx scripts/account-lifecycle-foundation-regression.ts
```

Existing relevant refund regressions should remain unchanged and may be run manually by the operator:

```text
npx.cmd tsx scripts/r10d-stale-worker-fencing.ts
npx.cmd tsx scripts/r10e-retry-exhaustion-mismatch-matrix.ts
```

This task did not run commands through the Copilot terminal. Editor diagnostics report no errors for the changed source and regression.

## Final Status

`REFUND REVOCATION DISTINCT: YES`

`ACCOUNT CLOSURE REVOCATION DISTINCT: YES`

`ACCOUNT CLOSURE IMPLIES PROVIDER REFUND: NO`

`REVOCATION IDEMPOTENT: YES`

`PURCHASE EVIDENCE PRESERVED: YES`

`MANUAL REGRESSION REQUIRED: YES`

`READY FOR C-2: NO`
