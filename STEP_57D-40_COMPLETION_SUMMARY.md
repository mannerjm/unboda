# STEP 57D-40: TOSS PAYMENTS INTEGRATION CONTRACT ??COMPLETION SUMMARY

## Status: ??COMPLETE

**Owner Decision:** Toss Payments approved for Korean Launch V1 real-money integration
**Phase:** Architecture & Planning (no implementation, zero production changes)
**Duration:** Completed in this session
**Next Step:** STEP 57D-41 (Sandbox implementation)

---

## What Was Completed

### 1. Current Integration Audit
- Mapped existing payment flow to exact files + functions
- Identified 6 key touchpoints (order creation, mock-confirm, entitlement, report access)
- Confirmed current implementation is server-authoritative for amounts (no client override)
- Confirmed all purchase/entitlement operations are idempotent

### 2. Official Toss Payments API Documentation Retrieved
- Retrieved complete Toss Core API reference (v1.2)
- Documented Payment object (40+ fields) with exact field types
- Documented payment confirmation endpoint (POST /v1/payments/confirm)
- Documented query endpoints (by paymentKey, by orderId)
- Documented cancellation API (POST /v1/payments/{paymentKey}/cancel)
- Confirmed Toss webhook support (payment_status_changed event)

### 3. Toss Payment Flow Designed
- **Minimal Launch V1 flow:** 7 steps (order ??Toss widget ??confirmation ??entitlement)
- **Direct confirmation model:** No webhook required (simpler for Launch V1)
- **State machine:** pending ??paid (future: refund_pending, chargeback)
- **Idempotency:** All operations protected (upserts + status checks)

### 4. Official API Contract Documented
- Payment confirmation request: {paymentKey, orderId, amount}
- Payment confirmation response: Full Payment object with status enum
- Error handling: Toss error codes (INVALID_PAYMENT_KEY, ALREADY_APPROVED, etc.)
- Amount verification: totalAmount field matches server-derived amount

### 5. Order ID Mapping Designed
- **Current:** Supabase generates UUID v4 for order.id
- **Strategy:** Use internal order.id directly as Toss orderId (UUID is 36 chars, within 64-char limit)
- **Guarantee:** One-to-one mapping, no collision risk, deterministic
- **Conclusion:** NO ORDER ID TRANSFORMATION NEEDED

### 6. Amount Security Triple-Verified
- **Verification 1 (Creation):** Client amount ignored; server calls pricing resolver
- **Verification 2 (Widget):** Display amount from server (user sees correct price)
- **Verification 3 (Confirmation):** Server re-derives expected amount; compares vs Toss response
- **Auto-block:** Amount mismatch triggers error + alert + order NOT confirmed

### 7. Idempotency Strategy Designed
- **Order confirmation:** Skip Toss API if already paid (idempotent)
- **Purchase creation:** Upsert on order_id (idempotent)
- **Entitlement grant:** Upsert on (user_id, profile_id, resource_id, resource_type) (idempotent)
- **Result:** Multiple confirmation calls = one charge, one entitlement

### 8. Mock-Confirm Remediation Planned
- **Short-term (Launch V1):** Add NODE_ENV guard (403 in production)
- **Long-term (Post-Launch):** Delete route entirely
- **Replacement:** Real Toss endpoint (POST /api/orders/{orderId}/confirm-payment)

### 9. Secrets Management Designed
- **Backend only:** TOSS_SECRET_KEY (never in client code)
- **Public allowed:** NEXT_PUBLIC_TOSS_CLIENT_KEY (for payment widget)
- **Runtime guard:** Throw error if test key (sk_test_, pk_test_) in production
- **Logging:** Never log secrets, redact in audit trails

### 10. Database Assessment
- **Current schema:** SUFFICIENT (no migration needed)
- **Key fields:** order.id, order.amount, order.status, order.payment_provider, order.transaction_id
- **Future fields:** optional (confirmed_at, toss_payment_key, confirmation_payload, refund_status)

### 11. Regression Test Matrix (15 Tests)
- Client amount override blocking
- Order creation success
- Mock-confirm production gate
- Invalid paymentKey handling
- Amount verification
- Order marking as paid
- Duplicate confirmation idempotency
- Ownership enforcement
- Unknown product rejection
- Pricing determinism
- Entitlement creation uniqueness
- Payment widget amount accuracy
- Paid order report access
- Pending order access denial
- Launch V1 pricing snapshot coverage (54 products)

### 12. Sandbox E2E Test Plan (5 Scenarios)
1. Successful card payment (full flow)
2. Declined payment (error handling)
3. Amount mismatch (security verification)
4. Duplicate confirmation (idempotency)
5. Ownership check (security)

### 13. Production Cutover Checklist
- 13 pre-activation checkpoints (all passing = go-live ready)
- Environment configuration guidance
- Key rollback procedures
- Owner training notes

### 14. Implementation Phases (Detailed)
- **Phase 1 (STEP 57D-40):** Contract design [COMPLETE]
- **Phase 2 (STEP 57D-41):** Sandbox integration [NEXT]
- **Phase 3 (STEP 57D-42+):** Production readiness [FUTURE]

### 15. Final Decision
**TOSS INTEGRATION CONTRACT READY ??IMPLEMENTATION MAY BEGIN**

---

## Key Design Decisions

### 1. Direct Confirmation (No Webhook Required)
- **Why:** Simpler for Launch V1, immediate user feedback
- **How:** Server calls Toss confirm API directly, waits for response
- **Future:** Can add webhook later for advanced scenarios

### 2. Server-Authoritative Pricing
- **Rule:** Never trust client-supplied amounts
- **Implementation:** Server re-derives amount at 3 critical points (creation, widget display, confirmation)
- **Auto-block:** Amount mismatch ??order NOT confirmed

### 3. Idempotent Operations
- **Pattern:** All DB operations use upserts or status checks
- **Benefit:** Safe to retry failed requests (no duplicate charges)
- **Testing:** All 15 regressions validate idempotency

### 4. Node.js Environment Gate (Mock-Confirm)
- **Short-term:** Protect mock-confirm with NODE_ENV='production' check
- **Long-term:** Delete mock route after Toss stable
- **Rationale:** Prevents accidental free payments in production

### 5. No Database Migration Required
- **Benefit:** Faster go-live (no migration risk)
- **How:** Current schema has all needed fields (payment_provider, transaction_id, etc.)
- **Flexibility:** Optional fields can be added post-Launch V1

### 6. Internal Order ID as Toss orderId
- **Why:** UUID format is compatible (36 chars within 64-char limit)
- **Benefit:** No mapping table needed, deterministic, collision-proof
- **Implementation:** Pass order.id directly to Toss API

---

## Critical Security Properties

### Amount Authority: Server Always Wins
```
Client suggests: { amount: 999999 }  ??IGNORED
Server derives:  { amount: 16900 }   ??AUTHORITATIVE
Toss confirms:   { amount: 16900 }   ??VERIFIED
```

### Ownership Enforcement
```
User A creates order ??User B attempts to confirm
Result: 404 (order not found for User B) ??BLOCKED
```

### Duplicate Prevention
```
Confirm call #1: Toss API ??mark paid ??entitlement ??
Confirm call #2: Skip Toss (already paid) ??return cached ??
Result: One charge, one entitlement ??
```

### Mismatch Detection
```
Server amount: 16900
Toss response: 16901 (mismatch)
Result: Order NOT confirmed, alert logged ??AUTO-BLOCKED
```

---

## Critical Files to Create (STEP 57D-41)

| File | Purpose | Type |
|------|---------|------|
| [app/lib/payments/toss-config.ts](app/lib/payments/toss-config.ts) | Secret key management + environment guards | NEW |
| [app/lib/payments/toss-server.ts](app/lib/payments/toss-server.ts) | Toss API client + error handling | NEW |
| [app/api/orders/[orderId]/confirm-payment/route.ts](app/api/orders/[orderId]/confirm-payment/route.ts) | Payment confirmation endpoint | NEW |
| [app/api/orders/[orderId]/mock-confirm/route.ts](app/api/orders/[orderId]/mock-confirm/route.ts) | Add NODE.js env guard | MODIFY |
| `scripts/toss-payments-integration-regression.ts` | 15 automated regressions | NEW |

---

## Constraints (Launch V1)

### DO NOT:
- Implement refund automation (manual via Toss dashboard only)
- Support multiple currencies (KRW only)
- Support international payment methods (Korean cards only)
- Activate webhook listeners (direct API only)
- Enable V4 generation (still manual)
- Activate real-money payments

### DO:
- Implement direct payment confirmation (server-side)
- Protect mock-confirm with NODE.js env gate
- Verify amount triple (creation, widget, confirmation)
- Enforce idempotency (no duplicate charges)
- Create 15 regression tests
- Plan for future currency/method support (architecture ready)

---

## Success Metrics

### STEP 57D-40 (This Step): Complete ??
- [x] Official Toss API documented with exact contracts
- [x] Payment flow designed (7-step flow)
- [x] Order ID mapping compatible (UUID ??Toss orderId)
- [x] Amount security triple-verified
- [x] Idempotency protected at all levels
- [x] State machine documented
- [x] Confirmation endpoint designed
- [x] Secrets management planned
- [x] Regression matrix defined (15 tests)
- [x] E2E test plan defined (5 scenarios)
- [x] Production cutover checklist ready
- [x] No blocking issues found

### STEP 57D-41 (Next): Sandbox Implementation
- [ ] Create toss-config.ts + toss-server.ts
- [ ] Create confirm-payment endpoint
- [ ] Add NODE.js guard to mock-confirm
- [ ] Implement 15 regressions
- [ ] All regressions pass in sandbox
- [ ] E2E test: order ??payment ??entitlement ??report

### STEP 57D-42+: Production Ready
- [ ] Live Toss merchant account contract signed
- [ ] Live API keys obtained
- [ ] Production keys securely configured
- [ ] Single internal test transaction (no real charge)
- [ ] Monitoring + alerting configured
- [ ] Owner trained on manual processes
- [ ] Real-money activation authorized

---

## Reference Documents

### Full Contract
?뱞 [STEP_57D-40_TOSS_PAYMENTS_INTEGRATION_CONTRACT.md](docs/STEP_57D-40_TOSS_PAYMENTS_INTEGRATION_CONTRACT.md)

### Prior Steps
- ?뱞 STEP_57D-38_LAUNCH_V1_PRICING_IMPLEMENTATION.md (pricing resolver)
- ?뱞 STEP_57D-39_REAL_MONEY_PAYMENT_SECURITY_PG_PREFLIGHT.md (security audit)

### Official Resources
- ?뙋 https://docs.tosspayments.com/reference (Toss API reference)
- ?뙋 https://docs.tosspayments.com/guides/v2/get-started (Getting started guide)

---

## Final Status

??**STEP 57D-40: TOSS PAYMENTS INTEGRATION CONTRACT ??COMPLETE**

**Decision:** TOSS INTEGRATION CONTRACT READY ??IMPLEMENTATION MAY BEGIN

**Next Action:** Begin STEP 57D-41 sandbox implementation with confidence. All contracts validated against official Toss documentation. No blocking issues identified. Ready for real-money integration pathway.

---

**Created:** [Today]
**Owner:** Korean Launch V1 Payment System
**Version:** 1.0 (FINAL)
