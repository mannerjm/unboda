# STEP 52D-3C-B Member Signup Policy Evidence Foundation Report

## 1. Verdict and Baseline

**PASS — SAFE FOR CHECKPOINT AUDIT**

Baseline: `main` at `30b3b167b9f842cf0e5cdf023b99c2ff05dab4a2`, equal to
`origin/main` before implementation.

This foundation adds policy evidence storage and a server-only recording
contract without activating customer-facing signup policy UX. Public Terms and
Privacy pages, final legal wording, generic Privacy consent, marketing consent,
NICE, `VERIFIED_ADULT`, checkout, Guest 14+, payment, refund, closure, and
existing email-verification behavior remain unchanged.

## 2. Exact Files Changed

- `app/lib/signupPolicy/config.ts`
- `app/lib/signupPolicy/server.ts`
- `supabase/migrations/037_signup_policy_acceptance_events.sql`
- `scripts/signup-policy-acceptance-regression.ts`
- `STEP_52D-3C-A_MEMBER_SIGNUP_CONSENT_EVIDENCE_DESIGN.md` remains an intended
  pre-existing uncommitted design document and was not modified.
- `STEP_52D-3C-B_MEMBER_SIGNUP_POLICY_EVIDENCE_FOUNDATION_REPORT.md`

## 3. Signup Architecture Re-Verification

Current production signup remains the browser flow in
`app/auth/signup/page.tsx`, calling Supabase `auth.signUp` directly. The
confirmation callback remains `app/auth/callback/route.ts`, which exchanges the
code and redirects through the existing safe `returnTo` handling.

No server signup route currently owns Auth creation. Guest transfer and checkout
both hand off to this same signup page; there is no alternate signup modal or
account-creation API. Because pre-verification browser signup cannot safely
associate an unverified user with a server evidence write without an explicit
incomplete-policy state, production signup UX remains intentionally unchanged in
this foundation.

The new server-only repository is compatible with the current flow as a future
post-Auth boundary: it accepts a server-supplied Auth user ID and records policy
evidence after Auth creation. It is not wired into the current customer signup
page, so existing email verification and return redirects are unaffected.

## 4. Policy Configuration

`app/lib/signupPolicy/config.ts` is the authoritative server-safe configuration.
It defines only:

- `TERMS` with `TERMS_V1`;
- `AGE_14_PLUS` with `AGE_14_PLUS_V1`.

Both are currently `enforceable: false` because public policy pages and final
reviewed wording do not yet exist. No legal prose or fabricated effective date
is stored. `isSignupPolicyAcceptanceValid()` requires exact canonical versions
and strict boolean `true` for both required claims.

## 5. Migration, Table, and RLS

Migration 037 adds `public.policy_acceptance_events` with:

- immutable UUID ID;
- `user_id` restricted to an Auth user through `ON DELETE RESTRICT`;
- allowlisted `policy_type` values `TERMS` and `AGE_14_PLUS`;
- bounded non-empty policy version;
- `accepted_at` and `created_at` timestamps;
- bounded `source`, currently `SIGNUP`;
- unique `(user_id, policy_type, policy_version)` idempotency key.

RLS is enabled. Anonymous and authenticated clients have no table privileges;
only service-role/server code receives the minimum table grant. The RPC is
revoked from public, anon, and authenticated roles and executable only by
service role.

The table contains no email, password, birth date, profile ID, analysis content,
Guest secret, payment data, IP, User-Agent, device fingerprint, or provider
fields.

## 6. Immutable and Idempotent Evidence Behavior

`record_signup_policy_acceptance()` is a narrow service-role RPC. It validates a
real Auth user, inserts TERMS and AGE_14_PLUS in one database transaction, and
uses `ON CONFLICT DO NOTHING`. Repeating the same pair returns the existing
complete state and does not duplicate rows. Events have no normal update/delete
path.

The server repository validates exact configured versions before calling the
RPC. Invalid booleans or stale versions fail through the repository contract;
the RPC itself rejects null/empty/oversized versions and unknown users.

## 7. Server Boundary Status

The server-owned recording foundation is implemented in
`app/lib/signupPolicy/server.ts` through `recordSignupPolicyAcceptance(userId,
input)`. It derives policy versions from centralized config and does not accept a
client-provided user ID inside the acceptance input.

The production signup page is intentionally not switched to this boundary in
52D-3C-B. Activation is deferred until policy pages, final wording, and the
Auth-to-DB orchestration decision are approved. No incomplete policy UX is live.

## 8. Auth and Database Partial-Failure Strategy

Auth user creation and Postgres evidence insertion cannot share one Supabase
Auth/Postgres ACID transaction through the current browser flow. This step does
not claim otherwise.

The intended future strategy is one server-owned orchestration:

1. validate required booleans and exact policy versions;
2. create Auth user;
3. derive returned Auth user ID server-side;
4. call the atomic pair RPC;
5. return confirmation-email state only after required evidence succeeds.

If Auth succeeds but evidence fails, the future boundary must fail closed and use
an approved rollback or recoverable incomplete-signup path. It must not claim
policy-complete signup silently. Terms success followed by age failure cannot
occur inside the RPC because the two inserts are one transaction. Lost response
retries converge through the unique key.

Email verification may remain pending while evidence exists. It is a separate
Auth state and does not grant adult eligibility.

## 9. Email-Verification Non-Regression

The local regression proved the evidence RPC does not change the Auth email
confirmation state. Acceptance does not create an account lifecycle row or set
paid adult eligibility. `email_confirmed_at` remains Auth-managed, and
`VERIFIED_ADULT` remains outside this feature.

No NICE/PASS or provider behavior was added. Existing unverified-account
restrictions remain unchanged.

## 10. Closure and Re-Signup Treatment

Migration 037 does not modify account closure cleanup. Acceptance events are
separate evidence records and their retention/deletion period remains LEGAL
REVIEW. They do not restore closed profiles, free results, paid reports, or
Guest content.

A new signup produces a new Auth user ID and does not inherit prior events. The
current RPC requires the target Auth user to exist and inserts events keyed to
that exact user ID.

## 11. Privacy and Security Review

The focused regression and source review confirm:

- only TERMS and AGE_14_PLUS event types are accepted;
- unsupported types and empty versions are rejected;
- normal anonymous clients cannot invoke the RPC;
- duplicate acceptance is idempotent;
- no client user ID, `emailVerified`, `VERIFIED_ADULT`, or lifecycle state is
  accepted by the repository contract;
- no password, email copy, profile data, birth data, saju data, content,
  payment data, Guest secret, provider value, IP, User-Agent, or device data is
  stored in evidence rows;
- no raw request body or password logging was added;
- no service-role credential is exposed to browser code;
- Guest 14+ remains request-scoped and is not copied into this table.

## 12. Regression Results

Passed locally against a clean migration replay:

- `scripts/signup-policy-acceptance-regression.ts`;
- `scripts/guest-age-self-attestation-regression.ts`;
- `scripts/account-lifecycle-foundation-regression.ts`;
- `scripts/auth-phase3a-regression.ts`;
- `scripts/paid-purchase-eligibility-boundary-regression.ts`;
- `scripts/phase3a-account-policy-regression.ts`;
- `scripts/phase3b-account-self-service-regression.ts`;
- `scripts/account-closure-personal-data-cleanup-regression.ts`.

The evidence regression covers table shape, event allowlist, empty version,
service-role boundary, atomic TERMS/AGE pair, idempotent retry, duplicate
prevention, Auth verification non-mutation, no adult eligibility mutation, and
cross-user isolation.

## 13. Fresh Migration Replay

`supabase db reset --local --no-seed` replayed migrations 001 through 037 directly
from repository source without manual SQL correction or remote database access.

Local metadata confirmed:

- latest migrations: `037`, `036`, `035`;
- all policy-event constraints validated;
- RLS enabled on `policy_acceptance_events`;
- evidence table empty after fixture cleanup;
- no temporary migration file remained in the container.

## 14. TypeScript, Build, and Diff Validation

- TypeScript `--noEmit`: passed, exit 0.
- Production build: passed, 43 routes generated.
- Affected-file diagnostics: no errors.
- `git diff --check`: passed.

## 15. Explicitly Deferred

- Privacy consent decision and any `privacyAccepted` field/event.
- Final Terms and Privacy legal prose.
- Policy evidence retention period and closure treatment.
- Public Terms/Privacy UI and legal navigation.
- Signup UX activation.
- Server-owned Auth signup orchestration wiring.
- NICE/adult-verification behavior.
- Paid eligibility and payment/refund behavior.
- Guest 14+ and Guest retention behavior.

## 16. Confirmation

- No remote Supabase access.
- No provider calls.
- No NICE changes.
- No payment/refund changes.
- No Guest 14+ or Guest retention changes.
- No customer-facing signup policy UX activation.
- No commit.
- No push.
