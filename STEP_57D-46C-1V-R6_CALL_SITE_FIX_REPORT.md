# STEP 57D-46C-1V-R6 CALL-SITE FIX REPORT

## Failing Call Site

The production build reported an outdated argument at `app/lib/refunds/server.ts:111`:

```text
reason does not exist in type ...
```

The stale calls were inside `completeRefund()`:

- claim-token path passed `reason: workflow.reasonCategory`;
- non-claim path passed `reason: workflow.reasonCategory`.

## Root Cause

R5 changed `revokeEntitlementForRefund()` so refund entitlement revocation owns its reason internally. The helper no longer accepts arbitrary caller-provided reason text and always records:

`REFUND_CANCELLATION`

The refund workflow's `reasonCategory` remains valid workflow evidence and continues to be used for refund policy/provider cancellation diagnostics. It must not control `entitlements.revocation_reason`.

## Files Changed

- `app/lib/refunds/server.ts`
  - removed `reason: workflow.reasonCategory` from both refund-specific helper calls;
  - preserved `userId`, `profileId`, `productId`, `orderId`, and `claimToken`.
- `scripts/r10d-stale-worker-fencing.ts`
  - removed the same stale reason argument from the claim-fenced regression call;
  - preserved the stale claim token fencing scenario.
- `STEP_57D-46C-1V-R6_CALL_SITE_FIX_REPORT.md`
  - this report.

No migration, account lifecycle, eligibility, payment, Toss, provider, or refund workflow business rule was changed.

## All Stale Calls Checked

Repository search for `revokeEntitlementForRefund` and `reason: workflow.reasonCategory` found:

- declaration in `app/lib/purchases/server.ts`;
- two corrected calls in `app/lib/refunds/server.ts`;
- one corrected stale-worker regression call in `scripts/r10d-stale-worker-fencing.ts`.

No remaining refund-specific call passes a `reason` property.

## Reason Contract

Refund entitlement revocation is canonical:

`REFUND_CANCELLATION`

Account-closure entitlement revocation remains separate:

`ACCOUNT_CLOSURE`

The account-closure wrapper does not call Toss, create a refund workflow, or mark a refund completed.

## Refund Diagnostics Preserved

`workflow.reasonCategory` remains part of the refund workflow model and is not deleted or rewritten. It can continue to represent the customer's refund reason and provider cancellation reason input where applicable.

It simply no longer controls the entitlement audit reason.

## Validation

Editor diagnostics report no errors for:

- `app/lib/refunds/server.ts`
- `app/lib/purchases/server.ts`
- `scripts/r10d-stale-worker-fencing.ts`

The human operator should rerun the production build manually. No Copilot terminal command was run for this step.

`STALE REFUND REVOCATION CALLS REMAIN: NO`

`REFUND ENTITLEMENT REASON: REFUND_CANCELLATION`

`ACCOUNT CLOSURE ENTITLEMENT REASON: ACCOUNT_CLOSURE`

`READY FOR HUMAN BUILD RE-RUN: YES`
