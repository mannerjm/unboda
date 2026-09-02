# STEP 52C - Unboda Production Policy Contract Freeze

## Executive Status

**Status:** PASS for implementation planning; not legal approval.
**Baseline:** `e76655c9c9ff2d85ab2c01b41103ca03e8a20d5b`
**Change scope:** This document only.

This contract freezes V1 owner product policy. It distinguishes that policy from current implementation and from Korean legal, processor, and business facts that require separate verification. It does not change payment, refund, account, profile, report, or eligibility behavior.

## Frozen Owner Policy

| Area | Frozen decision | Customer effect | Current implementation status | Required follow-up |
| --- | --- | --- | --- | --- |
| Direct-user age | V1 is for direct users aged 14 or older. Analysis subjects have no age restriction. | Adults may analyze child profiles; an under-14 person is not an intended direct user. | No signup or guest age confirmation exists. | Guest execution confirmation; signup age/policy confirmation; legal review of minor wording. |
| Guest free journey | Full promised free analysis is available before signup. Signup is encouraged afterward to save/manage profiles and analyses. | Free result is not hidden behind signup. | Implemented guest analysis and transfer flow. | Add required age/privacy surface without gating promised result after completion. |
| Signup | 14+, email/password, policy/age confirmation, then email verification. No adult identity verification at signup. | Membership supports saved data and paid purchase preparation. | Email/password and verification implemented; confirmations absent. | Add policy/age notices or consent only after legal review. |
| Paid purchase | New purchase requires active authenticated account, verified email, and account-level `VERIFIED_ADULT`; profile birth data never proves purchaser adulthood. | Paid checkout is separate from free analysis and signup. | Fail-closed boundary implemented; provider path to legitimate adult verification is absent. | NICE or chosen provider implementation after official documentation/config. |
| Paid supply | Payment approval starts personalized generation automatically; no customer "Start generation" action. | Customer sees preparing then completed result. | Implemented. | Checkout disclosure of product, profile, price, edition, immediate generation, and cancellation information. |
| Editions | Exact purchased edition remains the historical product; later period changes do not replace it. | Historical reports remain distinct. | Implemented. | Explain this at checkout and in policy surfaces. |
| Refunds | Recovery/reconciliation precedes refund for supplier/system failures. Duplicate payment and irrecoverable supply failure follow a full-refund principle. Partial refunds are unsupported in V1. | No unsafe automatic financial override. | Full-refund workflow, retry, owner review, and exact-edition revocation implemented. | Legal review of digital-content withdrawal; public refund policy; My Page exact-order refund entry. |
| Owner review | `OWNER_REVIEW_REQUIRED` is escalated, not auto-resolved. Admin remains read-only through pilot. | Exceptional cases are investigated safely. | Implemented through workflow, scheduler, Admin visibility, and runbook. | Evaluate actual pilot frequency before proposing owner-only actions. |
| Closure | Finalized closure removes/scrubs service-purpose saju data and personalized content where not needed for a separate lawful purpose. Re-signup does not promise restoration. | Saved profiles and personalized results are no longer available after finalized closure. | Profile tombstone, paid content scrub, paid input-snapshot clear, entitlement revocation implemented. | Close identified member/guest/reference-snapshot cleanup gaps. |
| Guest retention | Guest access/transfer lasts 24 hours; backend recovery/CS grace retention is at most 7 days from creation. Transfer makes the member copy authoritative; guest personal input/content should be scrubbed promptly after safe transfer. | Guest data must not remain indefinitely. | Access expiry is 24 hours; no purge/scrub worker exists. | Implement bounded expired/untransferred purge and transferred-row minimization. |
| Support | V1 uses one official support email. No launch response-time SLA. | Inquiries are handled sequentially. | Read-only Admin and runbook exist; mailbox/contact value absent. | Provision and verify mailbox; publish contact and required business values. |

## Legal Requirement / Review Inputs

| Topic | Confirmed input | Legal review still required |
| --- | --- | --- |
| Korean e-commerce record inputs | Display/advertising: 6 months; contract/withdrawal: 5 years; payment/supply: 5 years; complaint/dispute: 3 years. | Map each retained table/field to its actual legal purpose; do not assign one period to all rows. |
| Digital content | Payment, entitlement, report claim, and completed report are separate technical events. | Determine lawful supply-commencement and withdrawal/cancellation treatment. |
| Privacy | Birth inputs, profile content, free/paid outputs, payment/refund metadata, and audit data exist. | Legal basis, notice/consent, sensitive-data treatment, retention, deletion wording, and processor/overseas-transfer disclosures. |
| Minors | V1 owner policy is direct user 14+. | Required guardian/minor handling and terms wording. |
| Business disclosure | Public sale requires verified business and contact facts. | Confirm legally required trade, registration, representative, address, contact, and mail-order values. |
| Processors | Supabase, OpenAI, Toss, and Vercel are technically used; NICE is planned only. | Confirm provider roles, regions, retention, subprocessors, and overseas processing facts. |

## Current Implementation Gap Matrix

| Gap | Current state | Required implementation work |
| --- | --- | --- |
| Guest 14+ self-confirmation | Missing | Add at guest analysis execution boundary; never label it verified identity. |
| Signup age/policy confirmation | Missing | Add after legal mapping; no adult verification at signup. |
| Terms / Privacy / Refund policy | Missing | Create customer-visible policy pages from reviewed legal text. |
| Checkout disclosure / confirmation | Partial | Show exact product, selected profile, price, edition, immediate generation, refund/withdrawal information, and any legally required confirmation. |
| Footer / business disclosure | Missing | Add only verified business/contact values. |
| In-product refund request | API exists, discoverable UI absent | Add exact-order entry from My Page payment history using the existing customer-owned API only. |
| Guest purge | Missing | Purge/scrub expired untransferred guest records no later than seven days from creation. |
| Transferred guest cleanup | Missing | Scrub original guest profile input, fingerprint, content, and secret material while retaining minimum idempotency metadata. |
| Member free-analysis closure cleanup | Missing | Scrub/delete `free_analysis_results` content, profile snapshot, and fingerprint on finalized closure. |
| Reference snapshot minimization | Partial | Retain only justified generic period metadata; remove birth-derived DAEUN context from closure-retained data unless separately justified. |
| Support mailbox | Missing | Provision, test, and publish one official support email. |
| Adult verification provider | Missing | Implement only after official NICE/provider contract, data-minimization, retention, and disclosure review. |
| Processor facts | Unknown | Verify region, retention, and processing facts before privacy publication. |

## Retention and Closure Matrix

| Data class | Current storage | Current closure behavior | Frozen target | Legal / technical reason | Unresolved issue |
| --- | --- | --- | --- | --- | --- |
| Auth email / metadata | Supabase Auth | Email tombstoned; user metadata cleared; UUID row retained. | Minimize/tombstone unless lawful retention requires more. | Identity and lifecycle finalization. | Retention period and disclosure. |
| Profile saju fields | `profiles` | Label/relationship and birth inputs tombstoned. | Original service-purpose values unavailable after closure. | FK integrity without original birth data. | Free/guest copies remain. |
| Member free profile snapshot/fingerprint/content | `free_analysis_results` | Currently retained. | Scrub/delete at finalized closure. | Service-purpose personal input/output, not inherently financial record. | Cleanup implementation absent. |
| Guest input/content/fingerprint/secret hash | `guest_free_analyses` | Access expires after 24h; row retained; transfer duplicates data. | Access 24h; backend grace at most 7 days; scrub transferred personal material promptly. | Transfer/retry only while valid; bounded support recovery. | Purge/scrub design absent. |
| Paid report content | `paid_reports.content` | Scrubbed to a marker. | Continue unavailable after closure. | Personalized content not needed for financial identity. | Metadata retention period. |
| Paid input snapshot | `orders`, `purchases` | Cleared to null. | Continue clearing. | Frozen raw birth input is personal data. | Verify deployed migration chain per environment. |
| Paid reference snapshot | `orders`, `purchases` | Retained. | Retain only justified non-personal period information. | Historical edition reproduction may require anchor date. | DAEUN values are birth-derived and need minimization. |
| Orders / purchases | Financial tables | Retained. | Retain only for verified lawful/accounting/dispute purpose. | Transaction identity and history. | Purpose-to-period mapping. |
| Payments / refunds | Payment and workflow tables | Retained. | Retain necessary financial/dispute evidence only. | Reconciliation, refund, disputes. | Period and free-text minimization. |
| Entitlements | `entitlements` | Revoked; row retained. | Preserve minimal revocation history. | Access/control history. | Retention period. |
| Operator audit | `operator_audit_events` | Retained; target is hashed. | Retain only audited-access evidence for a defined period. | Security/accountability. | Owner/legal retention period. |
| Future adult verification | Not implemented | N/A. | Minimize to provider-required evidence only. | Paid boundary only. | Provider/legal facts pending. |

## Customer Journey Contracts

### A. Guest free analysis

Guest supplies saju input, self-confirms direct-user 14+ status at the future execution boundary, receives the full promised free result, and may transfer the supported result after signup. Current 24-hour access/transfer exists; the seven-day backend cleanup target does not yet exist.

### B. Signup and saved experience

Signup uses email and password, future required policy/age confirmation, and email verification. Signup does not verify adulthood. Profiles are separate analysis subjects; an adult account holder may analyze a child profile.

### C. Paid purchase

Customer selects product, profile, and exact applicable edition; completes final checkout review; payment approval creates the paid order/purchase/entitlement; personalized generation begins automatically; a preparing state precedes completed content. The account must be active, email-verified, and `VERIFIED_ADULT`.

### D. Refund

My Page payment history is the planned canonical exact-order entry point. The existing customer-owned refund API/workflow remains the only financial mutation path. Automatic reconciliation/retry is used where authoritative state permits; unresolved ambiguity becomes owner review. No Admin refund button exists before pilot.

### E. Account closure

Closure request can be blocked by unresolved payment/refund reconciliation. Finalization scrubs/tombstones supported service-purpose data, revokes entitlement, and tombstones the auth identity. Customer-facing policy must say content is no longer available and restoration is not guaranteed, while separately disclosing lawful retention of transaction/dispute records. It must not claim all current copies are deleted until the documented gaps are implemented.

## P0 Blockers

### Before paid pilot

- Official, lawful path to `VERIFIED_ADULT` remains unavailable until selected provider documentation/config and implementation are complete.
- Owner decision and legal review of digital-content supply/withdrawal/refund presentation.
- Official support mailbox plus named escalation owner.
- Pilot-appropriate policy/disclosure determination; public claims must not overstate the current cleanup implementation.

### Before public sale

- Terms, Privacy Policy, Refund/Cancellation Policy, verified business disclosures, and footer/legal navigation.
- Required signup, guest, and checkout notice/confirmation surfaces after legal mapping.
- Discoverable exact-order customer refund request UX.
- Guest bounded purge/transferred cleanup; member free-analysis closure cleanup; reference-snapshot minimization.
- Verified processor/overseas-processing/retention facts.
- Adult verification provider implementation and customer disclosures.

## Non-Goals and Deferred Work

- Real NICE implementation until official documentation/configuration is available.
- Owner/Admin financial write actions before pilot.
- Business address and personal-phone replacement until verified operational values are available.
- Marketing system or marketing consent.
- AI consultation memory.
- Unrelated payment, refund, entitlement, profile, account, or report business-logic changes.

## Proposed Implementation Sequence

1. Obtain owner business/contact facts and current Korean legal/provider review inputs.
2. Implement closure and retention cleanup gaps with bounded, testable migrations/workers: member free results, guest expiry/transferred records, and reference-snapshot minimization.
3. Freeze reviewed Terms, Privacy, Refund/Cancellation, AI/saju limitation, and business-disclosure copy.
4. Implement guest age confirmation, signup notices/agreements, checkout disclosure/confirmation, footer links, and canonical My Page refund request UI.
5. Implement adult verification only after official provider documentation, data mapping, and deployment configuration are reviewed.

## Final Verdict

The V1 owner policy is sufficiently frozen to begin dependency-ordered implementation planning. Remaining owner decisions are the official support mailbox, verified business disclosures, detailed refund exception handling, and retention-period mapping. Remaining legal/provider facts are Korean digital-content and minor requirements, processing/legal basis/overseas facts, and NICE/provider contracts. No future policy page may claim member free-analysis deletion, guest DB deletion at 24 hours, or universal deletion of paid reference context until the corresponding implementation gaps are closed.