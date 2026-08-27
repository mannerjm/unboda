# STEP 57D-46C-1V-R4 SCHEMA SECURITY FIX REPORT

## 1. Confirmed Defects

### Defect A: unsafe table privileges

Disposable catalog verification showed that `anon` and `authenticated` retained table-level `REFERENCES`, `TRIGGER`, and `TRUNCATE` privileges on `public.account_lifecycles`. `authenticated` also lacked the intended direct `SELECT` grant while the own-row RLS policy existed.

This did not satisfy the required client privilege contract.

### Defect B: generation 2 was impossible

`user_id` was the sole primary key while `generation` was immutable. After generation 1 existed, generation 2 could neither be inserted nor created by mutating generation 1.

This contradicted the approved same-Auth-identity/new-application-generation policy.

## 2. Root Causes

- Migration 024 relied on partial `REVOKE` statements instead of explicitly revoking all client table privileges and then granting only authenticated `SELECT`.
- The first schema used `user_id` as the lifecycle table primary key, encoding one row per Auth user rather than one immutable lifecycle row per `(user_id, generation)`.
- The server helper used `upsert(... onConflict: user_id)` and therefore also assumed one permanent lifecycle row per Auth user.

## 3. Files Changed

- `supabase/migrations/024_account_lifecycle_paid_eligibility.sql`
- `supabase-r6-disposable/supabase/migrations/024_account_lifecycle_paid_eligibility.sql`
- `app/lib/accounts/server.ts`
- `scripts/account-lifecycle-foundation-regression.ts`

No other application, payment, refund, provider, or product files were changed.

## 4. Lifecycle Key Model

`public.account_lifecycles` now uses:

- surrogate immutable row ID `id uuid primary key default gen_random_uuid()`;
- `user_id uuid not null references auth.users(id) on delete restrict`;
- `generation integer not null default 1`;
- unique constraint `account_lifecycles_user_generation_unique` on `(user_id, generation)`.

This permits:

- user A generation 1 CLOSED;
- user A generation 2 ACTIVE;
- additional historical CLOSED generations.

Generation remains positive and immutable through the existing check plus database trigger.

## 5. Current-Lifecycle Uniqueness Model

A unique partial index now enforces:

```sql
unique (user_id) where status <> 'CLOSED'
```

Index name:

`account_lifecycles_one_current_idx`

This allows multiple CLOSED historical rows while preventing two simultaneous `ACTIVE` or `DELETION_REQUESTED` rows for one Auth user.

## 6. Current Lifecycle Resolution

`getAccountLifecycle()` now orders by descending generation and returns the latest lifecycle row.

`ensureAccountLifecycle()` now:

1. reads the latest row for the Auth user;
2. returns it if present, including a CLOSED row;
3. inserts generation 1 only when no row exists;
4. if a concurrent insert loses the race, re-reads and returns the existing row;
5. never silently creates generation 2;
6. leaves deliberate future-generation creation to a later controlled reactivation flow.

Existing CLOSED-only users are not silently reactivated by ordinary protected access; active guards continue to reject non-ACTIVE state.

## 7. Generation Immutability

The database trigger remains:

- function: `prevent_account_lifecycle_generation_change()`;
- trigger: `account_lifecycles_generation_immutable`.

Any update changing `generation` raises an exception. Future generation creation is by insertion of a new row, subject to `(user_id, generation)` uniqueness and the one-current partial index.

## 8. Paid Eligibility Generation Scope

Eligibility columns remain on each lifecycle row, so eligibility is generation-scoped rather than permanently attached to the Auth identity.

New lifecycle rows use the safe defaults:

- `paid_eligibility_status = 'UNVERIFIED'`;
- no provider method or provider identifier;
- no verification timestamp.

No `GUARDIAN_CONSENTED` state or sensitive identity field was added. Existing entitlement/profile/payment FKs were not rewritten.

## 9. Table Privilege Contract

Migration 024 now explicitly executes:

```sql
revoke all on public.account_lifecycles from anon, authenticated;
grant select on public.account_lifecycles to authenticated;
grant select, insert, update, delete on public.account_lifecycles to service_role;
```

Effective intended contract:

- `anon`: no direct table privileges;
- `authenticated`: direct `SELECT` only, further restricted by own-row RLS;
- `service_role`: controlled server management.

Explicitly:

`AUTHENTICATED CAN TRUNCATE ACCOUNT_LIFECYCLES: NO`

`AUTHENTICATED CAN UPDATE PAID ELIGIBILITY: NO`

`ANON CAN ACCESS ACCOUNT_LIFECYCLES: NO`

The privilege changes require disposable DB reset/reapply before runtime catalog proof. No database command was run in this step.

## 10. RLS Contract

RLS remains enabled with the single own-row read policy:

`account_lifecycles_select_own`

Predicate:

`auth.uid() = user_id`

No authenticated insert/update/delete policy was added. The explicit table-level revoke prevents DML, `TRUNCATE`, `TRIGGER`, `REFERENCES`, and other direct table privileges from being granted to browser roles.

## 11. Regression Updates

`scripts/account-lifecycle-foundation-regression.ts` now structurally asserts:

- lifecycle table exists;
- generation is positive;
- generation immutability trigger exists;
- `(user_id, generation)` unique constraint exists;
- one-current partial index exists;
- explicit client privilege revoke exists;
- authenticated `SELECT` grant exists;
- minimal eligibility remains provider-neutral;
- profile DOB is not used for eligibility;
- existing profile limit remains 10.

The regression does not use arbitrary `ci`/`di` substring checks.

## 12. Deferred Re-registration Logic

The schema now permits future generation 2 and later generations, but C-1/R4 does not add reactivation or re-registration UI/API.

Ordinary `ensureAccountLifecycle()` does not create generation 2. A future controlled server transition must explicitly insert a new generation after validating the closed current lifecycle and policy conditions.

Old profiles, reports, entitlements, active profile, and consent state are not automatically restored by this schema repair. Existing financial evidence remains on its existing model.

## 13. Manual Verification Commands Required

The human operator must reset and reapply the disposable stack only:

```powershell
npx.cmd supabase db reset --workdir supabase-r6-disposable
npx.cmd tsx scripts/account-lifecycle-foundation-regression.ts
```

Then inspect disposable catalog privileges and constraints. Expected results:

- migration 024 applies after migrations 001-023;
- `account_lifecycles` has surrogate primary key `id`;
- unique `(user_id, generation)` exists;
- partial unique current index exists;
- immutable-generation trigger exists;
- RLS is enabled;
- anon has no table privileges;
- authenticated has only `SELECT`, constrained by own-row RLS;
- authenticated has no `TRUNCATE`, `TRIGGER`, `REFERENCES`, or DML;
- service-role management remains available.

Do not use evidence `54321`, production/shared Supabase, Toss, or historical TEST payment data.

## 14. Final Static Verdict

`MULTIPLE LIFECYCLE GENERATIONS SUPPORTED BY SCHEMA: YES`

`GENERATION IMMUTABLE: YES`

`AT MOST ONE CURRENT LIFECYCLE PER AUTH USER: YES`

`AUTHENTICATED CAN TRUNCATE LIFECYCLE TABLE: NO`

`AUTHENTICATED CAN SELF-PROMOTE ELIGIBILITY: NO`

`ANON LIFECYCLE ACCESS: NO`

`PROFILE DOB USED FOR ELIGIBILITY: NO`

`C-1 VERIFICATION GATE: NOT YET RE-RUN`

`READY FOR C-2: NO`

`READY FOR PRODUCTION: NO`
