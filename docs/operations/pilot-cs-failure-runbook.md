# 운보다 Pilot CS / Failure Operations Runbook

## Purpose and access

This is a read-only pilot operations procedure. Use `/admin` only through an approved operator session. Review the operational status before opening a pilot window, periodically during the window, after a customer payment or refund complaint, and after a known scheduler or provider incident. No Slack, email, SMS, or real-time alert integration exists.

## Shared hourly scheduler

The hourly shared scheduler processes payment reconciliation, refund reconciliation, and account closure finalization. Operators inspect durable status only; they do not invoke providers, retry workers, or alter records from the console.

## Response matrix

| State | Operator response |
| --- | --- |
| Payment reconciliation required/failed | Locate the exact order, record the safe failure code, and observe the next scheduled reconciliation. Escalate terminal mismatch to the owner/developer. |
| Refund retry pending | Locate the exact order, confirm retry timing and safe failure code, then observe the scheduled worker. |
| Refund owner review | Preserve customer/provider evidence and escalate to the owner/developer. Do not complete or override the refund. |
| Paid report failed | Locate the exact order and report state, preserve the safe error code, and escalate to the owner/developer. Do not regenerate content manually. |
| Paid report generating beyond the existing five-minute threshold | Treat as delayed generation. Inspect exact order/entitlement/report status and escalate if it does not converge. |
| Account closure retry | Observe the next scheduled closure run and capture the safe error code. |
| Account closure owner review | Escalate to the owner/developer; do not finalize or delete the account manually. |

## Evidence and privacy

Collect only the internal order ID, product/edition, status, timestamps, retry state, and safe failure code needed for the incident. Do not copy birth data, profile inputs, report content, raw provider responses, payment keys, identity-provider data, secrets, tokens, or stack traces into support records.

## Forbidden operator actions

Routine CS must not use service-role SQL, modify production data, mark payments or refunds complete, alter entitlements, change eligibility, edit profiles, delete accounts, invoke provider callbacks, or force report generation. Owner-review, provider mismatch, payment terminal mismatch, and ambiguous financial state require owner/developer escalation.