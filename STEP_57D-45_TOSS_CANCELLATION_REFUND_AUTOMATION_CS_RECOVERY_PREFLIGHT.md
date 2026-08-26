# STEP 57D-45 — TOSS CANCELLATION / REFUND AUTOMATION + CS RECOVERY PREFLIGHT

## 1. Final Decision

**B. PASS WITH OWNER POLICY BLOCKER**

The repository has a verified Toss TEST payment confirmation foundation, but cancellation/refund automation cannot be safely implemented or executed yet because the business policy required to determine entitlement and report behavior is undefined.

No Toss cancellation/refund request was made. No database write was performed.

## 2. Existing Support Inventory

Present:

- Toss TEST confirmation using Basic authentication and the corrected API-individual `test_ck_` + `test_sk_` contract.
- Server-authoritative paid-order confirmation.
- `orders` with `pending`, `paid`, `failed`, and `canceled` statuses.
- `toss_payment_records` with provider identity, confirmation evidence, reconciliation status, retry budget, and confirmation-failure diagnostics.
- Purchase persistence with one purchase per order.
- Profile-scoped active entitlement lookup and idempotent entitlement grant.
- Local reconciliation worker for unresolved Toss confirmation states.
- Redacted payment observability events.
- Official contract notes for Toss cancellation: `POST /v1/payments/{paymentKey}/cancel`, Basic auth, required `cancelReason`, optional `cancelAmount`, and provider `CANCELED` / `PARTIAL_CANCELED` states.

Missing:

- Cancellation/refund provider client.
- Customer-facing cancellation route.
- Internal CS/admin cancellation authorization path.
- Durable cancellation/refund record or cancellation lifecycle fields.
- Entitlement revocation operation.
- Refund reconciliation worker.
- Cancellation idempotency key/recording and provider-side duplicate handling.
- CS ticket, FAQ, exception queue, or customer refund-status automation.
- Cancellation/refund observability events.

Dangerous partial implementation: **NONE FOUND.** There is no cancellation route or provider cancellation call to accidentally expose. The existing `canceled` order enum is not a refund implementation.

Entitlement revocation: **ABSENT.**

Partial refunds: **ABSENT.**

## 3. Refund/Cancel Business Policy

The repository's current refund document explicitly marks refund automation as unimplemented and says the technical design is not legal advice. It does not define the following decisions:

- Full cancellation eligibility before content consumption.
- Full refund eligibility after entitlement issuance.
- Refund eligibility window.
- Whether entitlement is revoked immediately after provider cancellation or after internal settlement.
- Whether generated paid reports remain viewable after a full refund.
- Whether a consumed/generated report changes refund eligibility.
- Partial refund rules, minimum/maximum amounts, or entitlement treatment.
- Duplicate cancellation request behavior as a commercial policy.
- Chargeback/dispute handling and access treatment.

These are **OWNER POLICY BLOCKERS**. No entitlement or report behavior was guessed or changed.

## 4. Owner Policy Blockers

Before implementation, owner must explicitly decide:

1. Full refund before report generation: allowed or rejected, and whether access is revoked.
2. Full refund after report generation: allowed or rejected, and whether the report remains viewable.
3. Refund eligibility window and consumed-content rule.
4. Partial refund support: unsupported initially, or supported with exact amount/entitlement behavior.
5. Provider-already-cancelled treatment.
6. Chargeback/dispute treatment.
7. Whether cancellation is customer self-service, privileged CS-only, or both.

## 5. Toss Cancellation API Contract

The repository's official Toss contract records:

```text
POST https://api.tosspayments.com/v1/payments/{paymentKey}/cancel
Authorization: Basic base64(secretKey:)
Content-Type: application/json
```

Full cancellation request:

```json
{ "cancelReason": "..." }
```

Partial cancellation request additionally supplies:

```json
{ "cancelReason": "...", "cancelAmount": 1000 }
```

`cancelReason` is required and has a maximum length of 200 characters. A successful response contains payment status and a `cancels` entry with `transactionKey`, `cancelStatus`, `cancelAmount`, `canceledAt`, and `refundableAmount`. Full cancellation is represented by `CANCELED`; partial cancellation by `PARTIAL_CANCELED`.

Authentication uses the server-only Toss secret. TEST compatibility is expected with the matching API-individual TEST pair, but no cancellation API call was made in this step. Provider idempotency and already-cancelled response semantics require a mocked contract test and official-provider verification before production use.

## 6. Authorization Model

Required design, not yet implemented:

- Customer route requires an authenticated session.
- Customer must own the order and profile.
- Internal CS/admin route requires an explicit server-side privileged role and audit identity.
- Order must be paid and use Toss.
- Stored provider payment identity must exist.
- Stored provider order reference and confirmed amount must match the internal order.
- Cancellation amount must be server-derived and cannot exceed the confirmed/refundable amount.
- Client cannot choose entitlement revocation or trusted refund amount.
- Production/live operation must fail closed unless separately authorized and configured.

## 7. Data Model/Schema

Current schema has no cancellation/refund record. A future minimum local migration should preserve the original confirmation identity and add a separate lifecycle record with:

- order ID and provider payment identity
- requested/confirmed/cancelled amount
- remaining amount
- cancellation reason
- provider cancellation transaction key
- provider status and safe error code/message
- requested/started/confirmed timestamps
- retry count and next retry time
- reconciliation status
- correlation ID
- requester/audit reference

No migration was added or applied in this step.

## 8. Full Cancellation Flow

Not implemented pending owner policy:

`paid order` -> eligibility and consumption policy check -> authenticated authorization -> server loads stored payment identity -> provider cancellation -> verify provider terminal status and amount -> persist separate cancellation evidence -> revoke entitlement according to policy -> preserve purchase/payment history -> reconcile any partial internal failure -> expose mapped CS status.

## 9. Partial Refund Support/Status

**Not supported.** The provider contract describes `cancelAmount`, but application policy, remaining balance rules, entitlement behavior, and report access behavior are undefined. No partial refund route or client was added.

## 10. Entitlement Behavior

**OWNER POLICY BLOCKER.** The current application grants active access after purchase, but has no revoke function. It is not safe to decide whether full cancellation should deactivate the entitlement until the owner decides the refund/access policy.

## 11. Paid Report Behavior After Refund

**OWNER POLICY BLOCKER.** Existing `paid_reports` stores generated report state, while access is controlled by active entitlement. The repository does not define whether a generated report remains viewable after refund. No report deletion or access change was made.

## 12. Idempotency

Not implemented for cancellation. Required behavior is to persist a cancellation attempt before/around the provider call, recognize the same order/provider cancellation identity, avoid duplicate provider side effects where provider state is already terminal, and converge duplicate requests to one final internal cancellation record. This requires a cancellation record and owner policy.

## 13. Failure-Injection Cases

Not run because no cancellation service exists. Required future cases are provider success/internal persistence failure, provider success/entitlement revoke failure, duplicate request, already-cancelled provider state, transient 5xx/network failure, amount/reference mismatch, unauthorized order, and process interruption.

## 14. Reconciliation Behavior

Confirmation reconciliation exists. Refund/cancellation reconciliation does not. It must separately distinguish provider cancellation evidence from internal entitlement/report persistence and must never retry indefinitely.

## 15. Retry/Backoff

Confirmation retry metadata exists, but no refund retry budget or backoff exists. A future refund record must use bounded retries and terminal owner escalation for provider contradiction or exhausted internal convergence.

## 16. Owner Escalation Rules

Future owner escalation is required for provider/internal contradiction, duplicate-charge or duplicate-refund suspicion, unknown provider state, unsupported partial refund, chargeback/dispute, and exhausted bounded retries. Policy ambiguity itself is an owner blocker and is the current state.

## 17. CS Status Model

No CS automation currently exists. Proposed contract, pending implementation:

- `REFUND_REQUESTED`: 환불 요청이 접수되었습니다.
- `REFUND_PROCESSING`: 환불 상태를 확인하고 있습니다.
- `REFUND_COMPLETED`: 환불 처리가 완료되었습니다.
- `REFUND_FAILED_RETRYING`: 일시적인 문제로 환불을 자동 재처리하고 있습니다.
- `OWNER_REVIEW_REQUIRED`: 추가 확인이 필요한 환불 상태입니다.

Provider codes must remain internal and be mapped to these safe messages.

## 18. Customer-Facing Messages

The messages above are a proposed safe interface only. Runtime CS integration is absent. The system must answer request status, expected processing state, cancellation/access contradiction, duplicate request, and retry state without exposing provider payloads or secret data.

## 19. Observability

The following cancellation events are not currently implemented:

- `payment_cancellation_requested`
- `payment_cancellation_started`
- `payment_cancellation_confirmed`
- `payment_cancellation_failed`
- `entitlement_revocation_started`
- `entitlement_revoked`
- `refund_reconciliation_retry`
- `refund_owner_escalation_required`

They should carry only order/product/profile-safe references, provider status/code, amount class, retryability, correlation ID, and timestamps. Never log full paymentKey, raw provider payload, card/bank data, secret, or Authorization header.

## 20. Real Toss TEST Cancellation Executed?

**NO.** Explicitly not executed. The successful TEST order was not cancelled.

## 21. Provider Cancellation Result

Not applicable. No Toss cancellation request was made.

## 22. Internal DB Result

No database write was performed. Successful order remains paid and untouched.

## 23. Purchase History Preservation

Not tested. No purchase row was deleted or modified.

## 24. Entitlement Result

Not tested. No entitlement was revoked or modified.

## 25. Paid Report Access Result

Not tested after cancellation because cancellation was not executed. Baseline paid access remains unchanged.

## 26. Duplicate Cancellation Result

Not tested. No cancellation request exists.

## 27. Regressions

Not run because this preflight intentionally stops at the owner policy blocker before code implementation. Existing confirmation, payment observability, reconciliation, profile-scoped purchase, paid-report, pricing, and local-target validations remain the relevant baseline; no cancellation regression exists yet.

## 28. Files Changed

- `STEP_57D-45_TOSS_CANCELLATION_REFUND_AUTOMATION_CS_RECOVERY_PREFLIGHT.md`

## 29. Schema Changes

None.

## 30. Side Effects

- Toss cancellation/refund calls: `0`
- New payment/order: `0`
- Existing successful order modified: **NO**
- Purchase/entitlement writes: `0`
- Refund/cancel implementation: **NOT ADDED**
- Refund/cancel policy guessed: **NO**
- DB manual patch: **NO**

## 31. Live Toss Contacted?

**NO.**

## 32. Production/Shared DB Contacted?

**NO.** Local repository inspection only; no remote or production database access.

## 33. Production Payment Activated?

**NO.**

## 34. Production V4 Activated?

**NO.**

## 35. Commit/Push?

Commit: **NO**

Push: **NO**

## 36. Remaining Blockers

The owner must define the full-refund, partial-refund, eligibility-window, consumed/generated-report, entitlement-revocation, duplicate-request, already-cancelled, and chargeback policies. CS runtime automation and cancellation reconciliation are also absent.

## 37. Exact Next Action

Owner must approve the written cancellation/refund policy decisions above. After policy approval, implement and locally regression-test the cancellation service and schema using mocked provider responses. Only after those tests pass should the system stop at `REAL TEST CANCELLATION READY` for explicit owner approval. Do not execute real Toss TEST cancellation in this step.
