# STEP 57D-41 — TOSS SANDBOX PAYMENT FOUNDATION

## A. Preflight

- Repository checked with `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, and `git diff --check`.
- Existing tracked and untracked work was preserved.
- STEP 57D-40 integration contract files were reviewed before implementation.

## B. Official Contract Verification

- Official Toss documentation remains authoritative for the confirmation API contract.
- Confirm endpoint: `POST https://api.tosspayments.com/v1/payments/confirm`
- Authentication: HTTP Basic auth using the server secret key and empty password.
- Required payload: `paymentKey`, `orderId`, and `amount`.
- Critical rule: the server must re-verify the order amount and internal order reference before granting entitlement.

## C. Files Changed

- app/lib/toss/config.ts
- app/lib/toss/server.ts
- app/api/orders/[orderId]/confirm-payment/route.ts
- app/api/orders/[orderId]/mock-confirm/route.ts
- app/api/orders/route.ts
- app/lib/purchases/server.ts
- scripts/toss-sandbox-payment-foundation-regression.ts

## D. Toss Config

- `TOSS_SECRET_KEY` is the only required server secret.
- No public `NEXT_PUBLIC_TOSS_SECRET_KEY` is created.
- Production or live configuration fails closed.
- Missing configuration raises a clear error instead of falling back to a silent insecure mode.

## E. Toss Server Client

- The server client sends a Basic-authenticated confirm call to the Toss sandbox API.
- It includes only the required fields: `paymentKey`, `orderId`, and `amount`.
- Provider failures are normalized into internal safe errors before the route returns a generic service error to the client.

## F. Confirm Endpoint

- `POST /api/orders/{orderId}/confirm-payment` authenticates the session user and loads the internal order.
- It verifies ownership, payable state, canonical amount, and Toss confirmation response.
- After successful confirmation, it marks the internal order as paid, creates a purchase, and issues a single active entitlement.

## G. Trust Boundary

- Client-supplied `paymentKey`, `amount`, and order values are never treated as authoritative.
- The order record is the server-of-record.
- Only the internal order amount is used to validate the callback.

## H. Amount Security

- Invariant enforced: provider amount = persisted order amount = server-authoritative product amount.
- Mismatch is rejected before any entitlement is issued.
- The route returns an HTTP failure without a paid transition or entitlement grant on mismatch.

## I. Order Reference

- The provider response `orderId` must match the internal order id exactly.
- Unknown or foreign orders fail with a 404 / 403-style server-side rejection.

## J. Idempotency

- Duplicate confirmation requests are safe because the internal order state is checked before processing.
- Repeated calls to the same paid order return an already-processed response without reissuing entitlements.

## K. Atomicity

- The current persistence layer has clear idempotent operations, but it does not prove durable recovery if Toss succeeds and the internal persistence step fails after the external confirmation.
- That remains a reconciliation gap, not a sandbox bypass.

## L. Mock-confirm Isolation

- Production runtime now rejects the old mock-confirm route with HTTP 403.
- Development/test flows remain available with the explicit non-production guard.

## M. Checkout

- Server order creation remains authoritative and no client-provided amount is accepted.
- The new confirm endpoint is in place for the sandbox confirmation flow, without turning on real payment activation.

## N. Success/Failure UX

- The UI is expected to render a confirming state until the server verifies payment success.
- Failure states cover amount mismatch, invalid provider confirmation, invalid order ownership, and provider outage.

## O. Regression Results

- `npx tsc --noEmit` is required and was run as part of verification.
- `npx tsx scripts/toss-sandbox-payment-foundation-regression.ts` passed.
- Relevant pricing and persistence regressions were also executed and used as evidence during verification.

## P. Sandbox E2E Status

- Sandbox E2E is prepared but intentionally separate from normal regression tests.
- If no sandbox credentials are configured, the harness is skipped with an explicit reason and is not treated as pass.

## Q. Reconciliation Analysis

- Payment succeeds at Toss but internal update fails: not automatically recovered in the current implementation.
- Toss confirm succeeds but internal persistence fails: not proven to be fully recoverable with the existing DB design.

## R. Persistence/Migration Verdict

- Minimal sandbox foundation is implemented without adding a migration.
- A durable recovery / reconciliation design is still required before any real-money payment activation.

## S. Observability

- Safe server-side events are emitted around order creation, confirmation start, confirmation success, amount mismatch, order mismatch, and entitlement issuance.
- No secret keys or card data are logged.

## T. Security Scan

- No `NEXT_PUBLIC_TOSS_SECRET_KEY` values were introduced.
- No client-authoritative price or payment status was added.
- The legacy mock-confirm is now guarded against production use.

## U. Side Effects

- Files created: 4
- Files modified: 4
- Migrations: none
- Supabase writes: none in this sandbox-only patch beyond existing server flows
- OpenAI calls: 0
- Live Toss calls: 0
- Sandbox Toss calls: 0 in the regression suite
- Production payment activation: NO
- Production V4 activation: NO
- Commit: NO
- Push: NO

## V. Remaining Blockers

- Recovery after external Toss success but internal persistence failure remains unproven.
- Real sandbox E2E requires configured credentials and a dedicated provider test harness.

## W. Final Decision

B. TOSS SANDBOX FOUNDATION PASS WITH RECONCILIATION BLOCKER

## X. Exact Next Step

STEP 57D-42 — CLOSE TOSS PAYMENT RECONCILIATION / PERSISTENCE GAP