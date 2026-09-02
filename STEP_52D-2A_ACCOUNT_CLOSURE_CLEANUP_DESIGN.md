# STEP 52D-2A Account Closure Cleanup Design

## 1. Executive Verdict

**Verdict: PASS for a narrowly scoped 52D-2B implementation, subject to the owner and legal questions in this document.**

The current closure architecture provides the correct safety boundary: financial blockers are checked before cleanup; database minimization is atomic and idempotent; Auth tombstoning and the `CLOSED` transition occur only after `data_scrubbed_at` is set; retry and claim/lease state remains durable. The missing work is specific and implementation-ready:

- scrub member `free_analysis_results` personal snapshot, fingerprint, and content;
- remove birth-derived fields from retained `analysis_reference_snapshot` values while preserving only a justified generic anchor;
- explicitly handle transferred Guest tombstones still present before their independent seven-day deletion;
- add deterministic legacy-`CLOSED` backfill coverage;
- preserve financial/order/refund/edition linkage and all existing retry protections.

52D-2B is safe to begin as a server-only/database-cleanup extension, but it must not finalize an account while the required minimization phase has failed.

## 2. Current Account-Closure Architecture

### Request and cancellation

- Request route: `app/api/account/request-closure/route.ts`, `POST`.
- Service function: `requestAccountClosure(userId)` in `app/lib/accounts/server.ts`.
- It reads the verified session identity, ensures the lifecycle row, checks financial blockers, and changes only `ACTIVE` to `DELETION_REQUESTED`.
- Cancellation route: `app/api/account/cancel-closure/route.ts`, `POST`.
- Service function: `cancelAccountClosureRequest(userId)`.
- Cancellation changes `DELETION_REQUESTED` back to `ACTIVE` only when `finalization_started_at` is null. It cannot cancel `CLOSED` or a finalization already started.

### Finalization and scheduler

- Shared scheduler: `app/api/internal/reconcile/route.ts`.
- Account worker: `reconcileAccountClosureFinalizations()` in `app/lib/accounts/server.ts`.
- Claim and retry migration: `supabase/migrations/027_account_closure_retry_claim_lease.sql`.
- Claim RPC: `claim_account_closure_finalizations`.
- Retry RPC: `record_account_closure_retry`.
- Escalation RPC: `escalate_account_closure_owner_review`.
- Release RPC: `release_account_closure_claim`.
- Claims are bounded, use `FOR UPDATE SKIP LOCKED`, and use expiring claim tokens. Technical failure and financial wait are retried; ambiguous, non-retryable, or exhausted failures enter owner review.

### Database cleanup and Auth finalization

- Database cleanup service function: `executeAccountClosureDbCleanup(userId)`.
- Database cleanup RPC: `execute_account_closure_db_cleanup(p_user_id)`.
- Primary RPC definition: `supabase/migrations/026_account_closure_db_cleanup_rpc.sql`.
- Current snapshot-clearing extension: `supabase/migrations/031_immutable_analysis_input_snapshot.sql`.
- Auth and lifecycle finalization service function: `finalizeAccountClosureAuthIdentity(userId)`.
- Full orchestrator: `finalizeAccountClosure(userId)`.

Current ordering is:

1. `ACTIVE` -> `DELETION_REQUESTED` after request-time financial checks.
2. Scheduler claims the lifecycle row and sets `finalization_started_at`.
3. `execute_account_closure_db_cleanup` takes the per-user advisory lock, locks the lifecycle row, rechecks financial blockers, performs DB cleanup atomically, and sets `data_scrubbed_at` while leaving status `DELETION_REQUESTED`.
4. Auth identity is read and changed to the deterministic tombstone identity; user metadata is cleared and the change is verified.
5. The lifecycle row is atomically changed to `CLOSED` with `finalized_at`.
6. Claim state is released on successful worker completion.

The exact database transaction boundary is the execution of the cleanup RPC. It includes the financial safety check, active-profile deletion, profile tombstoning, paid-report scrubbing, entitlement revocation, input-snapshot clearing, and `data_scrubbed_at`. Auth Admin calls are outside that database transaction. The final lifecycle update is a separate database operation after Auth verification.

This ordering prevents `CLOSED` from being recorded before DB cleanup. If DB cleanup succeeds but Auth fails, the account remains `DELETION_REQUESTED` with `data_scrubbed_at` set and is retryable. If Auth succeeds but the final lifecycle update fails, a retry sees the deterministic Auth tombstone and can complete the lifecycle transition. Existing owner-review paths must remain unchanged.

## 3. Customer-Data Inventory Matrix

| Table or surface | Relevant data | Classification | Current closure behavior | 52D-2B target |
|---|---|---|---|---|
| `profiles` | label, relationship, birth date/time, gender, calendar, leap-month flag | Direct personal data and birth-derived personal data | Tombstoned to non-customer placeholder values; UUID and timestamps remain | Preserve this existing tombstone behavior; do not delete because restricted FKs depend on profile identity |
| `active_profiles` | current user/profile selection | Account linkage and UI state | Deleted | Continue deleting; it is not transaction evidence |
| `free_analysis_results` | `profile_snapshot`, `profile_fingerprint`, `content`, status/error/generation timestamps, user/profile IDs | Birth-derived data, derived personal identifier, personalized AI content, account linkage, operational metadata | Not currently scrubbed by closure RPC | Scrub personal snapshot, fingerprint, and content in place; retain only the minimum operational/linkage tombstone required by FK and retry behavior |
| `guest_free_analyses` | Guest hash, lifecycle, profile input/fingerprint/content, transfer linkage | Guest credential/security data, birth-derived data, personalized content, transfer linkage | Independent 52D-1B cleanup; transferred rows are minimized and hard-deleted at `created_at + 7 days` | Do not redesign 52D-1B. Closure may delete remaining transferred tombstones by exact `transferred_user_id` only if safe; never restore or retain Guest personal payload |
| `orders` | user/profile IDs, product, amount, status, provider/transaction IDs, edition key, reference/input snapshots | Financial metadata, account/profile linkage, generic edition metadata, birth-data snapshot | Input snapshot cleared; financial identity retained | Keep order identity, amount, status, provider/transaction and edition linkage. Keep `analysis_input_snapshot` null after closure. Minimize reference snapshot only as designed below |
| `purchases` | user/profile/order IDs, product, purchase time, edition key, reference/input snapshots | Financial/history metadata, account/profile linkage, generic edition metadata, birth-data snapshot | Input snapshot cleared through the cleanup RPC | Keep immutable purchase linkage and edition identity. Keep input snapshot null. Minimize reference snapshot only as designed below |
| `paid_reports` | IDs, product/edition/purchase linkage, status/error/timestamps, content | Personalized AI content plus transaction/report linkage and operational metadata | Content replaced with `{"scrubbed": true}`; linkage and status remain | Preserve the existing scrub marker and linkage; ensure generating, completed, and failed rows are covered idempotently |
| `entitlements` | user/profile/resource/purchase/edition IDs, active/revoked state and timestamps, reference snapshot | Account/transaction linkage, catalog metadata, birth-derived reference context | Active entitlements revoked with `ACCOUNT_CLOSED`; reference snapshot remains | Revoke as today; minimize reference snapshot if present without changing resource, purchase, edition, or revocation evidence |
| `toss_payment_records` | order/payment/provider status, amounts, reconciliation and retry evidence | Financial/provider/audit metadata; payment key is security-sensitive | Retained and protected by financial blockers/triggers | Do not scrub or delete financial evidence; do not expose payment keys |
| `refund_workflows` | order/payment/user/profile linkage, refund state, retry/error/evidence fields | Financial/refund/audit metadata | Unresolved states block closure | Preserve rows and evidence; closure must remain blocked until allowed by current predicate |
| `account_lifecycles` | lifecycle, eligibility state, timestamps, retry/claim/error state | Account lifecycle, security/operational metadata | `DELETION_REQUESTED` then `CLOSED`; retry state retained | Preserve minimal lifecycle and retry/audit state; revoke paid eligibility as already represented by closure behavior; do not invent NICE fields |
| `operator_roles` / `operator_audit_events` | operator identity, action, hashed target reference, outcome/correlation/reason | Security/audit metadata | No closure cleanup behavior | Retain for operator accountability. Do not place customer payloads in audit fields |
| `interested_analyses` | user/profile/product IDs and timestamps | User-controlled saved state and account linkage; no embedded analysis content | Not currently part of closure RPC | Delete user-controlled saved rows or make them inaccessible after closure; never use them as purchase truth |
| recommendation/save/library views | IDs and server-derived report/result access | UI state and account linkage; content may be fetched from protected sources | Depends on underlying tables | Ensure closed accounts cannot read protected content; do not delete order/purchase history merely to hide a library view |
| Auth identity | email, metadata, auth account ID | Identity/security metadata | Email tombstoned; user metadata cleared; Auth identity remains for referential integrity | Preserve deterministic tombstone and clear unnecessary metadata; do not invent future verification-provider fields |

`operator_audit_events` has restrictive Auth and operator FKs. It should not be cascaded or rewritten as part of customer cleanup.

## 4. Member Free-Analysis Cleanup Recommendation

### Current fields and uses

`free_analysis_results` is defined in `supabase/migrations/008_free_analysis_results.sql` with:

- `id`;
- `user_id` and `profile_id` foreign keys;
- non-null `profile_fingerprint`;
- non-null `profile_snapshot`;
- `status` in `generating`, `completed`, or `failed`;
- nullable `content` constrained to be present for `completed`;
- `error_code` and lifecycle timestamps.

Runtime reads and writes are in `app/lib/freeAnalysisResults/server.ts`, with result APIs in `app/api/free-analysis/[profileId]/route.ts`, refresh, and retry routes. Those paths use content and fingerprint to serve or invalidate active-account cached results. They must not serve a scrubbed closed-account row. The profile snapshot is used as stored analysis metadata and must not survive closure as a birth-data copy.

### Recommended state

Use **scrub in place**, not hard delete, for the first 52D-2B slice:

- `content = null`;
- `profile_snapshot =` a minimal non-personal scrub marker or `null` only if the schema is deliberately made nullable;
- `profile_fingerprint =` a non-reversible closure marker or `null` only if the schema is deliberately made nullable;
- preserve `id`, `user_id`, `profile_id`, `status`, `error_code`, and timestamps only where required for operational idempotency and restricted linkage;
- ensure `status = 'completed'` is changed or its content constraint is extended so a scrubbed completed tombstone remains valid;
- add a closed-account access guard through the existing account-access boundary.

Do not invent a customer-recoverable placeholder that can be mistaken for a real result. A deterministic generic scrub marker is preferable to a birth-derived or content-derived value if a non-null schema requirement is retained.

Hard deletion is not currently proven safe because `profile_id` has `ON DELETE CASCADE` for this table while `user_id` is tied to Auth, and runtime uniqueness/retry behavior may depend on the row. It may be considered later, but scrubbing is the smaller change and avoids changing result identity semantics.

### State coverage

The cleanup must handle `generating`, `completed`, and `failed` rows. There is no reason to retain original content for any state after closure. Failed and generating rows may contain partial or cached personal data and must be scrubbed as well. Error metadata must be reviewed for accidental input/content leakage; current `error_code` is operational and should remain only if bounded and non-sensitive.

The cleanup belongs in the existing `execute_account_closure_db_cleanup` transaction. This gives the free-result cleanup the same financial precondition, per-user advisory lock, lifecycle lock, and `data_scrubbed_at` idempotency boundary as profile/report cleanup.

## 5. Paid Content/Input Snapshot Re-Verification

### Paid reports

`paid_reports.content` is personalized paid analysis JSON and is already replaced with the scrub marker by the closure RPC. The update applies by `user_id` and includes rows regardless of report status, so generating, completed, and failed rows are covered. `paid_reports.error_code` and lifecycle timestamps remain operational metadata; 52D-2B should verify they contain no report content or birth data before retaining them.

`paid_reports` has restricted profile linkage and a purchase FK with `ON DELETE SET NULL`. Do not change those IDs/statuses or delete rows as part of this slice.

### Orders and purchases

Migration 031 adds nullable `analysis_input_snapshot` to orders and purchases and extends the closure RPC to clear both snapshots. The snapshot parser in `app/lib/analysisInputSnapshot.ts` confirms this is canonical birth-analysis input, so clearing it matches the frozen policy. The order/purchase amount, status, payment provider/transaction identity, order relation, product, and edition key remain financial/history metadata.

`analysis_reference_snapshot` is a different field and is addressed in Section 6. It must not be confused with the already-cleared input snapshot.

### Entitlements and revocation

Closure revokes active entitlements with `revocation_reason = 'ACCOUNT_CLOSED'`. This must remain unchanged. Entitlement identity and purchase/edition linkage are needed to preserve the financial boundary and prevent reactivation or accidental new-sale eligibility. No new paid entitlement may be granted to a closed account.

## 6. `analysis_reference_snapshot` Field Classification and Target

The current application type is in `app/lib/analysisEditionForOrder.ts`. The current consumers are:

- `app/lib/purchases/server.ts`, which stores and recovers the frozen reference snapshot;
- `app/lib/paidReports/generation.ts`, which reads `anchorDate` for report generation context;
- `app/api/paid-analysis-detail-v2/route.ts`, which reads the reference snapshot for detail access;
- `app/lib/analysisEditionLabel.ts`, which accepts the reference snapshot for display labeling.

Current shape is a typed object with an `anchorDate` and optional `fortune` context containing fields such as `daeunOrder`, `daeunGanji`, and `seunGanji`. The exact runtime value is treated defensively as unknown in persistence and is not a financial key.

| Field | Classification | Needed for purchase/entitlement/refund? | Needed to display history? | Needed to regenerate exact report? | Closure target |
|---|---|---|---|---|---|
| `anchorDate` | Generic temporal reference, but potentially linked to the selected analysis context | No direct financial need | Possibly, for edition/period labeling | Yes, where generation is deferred and the anchor is part of the frozen context | May remain only if current generation/display code proves it is generic and non-personal; otherwise remove |
| `fortune.daeunOrder` | Birth-derived personalized context | No | No | Potentially yes for exact regeneration, but regeneration after closure is not permitted | Remove |
| `fortune.daeunGanji` | Birth/saju-derived personalized context | No | No | Potentially yes for exact regeneration, but not after closure | Remove |
| `fortune.seunGanji` | Birth/saju-derived personalized context | No | No | Potentially yes for exact regeneration, but not after closure | Remove |
| Unknown extra keys | Unverified; may contain personal or generated context | No by default | No by default | No after closure | Allowlist only the justified generic field; remove all other keys |

Recommended retained structure is either `{}` or `{ anchorDate }` only after a code-level proof that `anchorDate` cannot be used to recover or infer the person’s birth/saju context and that retaining it has a real history/edition purpose. The strong default is to remove `fortune` entirely and retain no reference snapshot if no consumer requires the anchor after closure.

The cleanup must be a JSONB transformation inside the existing closure RPC, not a recomputation. It must be idempotent, must not touch `analysis_edition_key`, and must not alter order/purchase/entitlement/report identity.

## 7. Profile Tombstone Review

The current cleanup RPC updates every profile for the closing user to:

- label `ANONYMIZED`;
- relationship type `other`;
- birth date `1900-01-01`;
- birth time `00:00:00`;
- gender `male`;
- calendar type `solar`;
- leap-month false.

It retains the profile UUID and timestamps to satisfy restricted financial/report FKs. The placeholder is not a customer value and must never be presented as a real profile after closure.

Potential risk: any post-closure code that queries the profile directly could treat the placeholder as meaningful saju input. The existing `evaluateAccountServiceAccess` rejects `CLOSED`, and paid purchase eligibility rejects non-`ACTIVE`; 52D-2B must ensure all profile/result/report routes use the same account boundary and do not offer closed-account analysis or regeneration. Re-signup creates a new lifecycle/account context and must not recover the old profile or result rows.

Do not replace the existing tombstone values in this design. A later migration may introduce explicit nullable scrub fields, but that is a larger schema decision and is not required for the smallest safe slice.

## 8. Interests, Library, and History Treatment

- `active_profiles` is transient UI state and is already deleted.
- `interested_analyses` contains profile/product linkage and timestamps, not purchase truth. Delete rows for a closed user or make them unreachable through the account boundary. Deletion is preferable for user-controlled saved state, subject to a small FK-safe test.
- Purchased-analysis library views are derived from entitlements, purchases, orders, and reports. Closure should make the library unavailable by account access and entitlement revocation, but must not erase orders, purchases, refunds, payment records, or exact edition linkage.
- `orders`, `purchases`, and `entitlements` may retain profile/account linkage as minimal history and integrity linkage. Retaining linkage is not itself proof that all linked personal payloads may remain; the payload fields must still be scrubbed.
- No saved/recommendation row may act as a backdoor to recover scrubbed free or paid content after closure.
- A future re-signup must create a new account state and must not restore old profiles, free analyses, paid reports, or library content.

## 9. Guest 52D-1B Interaction

52D-1B remains authoritative and is not redesigned:

- first transfer is limited by the existing 24-hour `expires_at` contract;
- successful transfer atomically copies the member result and scrubs Guest profile input, fingerprint, and content;
- the minimized tombstone retains only retry/transfer linkage needed for same-member/same-secret retry;
- every Guest row is hard-deleted at the absolute `created_at + 7 days` boundary through the shared bounded worker.

Closure cleanup still needs an explicit policy for a transferred tombstone that remains before day seven. The smallest safe 52D-2B behavior is to delete only rows where `transferred_user_id = p_user_id` and `consumed_at IS NOT NULL`, after the account closure financial checks and under the same per-user cleanup transaction. This does not reintroduce Guest personal data and is idempotent. If the owner policy prefers to preserve the independent seven-day lifecycle exactly, closure may leave the tombstone for 52D-1B; that choice must be explicit.

Untransferred Guest rows have no `transferred_user_id` and must not be deleted by a member closure. They remain governed by the Guest seven-day cleanup. A closure before day seven therefore cannot affect an untransferred anonymous session.

## 10. Auth and Eligibility Metadata Treatment

- Auth email is changed to the existing deterministic tombstone identity and user metadata is cleared by `finalizeAccountClosureAuthIdentity`.
- `account_lifecycles.status` becomes `CLOSED` only after DB cleanup and Auth verification.
- Paid eligibility is not a separate provider record. The lifecycle contains `paid_eligibility_status`, method/provider fields, and timestamps. Closure must prevent future paid use and preserve only the minimal lifecycle/security metadata needed for audit and fail-closed decisions.
- Existing paid eligibility should be revoked or remain unusable through `CLOSED`; the implementation must not invent NICE fields or claim NICE verification exists.
- Any provider/method/version/timestamp fields that are not needed for security, audit, or policy proof should be cleared only after an owner/legal decision. This design does not invent a provider-retention rule.

## 11. Financial Integrity Boundary

The following must remain intact:

- order IDs, purchase IDs, payment record IDs, refund workflow IDs, and immutable order/purchase relationships;
- amount, currency, payment provider, transaction/provider references, status, paid time, refund state, retry state, and provider evidence;
- exact product and `analysis_edition_key` linkage;
- entitlement identity, purchase source, revocation state, and `ACCOUNT_CLOSED` reason;
- `OWNER_REVIEW_REQUIRED` and unresolved financial blockers;
- duplicate-payment and refund investigation evidence;
- account-closure financial advisory locking and write-protection triggers.

The minimum linkage retained after closure is the restricted account/profile/order/purchase/entitlement/report identity needed to prevent orphaned financial records, reconcile refunds, investigate disputes, and prove the purchased edition. That linkage is different from retaining customer birth data or personalized content.

Closure cleanup must never mutate payment reconciliation status, refund workflow status, provider keys, transaction evidence, order amount/status, purchase identity, or edition identity. It must run only after the existing blocker predicate passes. Existing financial writes remain blocked once `data_scrubbed_at` or `CLOSED` is set.

## 12. Retry and Idempotency Matrix

| Failure or retry case | Required behavior |
|---|---|
| DB cleanup succeeds, worker response is lost | `data_scrubbed_at` makes a second DB cleanup a no-op; Auth/finalization retry continues |
| DB cleanup runs twice | Same updates produce the same scrubbed/tombstoned state; no restoration of content or snapshots |
| Free-analysis cleanup partially runs before crash | The RPC transaction rolls back as a unit; retry repeats all cleanup, or the expanded per-row updates are idempotent within the same transaction |
| Reference snapshot already minimized | JSONB minimization is a no-op and cleanup still returns success |
| Paid report already scrubbed | Existing scrub marker remains unchanged |
| Guest tombstone already deleted by 52D-1B | Closure delete affects zero rows and succeeds |
| Auth tombstone succeeds after DB cleanup retry | Deterministic email check skips duplicate Auth mutation; lifecycle update completes |
| Auth finalization fails after DB minimization | Account remains `DELETION_REQUESTED` with `data_scrubbed_at`; scheduler retries Auth finalization and never restores data |
| Scheduler claims same closure twice | Existing lease and claim token prevent concurrent ownership; expired claims are reclaimable |
| Owner-review path | Cleanup errors do not clear owner-review evidence; unresolved financial/ambiguous errors remain escalated |
| Re-signup after closure | New lifecycle/account access cannot recover scrubbed rows or old profile/report content |

No retry operation may repopulate a scrubbed profile snapshot, free result, paid report, input snapshot, or reference snapshot.

## 13. Recommended Transaction and Ordering Architecture

Choose **Option A: extend `execute_account_closure_db_cleanup()`**.

This is the smallest safe architecture because the existing RPC already owns:

- the per-user advisory lock;
- lifecycle row lock;
- financial blocker recheck;
- atomic profile/report/entitlement/input cleanup;
- `data_scrubbed_at` as the completion marker;
- idempotent retry behavior.

Add free-result scrubbing, reference-snapshot minimization, and the exact transferred-Guest tombstone treatment to the same transaction. Keep Auth tombstoning and the final `CLOSED` update in their existing phase. Do not create a second cleanup scheduler or customer-facing endpoint.

The RPC must fail before setting `data_scrubbed_at` if any required cleanup statement fails. The existing orchestrator therefore cannot record `CLOSED` while required DB cleanup is incomplete. Keep the scheduler claim/retry/owner-review architecture unchanged.

## 14. Migration and Schema Plan for 52D-2B

Do not edit historical migrations. Add one new migration after 035 that:

1. makes `free_analysis_results` scrub-compatible without weakening active-account constraints;
2. replaces or extends the closure cleanup RPC with the same signature and financial preconditions;
3. scrubs `free_analysis_results` by user for all states;
4. minimizes `analysis_reference_snapshot` using an explicit allowlist and removes `fortune` birth-derived fields;
5. optionally deletes transferred Guest tombstones by exact user linkage if that owner decision is approved;
6. retains all order, purchase, entitlement, report, payment, refund, and edition IDs/statuses;
7. preserves idempotency and the `data_scrubbed_at` boundary;
8. adds no claim/lease state unless the existing closure claim/retry model proves insufficient.

The likely schema choice for free results is to make only the scrubbed personal fields nullable, then preserve a non-personal operational tombstone row. If the team instead chooses a hard delete, it must first prove all runtime retry/cache paths and FK behavior with a disposable DB test. No schema change should make active rows capable of silently carrying incomplete data.

## 15. Existing CLOSED-Account Backfill Plan

Accounts with `status = 'CLOSED'` and a completed finalization may predate this cleanup and can still contain:

- member free-analysis content, profile snapshots, or fingerprints;
- birth-derived reference snapshot fields;
- transferred Guest tombstones not yet past the independent seven-day boundary.

A 52D-2B migration should not assume old `CLOSED` rows are already compliant. Recommended rollout:

1. Add a bounded, service-role-only backfill operation or migration transaction that targets only `account_lifecycles.status = 'CLOSED'` with the relevant existing linkage.
2. Reuse the same idempotent scrub transformations as the live closure RPC.
3. Preserve financial evidence and exact order/purchase/edition linkage.
4. Process in bounded batches if production volume requires it, with metrics containing counts only.
5. Record a non-customer-sensitive completion marker or migration version only if needed for safe resumability; do not add convenience state without a proven need.
6. Verify no content/snapshot/fingerprint remains for each processed account without printing values.
7. Run the backfill in a maintenance window or controlled rollout because it affects retained historical data and should be separately reviewed by owner/legal stakeholders.

Do not execute this backfill in 52D-2A or against remote data. Existing closed accounts must not remain permanently exempt, and the rollout must include a recovery plan for a process interruption.

## 16. Security and Privacy Requirements

52D-2B must guarantee:

- no free-analysis content, profile snapshot, fingerprint, birth/saju input, or paid report content in logs;
- no customer email, payment key, raw Guest credential, service-role key, or scheduler secret in logs or responses;
- no customer-facing cleanup endpoint;
- service-role database access remains server-only;
- all cleanup is scoped by verified `user_id` or exact transferred Guest linkage;
- scrubbed content cannot be restored by retry, re-signup, report generation, or library access;
- closed accounts cannot access tombstoned profiles or result/report routes;
- no payment/refund mutation is performed by data minimization;
- operator audit records contain only bounded action metadata and hashed references.

Any diagnostic output from a backfill or scheduler must expose aggregate counts and sanitized error categories only.

## 17. Regression and Local DB Test Plan

| Test | Classification | Required proof |
|---|---|---|
| Closure blocked by unresolved refund/payment work | Local DB integration + scheduler regression | Existing blocker predicate prevents any scrub or `data_scrubbed_at` update |
| Normal closure finalizes | Local DB integration | DB cleanup, Auth tombstone, and final `CLOSED` ordering succeeds |
| Profile personal fields tombstoned | Local DB integration | All current profile personal fields become the approved placeholder and cannot be used as customer input |
| Member free content removed | Local DB integration | `free_analysis_results.content` is unavailable for generating/completed/failed rows |
| Member free snapshot removed | Local DB integration | `profile_snapshot` is scrubbed or null per selected schema |
| Member free fingerprint removed | Local DB integration | Fingerprint is null or a non-personal scrub marker, never the original value |
| All free-analysis states handled | Local DB integration | Generating, completed, failed, stale, and retry metadata remain valid without personal payload |
| Paid report content remains scrubbed | Local DB integration | Existing scrub marker and report identity remain intact |
| Paid input snapshots remain cleared | Local DB integration | Orders and purchases retain financial identity but have null input snapshots |
| Reference snapshot minimized | Local DB integration | Fortune/birth-derived keys removed; only explicitly justified generic metadata remains |
| Entitlements revoked | Local DB integration | Active entitlement becomes inactive with `ACCOUNT_CLOSED`; edition/purchase linkage remains |
| Financial/order/refund rows intact | Local DB integration | IDs, amounts, statuses, provider evidence, refund states, and edition keys unchanged |
| Closure retry idempotent | Scheduler regression + local DB integration | Lost response, duplicate invocation, claim expiry, and already-scrubbed states converge |
| Crash/retry cannot restore data | Local DB integration | Repeated cleanup/finalization never writes original content or snapshots back |
| Legacy CLOSED backfill | Disposable local DB integration | Preexisting CLOSED fixture is scrubbed without financial mutation and is resumable |
| Guest 52D-1B compatibility | Existing Guest retention regression + local DB integration | Guest seven-day cleanup and minimized tombstone retry remain unchanged |
| Auth finalization unchanged | Scheduler regression + later E2E | DB scrub precedes Auth update and `CLOSED`; Auth failure leaves retryable DELETION_REQUESTED |
| Scheduler failure/retry semantics | Scheduler regression | Per-account claim/lease, retry, and owner-review outcomes remain isolated |
| No PII in logs/results | Static/security regression | Forbidden-value scan and aggregate-only response assertions pass |

Later E2E coverage should verify closed-account route denial and re-signup non-recovery; it is not required to begin the DB design slice.

## 18. Exact Expected 52D-2B File Plan

Expected implementation slice:

- one new migration after 035 extending the closure cleanup RPC;
- `app/lib/accounts/server.ts` only if the server contract or sanitized result handling must change;
- focused closure cleanup local integration regression;
- focused scheduler/closure regression updates if assertions need to cover new aggregate outcomes;
- a 52D-2B implementation report.

Potentially required only if schema decisions demand it:

- `app/lib/freeAnalysisResults/server.ts` for scrubbed-row access guards/types;
- `app/lib/paidReports/server.ts` or paid detail access code for explicit closed-account denial;
- `app/lib/interestedAnalyses/server.ts` if saved-state deletion is implemented through an existing service helper.

Do not modify payment/refund/provider code, the 52D-1B migration, Guest retention worker, frozen policy, or unrelated stale regressions unless a direct contract dependency is proven.

## 19. Remaining Questions

### OWNER decision

- Should closure delete transferred Guest tombstones immediately, or leave them to the independent `created_at + 7 days` cleanup? The former minimizes linkage sooner; the latter preserves one uniform Guest retention mechanism.
- Should retained free-analysis rows use null personal fields, or a minimal explicit scrub marker where existing constraints require non-null values?
- Is retaining a generic `anchorDate` in `analysis_reference_snapshot` necessary for purchased-edition history after closure, or should the entire reference snapshot be removed?
- Should user-controlled `interested_analyses` rows be deleted immediately on closure or retained as non-recoverable linkage?
- Is a retained profile UUID required for every financial/report FK in the intended production schema, or is a future archival identity model desired?

### LEGAL decision

- Confirm the lawful retention basis and duration for order, purchase, payment, refund, provider evidence, entitlement, and audit linkage.
- Confirm whether any personalized analysis content or birth-derived reference context may remain for dispute, tax, accounting, or customer-support purposes. The current design assumes it is not required unless separately justified.
- Confirm whether the Auth tombstone and minimal lifecycle/audit metadata satisfy account-closure records requirements.
- Confirm treatment of operator audit records containing hashed account/order references and bounded reasons.
- Confirm whether the seven-day Guest tombstone retention is acceptable when account closure occurs before that deadline.

### Technical detail

- Determine whether production has any legacy malformed `free_analysis_results` rows or extra `analysis_reference_snapshot` keys not represented by current types.
- Confirm whether report-generation or retry jobs can run for `DELETION_REQUESTED`/`CLOSED` users outside the paths inspected here.
- Choose the exact non-personal free-result tombstone representation and constraint migration.
- Define bounded backfill batch size, observability counters, and migration-resume marker only if production volume requires it.
- Verify whether any external export, support tooling, or analytics pipeline consumes the fields proposed for scrubbing.

## 20. Final Recommendation

Begin 52D-2B with the smallest server/database slice:

1. extend the existing `execute_account_closure_db_cleanup` RPC in a new migration;
2. scrub all member free-analysis personal payloads for every lifecycle state;
3. remove `fortune` birth-derived keys from order/purchase/entitlement reference snapshots and retain `anchorDate` only if explicitly justified;
4. preserve paid report scrub, input-snapshot clearing, profile tombstoning, entitlement revocation, financial blocker checks, and all immutable financial linkage;
5. choose and test exact transferred-Guest tombstone behavior without changing 52D-1B’s seven-day worker;
6. add a bounded legacy-`CLOSED` backfill path using the same idempotent transformations;
7. prove closure retry, owner-review, Auth ordering, and closed-account access denial in disposable local tests.

No source, migration, test, or database changes were made by this 52D-2A design activity.
