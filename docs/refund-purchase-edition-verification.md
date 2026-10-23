# Purchase-scoped report refund verification

The first refund and the recovery worker now use the same claimed, order-scoped
revocation RPC. The RPC joins the original order to its purchase and revokes only
that purchase's paid-analysis entitlement and frozen edition. A different edition,
another profile/account, and a replacement purchase remain accessible.

Completion checks use that same purchase and edition, including legacy null
editions. A database lookup or revocation error cannot mark the refund complete.
The initial request acquires a five-minute claim before contacting the provider;
subsequent writes are fenced by that claim. Recovery only looks up cancellation
evidence and never sends another provider cancellation.

## Validation on 2026-10-23

- 17 isolated service scenarios execute the real TypeScript services with mocked
  database/provider imports; network access is forbidden in the harness.
- 19 staging SQL assertions execute the real revocation RPC. They cover exact
  purchase/edition boundaries, null editions, replaced purchases, stale claims,
  terminal workflows, resource types and server-only execution privileges.
- All 93 prebuild regression scripts passed, along with TypeScript and changed-file
  ESLint checks. On a host that cannot open the tsx CLI's IPC pipe, the same scripts
  can run with `node --import tsx`.
- Synthetic SQL fixtures were never committed. Orders, purchases, entitlements,
  payment/refund records, credit ledgers/lots and existing profiles matched their
  pre-test counts and fingerprints after rollback.
- No real provider cancellation/refund or AI call was used.

## Repeat the staging SQL test

Use Supabase MCP `execute_sql` **only** for project `xdiitqyysmhicjcytckm`.
Read `scripts/sql/refund-purchase-edition-staging.sql` and replace its
`STAGING_TEST_SETUP` comment with `SET LOCAL` values for:

- `unboda.e2e_project_ref`: `xdiitqyysmhicjcytckm`
- `unboda.e2e_user_a` / `unboda.e2e_profile_a`: the existing staging A identities
- `unboda.e2e_user_b` / `unboda.e2e_profile_b`: the existing staging B identities

Keep the opening `BEGIN` and final `ROLLBACK`. The script validates both existing
profile owners before inserting any fixture. Its custom provider marker,
synthetic payment references, terminal payment records and uncommitted transaction
prevent fixtures from entering real settlement. Do not create users, change
profiles, export session credentials or invoke a financial HTTP endpoint to run it.

## Release order

1. Apply `20261023093705_refund_purchase_edition_scope.sql` before releasing the
   application change. It preserves the existing RPC signature and server-only
   permissions; it does not update customer rows or payment configuration.
2. Release the reviewed application commit and verify authentication/MFA and
   read-only API guards. Do not enable refund/LIVE flags as part of this fix.
3. Keep successful real-card cancellation outside this verification. The staging
   SQL assertions and mocked service scenarios are not evidence of a real Toss
   refund having been executed.

The migration was applied only to staging during this work. Production application
and database changes require a separate release decision under the existing
production protection constraint.
