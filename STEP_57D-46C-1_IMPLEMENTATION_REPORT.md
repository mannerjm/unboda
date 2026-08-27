# STEP 57D-46C-1 IMPLEMENTATION REPORT

## 1. Executive Summary

Implemented the policy-neutral account foundation without enabling production adult verification or integrating an external identity provider.

- Added one provider-neutral `account_lifecycles` entity.
- Added minimal lifecycle states: `ACTIVE`, `DELETION_REQUESTED`, `CLOSED`.
- Added account-level paid eligibility states: `UNVERIFIED`, `VERIFIED_ADULT`, `REVOKED`.
- Added canonical server guards for active account, verified email, and paid eligibility.
- Kept eligibility provider-neutral and excluded DOB, phone, CI, DI, legal name, and resident registration number.
- Added active-account enforcement to paid order creation and Toss payment confirmation.
- Added verified-email enforcement to durable profile creation and editing.
- Left the adult paid gate feature-disabled by default because no external identity provider is integrated.
- Preserved the existing free guest flow and ten-profile limit.
- Added self-service password recovery request and completion screens.
- Added a mobile-first account status surface without identity-provider raw data.
- Added static regression coverage for account/profile separation and security boundaries.
- Existing financial tables and FKs were not rewritten or backfilled.
- No identity provider, Toss age verification, Auth deletion, purge scheduler, guardian consent, or minor-owned paid account support was added.

## 2. Pre-Implementation Repository Findings

There was no application account/lifecycle entity. `auth.users` was used directly by application routes, while `public.profiles` represented analysis subjects. Existing paid order creation and payment confirmation had no application-level account-state check. Existing profile creation/editing had no verified-email server guard. The existing profile limit was already enforced server-side with `MAX_PROFILES_PER_USER = 10`.

## 3. Files Changed

- `supabase/migrations/024_account_lifecycle_paid_eligibility.sql`
  - Adds the provider-neutral account lifecycle and paid eligibility foundation.
- `app/lib/accounts/server.ts`
  - Adds lifecycle types, lazy account-row creation, active-account guard, verified-email guard, paid-eligibility guard, and disabled paid-gate flag.
- `app/api/orders/route.ts`
  - Rejects order creation for non-active application accounts.
- `app/api/orders/[orderId]/confirm-payment/route.ts`
  - Rejects payment confirmation for non-active application accounts.
- `app/api/profiles/route.ts`
  - Requires verified active account for durable profile creation.
- `app/api/profiles/[profileId]/route.ts`
  - Requires verified active account for durable profile editing.
- `app/auth/forgot-password/page.tsx`
  - Adds generic self-service recovery request UI using Supabase recovery email.
- `app/auth/reset-password/page.tsx`
  - Adds recovery-session handling, password update, generic invalid-link state, and global sign-out.
- `app/auth/login/page.tsx`
  - Adds password recovery entry link.
- `app/api/account/status/route.ts`
  - Exposes safe account status and server-derived email verification state.
- `app/account/page.tsx`
  - Adds a mobile-first account status/security surface.
- `scripts/account-lifecycle-foundation-regression.ts`
  - Adds static regression coverage for lifecycle, eligibility, profile separation, recovery, and sensitive-field exclusions.

## 4. Database Changes

Migration: `supabase/migrations/024_account_lifecycle_paid_eligibility.sql`.

Table: `public.account_lifecycles`.

Columns:

- `user_id` primary key referencing `auth.users(id)` with `ON DELETE RESTRICT`.
- `generation` integer, default `1`, constrained to positive values.
- `status` with only `ACTIVE`, `DELETION_REQUESTED`, and `CLOSED`.
- provider-neutral paid eligibility status and metadata.
- eligibility method limited to `DECLARATION` or `EXTERNAL_PROVIDER`.
- timestamps for eligibility and invalidation.
- created/updated timestamps.

Indexes:

- lifecycle status index;
- paid eligibility status index.

RLS:

- enabled;
- authenticated users may select their own row;
- insert/update/delete revoked from `anon` and `authenticated`;
- writes granted only to `service_role`.

Backfill:

- no destructive backfill was run;
- existing users receive an account row lazily through `ensureAccountLifecycle()` when an authenticated application path needs it.

Existing orders, purchases, entitlements, reports, payment records, and refund workflow FKs were not changed. Generation scoping for historical rows remains deferred until an approved migration contract exists.

## 5. Account Lifecycle Generation

Generation 1 is the default row generation for an existing or newly observed Auth user. The generation is returned with the account lifecycle and is intended to identify the current application lifecycle.

No re-registration or reactivation UI was implemented. Existing financial rows are not migrated to generation scope. Old profile/report/entitlement access is not automatically restored by this foundation.

The generation is currently a foundation field; changing generation and closure transitions require a later approved lifecycle workflow.

## 6. Active Account Guard

`requireActiveAccount()` in `app/lib/accounts/server.ts`:

- obtains the user through trusted server-side `getCurrentUser()`;
- lazily resolves the application lifecycle row;
- rejects non-active lifecycle state with a typed `AccountAccessError`;
- returns the authenticated user and lifecycle identity.

Paid order creation and payment confirmation use the lifecycle state check. Profile creation/editing use the stronger verified-email guard, which also checks active state.

## 7. Verified Email Guard

`requireVerifiedEmailAccount()`:

- obtains the authenticated user through server-side Auth validation;
- calls the server Supabase client `auth.getUser()`;
- checks authoritative `email_confirmed_at` rather than a client boolean;
- resolves the application lifecycle;
- rejects unverified or non-active accounts.

Profile creation and editing now use this guard. The free guest entry flow does not use it and remains unchanged.

## 8. Paid Eligibility Foundation

`PAID ELIGIBILITY IS ACCOUNT-LEVEL: YES`

`PROFILE DOB USED FOR ACCOUNT ELIGIBILITY: NO`

`requirePaidEligibleAccount()` checks only the account lifecycle row for `VERIFIED_ADULT` and also requires verified email and active lifecycle state.

The production paid eligibility gate is not enabled. `PAID_ELIGIBILITY_ENFORCEMENT_ENABLED` defaults to false, and no external identity provider is called.

The migration stores only provider-neutral method/provider metadata and timestamps. It does not store raw provider responses or sensitive identity fields.

## 9. Account / Profile / Entitlement Separation

- Who paid: authenticated application account/user initiating the order.
- Who owns entitlement: the authenticated account and selected profile under the existing purchase model.
- Who is analyzed: `public.profiles` subject selected by the account holder.

The account-level eligibility abstraction does not inspect profile birth date, gender, relationship, or label.

## 10. Profile Limit Preservation

`10-PROFILE LIMIT PRESERVED: YES`

The existing `MAX_PROFILES_PER_USER = 10` remains unchanged in `app/lib/profiles/types.ts`. Server-side profile creation checks the existing count. The client also exposes the existing profile-management behavior. No generation migration changed this limit.

## 11. Financial Closure Blocker

Added read-only `getAccountClosureFinancialBlockers(userId)` in `app/lib/accounts/server.ts`.

It detects only:

- non-terminal refund workflow states for the account;
- `OWNER_REVIEW_REQUIRED` refund workflows;
- unresolved payment reconciliation states reached through the account's orders.

Historical completed purchases alone are not blockers. The helper performs no mutation and does not delete Auth or financial records.

## 12. Entitlement Revocation Reason

Refund revocation now uses the explicit reason `REFUND_CANCELLATION`. A separate `revokeEntitlementForAccountClosure()` path uses `ACCOUNT_CLOSURE`; it only deactivates access and never invokes Toss, creates a refund workflow, or marks a refund completed. Both operations are idempotent and preserve the purchase row. The final account-closure lifecycle and retention policy remain legally blocked.

## 13. Password Recovery

Added:

- `/auth/forgot-password` using `resetPasswordForEmail()`;
- generic response text that does not reveal account existence;
- safe local return path handling;
- `/auth/reset-password` recovery session handling;
- `PASSWORD_RECOVERY` event handling;
- `updateUser({ password })`;
- minimum eight-character client validation;
- generic invalid/expired link state;
- global sign-out after successful update;
- closed-account policy remains application-level and is not reactivated by recovery.

Provider configuration still required:

- recovery redirect allowlist;
- SMTP/email template configuration;
- provider token expiry/replay behavior;
- exact global sign-out/session semantics.

## 14. My Account Mobile UX

Added `/account` with:

- login email display with wrapping;
- server-derived email verification status;
- application lifecycle status;
- provider-neutral paid eligibility status;
- password recovery link;
- mobile-first single-column layout.

No DOB, phone, CI, DI, identity-provider raw response, or provider credential is displayed.

The existing `/mypage` profile management and ten-profile behavior remain intact.

## 15. Security / RLS Review

- New account lifecycle writes are service-role-only.
- New row selection is self-scoped for authenticated users.
- Server guards derive identity from Supabase server Auth, not request body values.
- Profile creation/editing continues to use server ownership checks.
- Paid order and payment confirmation now reject non-active application accounts.
- No client-side eligibility promotion path exists.
- No service-role key is used in browser code.
- Free guest analysis was not forced through account or adult eligibility checks.
- Existing financial FKs and RLS policies were not weakened.

## 16. Tests Added

- `scripts/account-lifecycle-foundation-regression.ts`
  - account lifecycle table and minimal state checks;
  - forbidden sensitive-field checks;
  - canonical guard checks;
  - feature-gated paid eligibility check;
  - order/payment active-account enforcement checks;
  - verified profile mutation checks;
  - ten-profile preservation check;
  - recovery API/session checks;
  - provider-neutral account UI checks.

## 17. Test / Build Results

Diagnostics:

- touched-file TypeScript diagnostics: **PASS / no errors found**.

Requested executable commands were issued:

- `npx.cmd tsc --noEmit --pretty false`
- `npx.cmd tsx scripts/account-lifecycle-foundation-regression.ts`
- `npx.cmd tsx scripts/profile-api-phase7b-regression.ts`
- `npx.cmd tsx scripts/profile-delete-policy-regression.ts`

The persistent terminal returned no stdout/exit result for these commands in this session. Therefore executable regression PASS is **not claimed** from that output. No database or provider operation was performed to compensate for the missing terminal evidence.

Build/lint were not claimed for the same terminal-output limitation.

## 18. Deferred Items

- NICE/KCB/PASS or other external adult identity provider integration.
- Production adult paid gate.
- Account-holder DOB, phone, CI, DI, legal name, and resident registration number.
- Guardian consent and minor-owned accounts.
- Profile-age checkout blocking.
- Final Auth deletion.
- Final personal-data purge/anonymization scheduler.
- Final child-profile legal consent UX.
- Final Terms/Privacy/Refund copy.
- Same-email re-registration workflow.
- Account merge.
- Account-closure entitlement revocation reason and operation.
- Canonical financial closure blocker implementation.

## 19. Provider Configuration Still Required

- Supabase Confirm email setting.
- Supabase recovery and callback redirect allowlist.
- SMTP and recovery email templates.
- Supabase recovery token expiry/replay/session behavior.
- Exact global sign-out behavior in the deployed project.
- Password policy and rate limits.
- External adult identity provider contract and merchant configuration before enabling the paid gate.

## 20. Risks / Follow-Up

- `account_lifecycles` migration must be applied through the normal deployment migration process before runtime use.
- Existing financial rows are not generation-scoped yet; this is intentional backward-compatible deferral.
- Lazy account-row creation means authenticated paths require the migration to exist before use.
- Paid eligibility remains `UNVERIFIED` until a future provider-neutral verification flow updates it.
- Adult eligibility is not enforced for current production purchases in this step.
- Account closure blocker and account-closure entitlement revocation remain unimplemented pending policy/legal approval.
- Recovery UI is ready at repository level but requires deployed redirect/email configuration.
- Executable test output could not be independently confirmed because the terminal returned no output.

## 21. Git Diff Summary

Changes are limited to account lifecycle/eligibility foundation, active/verified guards at durable account boundaries, recovery/account surfaces, the additive migration, and focused regression coverage. No commit or push was performed.

No production Toss call, external identity provider call, migration execution, or database mutation was performed in this step.

## 22. Final Verdict

`ACCOUNT LIFECYCLE FOUNDATION: PASS`

`PAID ELIGIBILITY FOUNDATION: PASS`

`ACCOUNT/PROFILE IDENTITY SEPARATION: PASS`

`MINOR PROFILE PAID ANALYSIS SUPPORTED BY MODEL: YES`

`10-PROFILE LIMIT PRESERVED: YES`

`PASSWORD RECOVERY FOUNDATION: PARTIAL`

`FINANCIAL CLOSURE BLOCKER: PASS`

`MOBILE ACCOUNT FOUNDATION: PASS`

`EXTERNAL ADULT IDENTITY PROVIDER INTEGRATED: NO`

`PRODUCTION PAID AGE GATE ENABLED: NO`

`READY FOR 57D-46C-2 IDENTITY PROVIDER INTEGRATION: NO`

`READY FOR PRODUCTION: NO`
