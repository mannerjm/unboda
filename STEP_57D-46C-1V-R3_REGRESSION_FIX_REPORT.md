# STEP 57D-46C-1V-R3 REGRESSION FIX REPORT

## Failing Assertion

The manual C-1 foundation regression failed at:

```text
FAIL: migration excludes ci
```

The failing assertion was in `scripts/account-lifecycle-foundation-regression.ts`:

```ts
for (const forbidden of ["GUARDIAN_CONSENTED", "birth_date", "phone", "ci", "di", "resident"])
  assert(!migration.toLowerCase().includes(forbidden.toLowerCase()), ...);
```

## Exact Matched Text

The `ci` substring matched the ordinary word `financial` in migration 024's comment:

```sql
-- Analysis profiles and financial records retain their existing ownership/FKs.
```

The match was not a SQL column, persisted value, metadata field, or identity-provider field.

## Migration Schema Truth

Migration 024 does not define or persist any of the following prohibited data:

- `ci`
- `di`
- `resident_registration_number`
- Korean resident registration number
- account-holder DOB
- account-holder `birth_date`
- `phone`
- `phone_number`
- `legal_name`
- raw identity-provider response

The migration contains only provider-neutral lifecycle and eligibility fields, including lifecycle state, generation, eligibility state, provider-neutral method/provider metadata, policy version, and timestamps.

## Root Cause

The regression used whole-file case-insensitive substring matching. Two-letter sensitive identifiers such as `ci` and `di` can occur inside unrelated words, so the test produced a false positive.

The migration itself was not the defect.

## Files Changed

Only this regression file was changed:

- `scripts/account-lifecycle-foundation-regression.ts`

The migration was not modified. No application behavior, database schema, provider configuration, payment/refund logic, or product policy was changed.

## Corrected Assertion Strategy

The migration assertion now checks for an identifier-like SQL column declaration rather than arbitrary text anywhere in the file.

It rejects declarations conceptually matching:

```sql
ci text
 di text
phone_number text
birth_date date
```

It does not reject ordinary words containing those letter sequences, such as `financial` or `provider`.

The checked prohibited identifiers now include:

- `GUARDIAN_CONSENTED`
- `birth_date`
- `phone`
- `phone_number`
- `ci`
- `di`
- `dob`
- `resident_registration_number`
- `legal_name`

The account UI provider-neutral assertion was also changed from broad `includes("ci")` matching to token-aware checks for standalone `CI`/`DI` and explicit sensitive labels such as `주민등록번호`, `전화번호`, and `생년월일`.

The safety assertions remain in place; they were narrowed to identify actual sensitive field/label declarations rather than removing coverage.

## Validation

Editor diagnostics report no errors for:

- `scripts/account-lifecycle-foundation-regression.ts`
- `supabase/migrations/024_account_lifecycle_paid_eligibility.sql`

The manual operator should rerun the C-1 foundation regression. No commands were run through the Copilot terminal channel in this step.
