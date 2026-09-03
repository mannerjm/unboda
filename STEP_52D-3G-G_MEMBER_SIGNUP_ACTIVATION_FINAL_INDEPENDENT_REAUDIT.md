# STEP 52D-3G-G — Member Signup Activation Final Independent Re-Audit

## 1. Executive Verdict

**GO for human browser UX review; NEEDS WORK before the later full production E2E/checkpoint.** The current implementation satisfies the required technical gates for this audit:

- ambiguous signup responses cannot call the policy evidence writer;
- new-account evidence requires a server-generated correlation proof plus authoritative service-role lookup;
- authenticated recovery derives the target user from the server session;
- completion requires both canonical policy evidence and email verification;
- returnTo is origin-safe through every identified signup/login consumer;
- Guest, legacy-member, and paid-eligibility boundaries remain intact;
- behavioral service-boundary tests and a real local Supabase Auth E2E pass;
- the clean production build passes.

Residual work is limited to route-level callback integration coverage, live/deployed Auth configuration verification, unrelated lint baseline failures, and the known stale Guest UI regression. Those are recorded below and do not reopen the repaired security claims.

## 2. Final Authority Proof

The production new-signup path is `app/auth/signup/page.tsx` -> `POST /api/auth/signup` -> `completeNewSignupWithEvidence()` (`app/lib/signupPolicy/signupService.ts`).

Before evidence writing, the route:

1. Generates `signupAttemptId` with `randomUUID()` (`app/api/auth/signup/route.ts`).
2. Sends that value in Auth `options.data` from the server closure; the browser request type has no attempt-ID field (`app/api/auth/signup/route.ts`, `SignupRequest`).
3. Receives the Auth user and rejects Auth errors/null users.
4. Performs `createAdminClient().auth.admin.getUserById(returnedUser.id)` (`app/api/auth/signup/route.ts`).
5. Requires `hasSignupOwnershipProof()` to match returned ID to Admin ID, normalized Admin email to submitted email, and Admin `user_metadata.signupAttemptId` to the server-generated value (`app/lib/signupPolicy/identity.ts`).
6. Calls `recordSignupPolicyAcceptance()` only after all proof checks succeed (`app/lib/signupPolicy/signupService.ts`).

Consequently, `data.user.id`, `identities.length > 0`, arbitrary metadata, client user ID, client attempt ID, client policy versions, and client timestamps cannot independently authorize evidence. The local real-provider E2E verified that the server metadata survived the Auth/Admin round trip for a disposable new user.

## 3. Evidence-Writer Call-Site Audit

Production application call sites found:

- `app/api/auth/signup/route.ts`: calls `recordSignupPolicyAcceptance` for the authenticated recovery branch and through the new-signup service callback.
- `app/lib/signupPolicy/server.ts`: the sole application helper that calls `record_signup_policy_acceptance` through the service-role client.

No alternate application route, action, helper, or client path writes signup evidence. The migration RPC remains protected by service-role grants and RLS (`supabase/migrations/037_signup_policy_acceptance_events.sql`). The direct Admin RPC calls in `scripts/signup-policy-acceptance-regression.ts` are test fixtures, not production callers.

The authenticated branch obtains `userId` from `getCurrentUser()` (`app/lib/supabase/auth.ts`) and does not read a browser user ID. The new-signup branch uses the Admin-verified ID. Canonical versions come from `SIGNUP_POLICIES` (`app/lib/signupPolicy/config.ts`).

## 4. Ambiguous Writer-Zero Proof

`completeNewSignupWithEvidence()` invokes the writer only after `getAuthoritativeUser()` and `hasSignupOwnershipProof()` succeed (`app/lib/signupPolicy/signupService.ts`). The behavioral regression `scripts/signup-policy-activation-regression.ts` records writer calls and proves:

- valid new user with matching server correlation: exactly one call;
- target ID equals the authoritative Admin user ID;
- null user: zero calls;
- empty identities: zero calls;
- missing metadata: zero calls;
- mismatched metadata: zero calls;
- duplicate-style user/email mismatch: zero calls;
- non-empty identities without matching server correlation: zero calls;
- first writer failure followed by retry: recovery succeeds with one durable test target.

This is service-boundary behavioral coverage, not merely a source-string assertion. The local E2E duplicate attempt returned `User already registered` with no user object; the disposable user was cleaned up locally.

## 5. signupAttemptId Security Analysis

`signupAttemptId` is generated server-side with Node `randomUUID()` (`app/api/auth/signup/route.ts`), giving a per-request unpredictable UUID for this correlation role. It is not accepted in `SignupRequest`, not derived from the email/password input, and not returned in the route response. The server passes it directly to the Auth call through a closure.

The authoritative read is service-role `auth.admin.getUserById`, and the comparison requires exact metadata equality plus ID and normalized-email equality (`app/api/auth/signup/route.ts`, `app/lib/signupPolicy/identity.ts`). Absent/null metadata cannot match because the comparison requires the exact non-empty server value.

User metadata is generally editable by an authenticated account, but the first proof occurs immediately after signup and uses a fresh server-only value. If evidence fails, recovery does not rely on metadata: it requires the current authenticated server session and writes for `getCurrentUser().id`. A later attempt cannot claim another user because it cannot submit a target ID and the new-attempt correlation must match the new request’s value.

The local E2E confirmed the metadata persisted through the actual local Auth/Admin flow. Live production Auth configuration remains a residual operational verification item.

## 6. Authenticated Recovery Proof

`POST /api/auth/signup` first calls `getCurrentUser()` (`app/api/auth/signup/route.ts`). If a valid server session exists, it does not call `auth.signUp`; it obtains the current Auth user and calls the canonical evidence helper with that server-derived ID. The request body contains no user ID.

This recovery is idempotent because the underlying RPC inserts the two canonical events with unique `(user_id, policy_type, policy_version)` and `ON CONFLICT DO NOTHING` (`supabase/migrations/037_signup_policy_acceptance_events.sql`). Evidence failure returns a failure response; it does not return policy completion. Email verification and policy completion remain separate, and no recovery code touches `VERIFIED_ADULT` or lifecycle state.

An unverified authenticated session, where the provider permits one, cannot be treated as completed: the response carries `emailVerified` separately and the UI state decision requires both values. A verified but policy-incomplete user remains in policy recovery.

## 7. Completion/returnTo Proof

`getSignupCompletionState()` is consumed by `app/auth/signup/page.tsx` and has four explicit outcomes:

| Policy | Email | Result |
|---|---|---|
| false | false | `INCOMPLETE_SIGNUP`, no normal redirect |
| true | false | `WAITING_FOR_EMAIL_VERIFICATION`, confirmation state |
| false | true | `POLICY_RECOVERY_REQUIRED`, blocked |
| true | true | `SIGNUP_COMPLETE`, safe internal redirect |

The marked email callback additionally requires `data.user.email_confirmed_at` and `isSignupPolicyComplete()` (`app/auth/callback/route.ts`). The policy RPC does not set Auth verification, lifecycle, or `VERIFIED_ADULT` (`supabase/migrations/037_signup_policy_acceptance_events.sql`).

`getSafeReturnTo()` (`app/lib/auth.ts`) repeatedly decodes bounded URL encoding, rejects `//`, encoded second slashes, schemes, backslashes, control characters, malformed values, and cross-origin URL resolution. Identified consumers are signup, login, callback, forgot-password, reset-password, and the signup API. The callback constructs its final URL only after this helper returns a same-origin path. `/auth/complete-guest-analysis` remains accepted.

**Conclusion: PASS.** No returnTo escape or policy/email bypass was found through the actual production consumers.

## 8. Local Supabase Auth E2E Results

The repository’s `.env.local` points to `http://127.0.0.1:54321`, so a bounded local provider test was feasible. A disposable random user was used; no production credential or real customer email was used.

Results:

- New signup with server-generated metadata: Auth user created successfully.
- Admin lookup: exact user ID, normalized email, and correlation metadata matched.
- New signup returned a session in the local configuration; the application still keeps email verification as a separate returned state and completion decision.
- Duplicate signup with the same email: local Auth returned `User already registered`, with no user object.
- Disposable Auth user: deleted through the local Admin API after the test.

This proves local provider compatibility, not deployed-provider configuration or a full browser confirmation journey. No production data was touched.

## 9. Guest/Legacy/Paid Compatibility

- Guest flow remains free analysis before optional signup (`app/guest-saju/page.tsx`, `app/guest-result/page.tsx`).
- Guest age self-attestation remains request-scoped and distinct from member policy evidence (`app/lib/guestFreeAnalyses/input.ts`).
- Signup does not read or clear the Guest cookie; transfer clears it only after successful transfer (`app/api/guest-free-analysis/transfer/route.ts`).
- `/auth/complete-guest-analysis` remains the supported transfer destination.
- Existing member services do not call `isSignupPolicyComplete`; legacy accounts are not globally gated (`app/lib/accounts/server.ts`, `app/api/profiles/route.ts`, `app/api/orders/route.ts`).
- `VERIFIED_ADULT` remains paid-only and is not granted by signup (`app/lib/accounts/server.ts`, `app/api/orders/route.ts`).

Authoritative Guest server/transfer/revisit, account lifecycle, and paid eligibility regressions pass.

## 10. Regression-Quality Matrix

| Claim | Coverage level | Result |
|---|---|---|
| returnTo normalization cases | helper/unit plus consumer-code trace | Pass; full route invocation remains absent |
| four completion states | helper/unit consumed by production signup UI | Pass; full route/UI integration remains absent |
| writer zero for ambiguity | service-boundary behavioral with mocked dependencies | Pass; call count and target ID asserted |
| canonical evidence/RLS/idempotency | real local database integration | Pass |
| local Auth new/duplicate shape | real local-provider E2E | Pass |
| Guest compatibility | existing contract regressions | Pass |
| legacy/paid separation | existing contract regressions | Pass |
| external deployed Auth/browser flow | not run | Residual risk for later full E2E |

Source-string assertions remain in the existing regressions, but the critical writer-zero claim is now backed by the extracted production service behavior test. A full mocked `NextRequest` callback test would further strengthen consumer coverage but is not required to find a bypass in the current traced code.

## 11. Fresh Validation Results

Fresh from the current tree:

- Signup route/provider behavioral regression — **PASS** (`scripts/signup-policy-activation-regression.ts`).
- Focused signup activation regression — **PASS**.
- Auth regression — **PASS**.
- Policy evidence regression — **PASS**, including local database/RLS/idempotency checks.
- Guest server regression — **PASS**.
- Guest transfer regression — **PASS**.
- Guest revisit regression — **PASS**.
- Account lifecycle regression — **PASS**.
- Paid eligibility regression — **PASS**.
- TypeScript — **PASS**.
- Clean production build after removing only workspace `.next` with no workspace Next dev process — **PASS**.
- `git diff --check` — **PASS**.
- Local Supabase Auth E2E — **PASS** as described above.
- ESLint — **FAIL** with known unrelated baseline/generated-content errors; no repair-specific issue was identified.
- Known `guest-ui-integration-regression.ts` — **FAIL** only at its stale root-page expectation; it was not modified.

The build retained the existing middleware-to-proxy deprecation warning.

## 12. Exact Working-Tree Inventory

Baseline remains `d1e36a9f67fdcb6562e3e69fc13b979692e11b47`.

3G implementation files currently modified or added include:

- `app/auth/callback/route.ts`
- `app/auth/signup/page.tsx`
- `app/api/auth/signup/route.ts`
- `app/lib/auth.ts`
- `app/lib/signupPolicy/config.ts`
- `app/lib/signupPolicy/server.ts`
- `app/lib/signupPolicy/completion.ts`
- `app/lib/signupPolicy/identity.ts`
- `app/lib/signupPolicy/signupService.ts`
- `scripts/auth-phase3a-regression.ts`
- `scripts/signup-policy-acceptance-regression.ts`
- `scripts/signup-policy-activation-regression.ts`

This report is the only file created by 3G-G. Earlier 3F/3G reports, `STEP_57D-48F-D3_CHECKPOINT_FINAL_REPORT.md`, logs, and other artifacts remain pre-existing/unrelated untracked files. No files were staged. No commit or push occurred. `.next` and `node_modules` are excluded from checkpoint content.

## 13. Exact Checkpoint Candidate File List

The candidate checkpoint should include only the 3G implementation/test/report set:

- `app/auth/callback/route.ts`
- `app/auth/signup/page.tsx`
- `app/api/auth/signup/route.ts`
- `app/lib/auth.ts`
- `app/lib/signupPolicy/config.ts`
- `app/lib/signupPolicy/server.ts`
- `app/lib/signupPolicy/completion.ts`
- `app/lib/signupPolicy/identity.ts`
- `app/lib/signupPolicy/signupService.ts`
- `scripts/auth-phase3a-regression.ts`
- `scripts/signup-policy-acceptance-regression.ts`
- `scripts/signup-policy-activation-regression.ts`
- `STEP_52D-3G-A_MEMBER_SIGNUP_POLICY_ACTIVATION_READ_ONLY_DESIGN.md`
- `STEP_52D-3G-B_MEMBER_SIGNUP_POLICY_ACTIVATION_IMPLEMENTATION_REPORT.md`
- `STEP_52D-3G-C_MEMBER_SIGNUP_POLICY_ACTIVATION_FINAL_AUDIT.md`
- `STEP_52D-3G-D_MEMBER_SIGNUP_ACTIVATION_CRITICAL_REPAIR_REPORT.md`
- `STEP_52D-3G-E_MEMBER_SIGNUP_ACTIVATION_CRITICAL_REPAIR_REAUDIT.md`
- `STEP_52D-3G-F_DUPLICATE_SIGNUP_IDENTITY_AUTHORITY_REPAIR_REPORT.md`
- `STEP_52D-3G-G_MEMBER_SIGNUP_ACTIVATION_FINAL_INDEPENDENT_REAUDIT.md`

Exclude all 3F documents, `STEP_57D-48F-D3_CHECKPOINT_FINAL_REPORT.md`, `.next`, `node_modules`, `.env*`, logs, temp artifacts, and unrelated pre-existing files.

## 14. Residual Risks

- Production Supabase Auth configuration may differ from local behavior; the later full E2E should verify Confirm email, metadata persistence, and duplicate handling in the deployed environment.
- Callback tests do not yet invoke the actual `NextRequest`/`NextResponse.redirect` route with mocked dependencies.
- Repository lint remains red for unrelated baseline/generated-content issues.
- The known stale Guest UI regression remains red.
- The correlation metadata is operational proof only and must not be published or logged.

## 15. Final GO / NO-GO for HUMAN UX REVIEW

**GO for human browser UX review.** All identity-authority claims are now supported by a server-generated correlation proof, authoritative Admin lookup, service-boundary writer-zero tests, and a real local Auth E2E. No ambiguous response can reach the production evidence writer under the current traced path.

**Checkpoint recommendation:** defer final checkpoint until the human UX review is complete and the later full production-like E2E covers the actual callback/browser flow. This is a residual validation item, not a currently identified security bypass.

**END RE-AUDIT**
