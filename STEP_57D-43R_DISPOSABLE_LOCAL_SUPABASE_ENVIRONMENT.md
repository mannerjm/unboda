# STEP 57D-43R — PROVISION DISPOSABLE LOCAL SUPABASE TEST ENVIRONMENT

## A. Preflight

Completed before any setup attempt:

- `git status --short`
- `git branch --show-current`
- `git rev-parse HEAD`
- `git diff --check`

Existing tracked and untracked work was preserved. No reset, clean, stash, revert, delete, commit, or push was performed.

## B. Environment Inventory

- Docker Desktop / Docker Engine: **AVAILABLE**, Docker `29.7.2`
- Docker context/server: `docker-desktop`, Linux `x86_64`, server `29.7.2`
- `docker run --rm hello-world`: **PASS**
- Supabase CLI: **AVAILABLE via `npx.cmd --yes supabase`**, version `2.115.0`
- Node: **v24.18.0**
- npm: **11.16.0 via `npm.cmd`**
- PowerShell: **5.1.26100.9168**
- Local Supabase ports: 54321 API, 54322 DB, 54323 Studio, 54324 Mailpit
- `supabase/config.toml`: **present**, project id `unboda-local`
- `docker-compose.yml`: not required; Supabase CLI manages the local stack

## C. Installation Gate

No system software or project dependency was installed. Docker and the Supabase CLI were already available; the CLI was executed through `npx.cmd --yes` without adding a dependency or linking a remote project.

## D. Local Supabase Initialization

Local Supabase initialized: **YES**.

No project config was created, no migrations were overwritten, and no remote configuration was touched.

## E. Remote Safety Guard

The local config has project id `unboda-local`, localhost-only API/DB endpoints, and no remote project reference. The new `scripts/lib/disposable-supabase-target.ts` rejects non-local HTTP and PostgreSQL hosts. Its regression rejects `project.supabase.co`, `staging.internal`, and `db.example.com`.

No production or shared staging target was contacted. No failure-injection harness was run.

## F. Local Stack

Local Supabase running: **YES**.

Local API: `http://127.0.0.1:54321`; DB: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`; Studio: `http://127.0.0.1:54323`; Mailpit: `http://127.0.0.1:54324`.

## G. Migrations

Migrations locally applied: **YES**.

The STEP 57D-42 payment migration was not applied:

- `supabase/migrations/016_toss_payment_reconciliation.sql`

Production migration: **NO**.

Local reset replayed `001` through `016` successfully. The local `supabase_migrations.schema_migrations` table records all sixteen versions, including `016|toss_payment_reconciliation`.

The original `004_toss_payment_reconciliation.sql` conflicted with the existing `004_paid_reports.sql`. The Toss migration was moved to `016`, the next available version. The SQL body was preserved during the local rename; the applied local schema confirms the expected table. Because the former `004` was untracked and remote history was intentionally not queried, a byte-for-byte comparison against a prior committed file or remote migration history is unavailable. That is a documented history limitation, not a remote migration action.

## H. Fixtures and Cleanup

Test fixtures executable: **YES / READY**.

The reset verified clean `orders` and `toss_payment_records` tables and the required profile/purchase schema. No users, profiles, orders, or payment records were created in this setup step. Fixture cleanup/reset: **PASS** via `supabase db reset --local --yes --no-seed`.

## I. Deterministic Workflow

A deterministic local workflow is available through the project-local CLI:

1. verify Docker and `npx.cmd --yes supabase status --local`
2. reset/apply repository migrations with `npx.cmd --yes supabase db reset --local --yes --no-seed`
3. create synthetic fixtures using the later 57D-43P harness
4. run the STEP 57D-43P integration tests
5. reset the local database for cleanup

## J. Failure-Injection Readiness

The isolated database and localhost target guard are ready for the next step. The five scenarios were intentionally not executed here.

## K. Scheduled Reconciliation Readiness

The existing protected reconciliation route is locally invokable. A local readiness regression called it without the secret and received HTTP 401 before DB/provider work. No production scheduler was activated and no 57D-43P worker run was attempted.

## L. Security

- Production Supabase credentials used: **NO**
- Customer data copied: **NO**
- Live Toss secret used: **NO**
- Live Toss calls: **0**
- Production DB writes: **0**
- Mock-confirm production bypass introduced: **NO**
- Unsafe database target accessed: **NO**

## M. Stale Pricing Regression

Classification remains **A. STALE LEGACY EXPECTATION**. No Launch V1 pricing policy or `relationship-current` pricing was changed.

## N. Verification

Executed checks: Docker version/info/hello-world, `npx.cmd --yes supabase --version`, local `supabase start`, local `supabase status`, local `supabase db reset --local --yes --no-seed`, direct local PostgreSQL connectivity, schema/constraint/index/RLS queries, readiness regression, worker unauthorized invocation, TypeScript, and `git diff --check`.

The five failure-injection scenarios were not run because they belong to STEP 57D-43P.

## O. Required Metrics

- Docker available: **YES**
- Supabase CLI available: **YES via npx, 2.115.0**
- Local Supabase initialized: **YES**
- Local Supabase running: **YES**
- Disposable-target guard: **PASS**
- Production target rejection: **PASS** via guard regression
- Migrations locally applied: **YES**
- Payment persistence migration locally applied: **YES**
- Test fixtures executable: **YES / READY**
- Fixture cleanup/reset: **PASS**
- Reconciliation worker locally invokable: **YES / unauthorized guard verified**
- Five failure scenarios executed: **NO**
- Production DB writes: **0**
- Live Toss calls: **0**

## P. Side Effects

- System software installed: **none**
- Project dependencies changed: **none**
- New local Supabase files: `supabase/config.toml`, plus CLI runtime state under ignored `supabase/.temp`/`.branches`
- Migration files changed: **rename only: `004_toss_payment_reconciliation.sql` -> `016_toss_payment_reconciliation.sql`**
- Local disposable DB writes: **0**
- Production DB writes: **0**
- Live Toss calls: **0**
- Sandbox Toss calls: **0**
- Pricing changes: **0**
- Production payment activation: **NO**
- Production V4 activation: **NO**
- Commit: **NO**
- Push: **NO**

Production/shared DB contacted: **NO**.

Live Toss contacted: **NO**.

## Q. Final Decision

**A. DISPOSABLE SUPABASE ENVIRONMENT READY**

## R. Exact Next Step

STEP 57D-43P — EXECUTE TOSS PAYMENT FAILURE-INJECTION & RECONCILIATION CONVERGENCE PROOF

Do not execute 57D-43P as part of this report step. Use only the isolated `unboda-local` database and mocked Toss responses.
