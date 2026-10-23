# Same-account self/spouse purchase isolation — staging checkpoint

Environment: `test/staging-tenant-e2e`, Supabase `xdiitqyysmhicjcytckm` only.
PR #319 remains draft and unmerged. Production `main`, production Supabase and
LIVE/payment settings must not be changed as part of this verification.

## Executed evidence

- The original staging deployment `d4e92357a7e59601dbfbf9b7dfd66f094bf5f008`
  returned actual HTTP 200 / `{"ready":true}` from `/api/internal/e2e-readiness`.
- The real refund services passed 17 isolated mocked scenarios. The staging
  refund RPC passed 19 real SQL assertions, followed by ROLLBACK.
- `scripts/sql/profile-purchase-isolation-staging.sql` passed 17 real staging
  database assertions. It reused the existing self profile, created a temporary
  spouse with the SAME owner, seeded A only, checked B's absence of rights,
  separately seeded B for the SAME `career` / `YEAR:2026`, and switched back to A.
  Owner/profile/product/edition and purchase lineage matched at all four layers;
  A's rows stayed byte-for-byte unchanged after B's purchase. All rows and the
  temporary active-profile selections were rolled back.
- The synthetic report fixture is validated with the application's actual
  `parseStoredPaidAnalysisDetail` before SQL execution. The existing V3 stored
  report contract remains supported; synthetic canaries replace its headline.
- The actual browser reached the staging login page. The secure credential
  request was submitted, but the application displayed an incorrect-email-or-
  password error. This is NOT a successful signed-in test. No persistent browser
  fixtures have been inserted, and no browser profile-switch/report-access result
  is PASS at this checkpoint.

## Regression maintenance

Three older regression scripts failed because they asserted obsolete source
strings: checkout's former single-product variable and payment label, the old
profile deselection copy, and the full-library payload before pagination and
stored-report prefetch. They now assert the current product validation,
server-backed selection, priced payment action, active-profile filtering,
pagination/overview payload and exact purchased edition/initial stored report.
No application authorization rule was relaxed and no application code changed.

Run `npm run test:profile-edition-isolation` for the targeted service/source
checks. These checks are not a substitute for authenticated browser/HTTP tests.

## SQL rehearsal

Run the SQL script only through the staging connector. Replace its
`-- STAGING_TEST_SETUP` marker with transaction-local settings:

- `unboda.e2e_project_ref`: exactly `xdiitqyysmhicjcytckm`
- `unboda.e2e_user_a`: the existing staging account owner UUID
- `unboda.e2e_profile_a`: that owner's existing self profile UUID
- `unboda.e2e_report`: JSON from `scripts/fixtures/paid-report-v3.json`, validated
  first by `parseStoredPaidAnalysisDetail`

The script requires an existing self/active profile and refuses to overwrite a
matching existing commercial scope. It has no COMMIT, permanent DDL, grants,
Toss records, refund workflows, AI grants, credit ledger or generation calls.
Its final ROLLBACK is mandatory. Database selections are explicitly database-only
evidence, not HTTP or UI evidence.

## Authenticated continuation and cleanup

1. Complete normal staging sign-in for the owner of the self profile via the
   secure browser surface; verify a positive signed-in signal. Do not reset a
   known password, reuse production credentials or read browser tokens.
2. Verify the latest test-branch Preview and readiness 200/true again.
3. Record original profiles, active selection and table fingerprints. Prepare
   exact-ID insert and cleanup manifests before committing any fixtures.
4. Create only one synthetic spouse for that SAME owner. Use 0-KRW paid orders
   with a unique `STAGING_SYNTHETIC_PROFILE_*` provider, NULL transaction ID,
   matching frozen input snapshots and parser-valid COMPLETED reports. Never
   create Toss/refund/credit/grant rows or invoke checkout/payment confirmation.
5. Seed A only, verify A library/report/status and B negative cases using actual
   UI and read-only HTTP; only then seed B for the same product/edition. Verify B
   gets its own canary and switch back to A. Do not open an unfinished report,
   retry generation or submit an AI consultation.
6. Check exact ownership, profile, edition and source-purchase IDs in SQL.
   The database RLS model is account-scoped; application reads must also enforce
   the selected profile. Current financial/report browser table privileges are
   revoked, so this rehearsal does not temporarily grant them to claim RLS PASS.
7. Restore the original active selection. Recheck FK dependents and triggers,
   then remove only manifest IDs: reports, entitlements, purchases, orders and
   the newly created spouse. Stop if unexpected existing dependencies appear.
   Verify account/profile preservation, no fixture residue and no money/credit
   changes. Never delete an existing profile or account.

The zero-value custom provider and absent Toss/refund rows exclude fixtures from
payment/refund reconciliation. COMPLETED reports are excluded from failed/stale
generation recovery. Purchase/entitlement insert triggers stamp service terms
only; the SQL rehearsal verified no financial/AI side effects. Authentication-
dependent steps above remain pending and must not be reported PASS.
