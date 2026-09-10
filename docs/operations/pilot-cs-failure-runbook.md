# 운보다 Pilot CS / Failure Operations Runbook

## Purpose and access

This is a read-only pilot operations procedure. Use `/admin` only through an approved operator session. Normal retry/recovery paths are automated. Representative-judgment exceptions are surfaced on the admin dashboard, and exception-only email alerts notify active operators when manual review is actually required.

## Shared hourly scheduler

The hourly shared scheduler processes payment reconciliation, refund reconciliation, account closure finalization, guest cleanup, and the owner exception-alert scan. Operators inspect durable status only; they do not invoke providers, retry workers, or alter records from the console.

## Exception email policy

Email is only a signal to open `/admin`; it is never an approval or mutation channel. Automatic retry queues do not trigger owner mail. Owner mail is limited to terminal/owner-review conditions such as final payment mismatch, refund owner review, paid report failure, account closure owner review, and AI credit/answer integrity mismatch. Alert content is privacy-minimal and contains counts plus the admin link rather than customer identifiers or analysis content.

## Response matrix

| State | Operator response |
| --- | --- |
| Payment reconciliation required/failed | Open the failure queue and use the linked-order action. If a next retry exists, wait for the scheduler. If the state is terminal mismatch or no retry remains, compare the internal order with the payment-provider admin record and escalate unresolved contradictions for developer review. |
| Refund retry pending | Use the linked-order action, confirm retry timing and safe failure code, then observe the scheduled worker. Do not run a second manual cancellation. |
| Refund owner review | Use the linked-order action, compare internal refund/payment state with the provider record, preserve minimal evidence, and escalate unresolved contradictions. Do not complete or override the refund in the database. |
| Paid report failed | Use the linked-order action and confirm paid order + exact edition + active entitlement + failed report. If those boundaries are valid, the customer may reopen the same purchased analysis; the existing failed report is reclaimable in the same purchase boundary. Escalate repeated failure. |
| Paid report generating beyond the existing five-minute threshold | Use the linked-order action and confirm the report is still stale. Reopening the same purchased analysis can reclaim the stale generation within the same purchase boundary. Escalate if it still does not converge. |
| Account closure retry | Use the linked-account action, confirm next retry timing, and allow financial blockers to converge before account closure. |
| Account closure owner review | Use the linked-account action, resolve any financial owner-review condition first, and escalate if closure remains blocked. Do not finalize or delete the account manually. |
| AI credit/answer integrity mismatch | Inspect `/admin/ai-consulting/operations`. Treat any non-zero mismatch as an operator exception. Do not edit the credit ledger directly; escalate for developer review. |

## Evidence and privacy

Collect only the internal order/account reference, product/edition, status, timestamps, retry state, and safe failure code needed for the incident. Use the admin console's linked-order or linked-account action instead of copying identifiers between tools where possible. Do not copy birth data, profile inputs, report content, consultation content, raw provider responses, payment keys, identity-provider data, secrets, tokens, or stack traces into support records.

## Forbidden operator actions

Routine CS must not use service-role SQL, modify production data, mark payments or refunds complete, alter entitlements, change eligibility, edit profiles, delete accounts, invoke provider callbacks, or create a replacement paid report. Owner-review, provider mismatch, payment terminal mismatch, repeated generation failure, and ambiguous financial state require developer review rather than manual data correction.
