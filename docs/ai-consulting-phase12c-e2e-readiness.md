# AI Consulting Phase 12C — Pre-live E2E Readiness

## Purpose

Validate the complete AI-consulting commercial contract without creating fake Production payments, credits, conversations, memories, or OpenAI calls.

## What CI verifies now

The `test:ai-consulting-e2e` suite runs the existing checkout, credit-history, memory, quality/cost, and operations regressions plus a cross-layer E2E contract regression.

The cross-layer regression verifies these checkpoints against the real repository wiring:

1. Paid-analysis entitlement and completed report are required before AI-credit checkout/session entry.
2. The 3/5/10 credit pack price and quantity come from server commercial policy.
3. Payment confirmation checks authenticated order ownership, provider order id, KRW amount, and provider `DONE` state before credit finalization.
4. Verified credit purchase uses the hardened credit-ledger RPC.
5. Session state loads prior conversation history even when the profile wallet is at zero.
6. Scope classification happens before chargeable answer completion.
7. Only a successful ALLOW answer can complete the atomic assistant-message + charged-message + `CONSUME -1` lifecycle.
8. Failure releases a reservation and does not consume a credit.
9. Previous consultation history remains available for continuation.
10. Explicit user memory save/delete never calls OpenAI or changes question credits, and saved USER_STATED memory is available to later consultations.
11. Operations telemetry remains observational and cannot become a second credit/commercial source of truth.

## Production safety

This phase does not perform a live payment smoke test because AI-credit checkout remains intentionally disabled until an approved live Toss configuration is available. Production must not be seeded with fake purchases or credits just to exercise the path.

## Final live smoke test after PG approval

When approved live provider credentials are available, perform one controlled small-value Production smoke test with a real eligible paid-analysis account:

1. Confirm the exact paid-analysis entitlement and completed report.
2. Enable AI-credit checkout with approved live provider configuration.
3. Purchase the smallest launch bundle.
4. Confirm the provider payment is `DONE` and the internal order is `paid`.
5. Confirm exactly one PURCHASE ledger entry with the expected bundle quantity.
6. Ask one valid ALLOW question and confirm one assistant answer plus exactly one `CONSUME -1` entry.
7. Confirm the remaining wallet balance decreased by exactly one.
8. Re-open the same consultation and confirm prior messages are visible.
9. Save one user message with `이 내용 기억하기`, then confirm a later consultation can use that USER_STATED memory without extra charge.
10. Review `/admin/ai-consulting`, `/admin/ai-consulting/operations`, and reconciliation state for unexpected errors or integrity mismatches.

Until that controlled live payment succeeds, Phase 12C should be described as **pre-live E2E contract verified; live payment leg pending PG approval**, not as a completed live payment E2E test.
