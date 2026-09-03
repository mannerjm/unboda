# STEP 52D-3D-A Legal Data, Retention, and Public Policy Design

## 1. Executive Verdict

**PASS for read-only design and policy-mapping preparation.** The current
implementation is sufficiently inventoried to draft structured Terms, Privacy,
and Refund/Cancellation/Withdrawal documents, but not to publish final legal
copy or assert final legal bases, retention periods, processor facts, or
business disclosures.

The biggest retention finding is that the application deliberately separates
service-content cleanup from transaction evidence. Guest access is 24 hours,
but backend Guest data can remain until the absolute `created_at + 7 days`
boundary. Transferred Guest payloads are minimized promptly and consumed
transferred tombstones can be deleted earlier during account closure. Policy
acceptance events are separate evidence and have no invented retention period.

No source, migration, test, database, remote, provider, commit, or push action
was performed.

## 2. Actual Data Inventory

### Auth and account

| Item | Exact location | Classification | Current treatment |
|---|---|---|---|
| Auth user ID | Supabase `auth.users.id`; referenced by app tables | Account/security linkage | Retained for identity and FK integrity; closure uses Auth tombstone flow |
| Email | `auth.users.email`; signup `app/auth/signup/page.tsx` | Direct personal/identity data | Supabase Auth-managed; closure changes it to deterministic tombstone identity |
| Password/auth credentials | Supabase Auth; `app/lib/supabase/client.ts`, `app/lib/supabase/server.ts` | Authentication/security data | Not copied into app tables or policy events |
| Email verification | `auth.users.email_confirmed_at`; `app/auth/callback/route.ts`, `app/lib/accounts/server.ts` | Authentication state | Set by Auth confirmation; separate from age and adult eligibility |
| Lifecycle | `public.account_lifecycles`, migration `024_account_lifecycle_paid_eligibility.sql` | Account/operational metadata | `ACTIVE`, `DELETION_REQUESTED`, `CLOSED`; closure retry and finalization markers in migrations 025/027 |
| Eligibility | `account_lifecycles.paid_eligibility_status`, method/provider/version/timestamps | Paid eligibility/security metadata | `UNVERIFIED`, `VERIFIED_ADULT`, `REVOKED`; paid boundary only, no NICE implementation |

### Profiles and free service

| Item | Exact location | Classification | Current treatment |
|---|---|---|---|
| Profile label/relationship | `public.profiles.label`, `relationship_type`; migration 002 | Personal/profile organization data | Existing closure tombstone replaces values; profile UUID retained |
| Birth date/time | `public.profiles.birth_date`, `birth_time` | Personal data when identifiable; not automatically statutory sensitive data | Used for requested saju analysis; closure tombstones values |
| Gender/calendar/leap month | `public.profiles.gender`, `calendar_type`, `is_leap_month` | Personal/profile analysis inputs | Used for requested analysis; closure tombstones values |
| Active selection | `public.active_profiles.user_id`, `profile_id`; migration 006 | Transient account/UI linkage | Deleted during closure |
| Member free result | `public.free_analysis_results`; migration 008 | Personalized generated content and analysis metadata | 52D-2B scrubs `content`, `profile_snapshot`, and `profile_fingerprint`; technical row/linkage remains where schema requires |
| Guest profile/input | `public.guest_free_analyses.profile_input`, `profile_fingerprint`, `content` | Guest personal/analysis data | Available through 24-hour credential window; transfer scrubs raw fields |
| Guest security/lifecycle | `guest_free_analyses.secret_hash`, status, `expires_at`, `created_at`, `consumed_at`, transfer linkage, cleanup claims | Security, retention, transfer linkage | Secret hash remains in minimized tombstone until deletion; hard deletion at `created_at + 7 days` |
| Interests | `public.interested_analyses.user_id`, `profile_id`, `product_id`, timestamps; migration 028 | User preference/service state | Deleted during finalized closure; not transaction truth |

### Paid commerce and operations

| Item | Exact location | Classification | Current treatment |
|---|---|---|---|
| Orders | `public.orders`: IDs, user/profile IDs, product, amount, status, provider/transaction, timestamps, edition key, `analysis_input_snapshot`, `analysis_reference_snapshot` | Contract/payment/supply and account linkage | Financial identity retained; input snapshot cleared on closure; reference snapshot minimized |
| Purchases | `public.purchases`: IDs, user/profile/order IDs, product, purchased time, edition key, both snapshots | Contract/payment/supply history and linkage | Financial identity retained; input snapshot cleared; reference snapshot minimized |
| Entitlements | `public.entitlements`: IDs, user/profile/resource/purchase IDs, source, edition key, active/revoked state and timestamps | Supply/access and financial linkage | Active entitlements revoked with `ACCOUNT_CLOSED`; linkage retained |
| Paid reports | `public.paid_reports`: IDs, user/profile/product/purchase IDs, edition key, status, content, error/timestamps | Personalized paid content plus supply/report linkage | Content replaced by scrub marker; identity/status/linkage retained |
| Payment evidence | `public.toss_payment_records`: order/payment/provider identifiers, amounts, statuses, reconciliation/retry/error evidence | Payment/provider/audit record | Retained; closure is blocked by unresolved reconciliation states; payment keys are security-sensitive |
| Refund evidence | `public.refund_workflows`: order/payment/user/profile/product, requested amount/reason, statuses, provider and retry/error fields | Withdrawal/refund/payment/audit record | Retained; active unresolved states block closure; owner-review state remains intact |
| Generation attempts | `public.paid_generation_attempts`, migration 013 | Operational generation metadata linked to report | Review separately for residual personal payload; no deletion policy inferred here |
| Operator audit | `public.operator_audit_events`, migrations 033/034 | Security/audit metadata, hashed target references | Retained separately; no customer content should be placed in it |
| Policy evidence | `public.policy_acceptance_events`, migration 037 | Policy evidence | Contains only type/version/user/time/source; retention unresolved |

### Support and dispute inventory

No dedicated complaint/dispute table or general support-ticket table was found
in the current migrations. Refund workflow and operator audit are the current
structured operational surfaces. A future support provider or ticket system is
FACT-PENDING and must be added to the Privacy inventory only after confirmed.

## 3. Authoritative Processing Matrix

Legal-basis labels below are candidates for legal review, not final legal advice.
The supplied transaction periods are mapping targets, not automatic assignments
to entire tables.

| Data/record category | Exact DB location | Data subject | Purpose | Service necessity | Legal-basis category | Customer disclosure | Active retention | Closure treatment | Statutory/business retention after closure | Current status | FACT-PENDING |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Auth identity/email | `auth.users.id`, `email` | Account holder | Account creation, login, recovery, email verification | Required for account | Contract/service performance or LEGAL REVIEW | Terms, Privacy | While account exists and as required for security | Email tombstone; identity linkage remains | LEGAL REVIEW; not automatically a transaction record | Implemented | Auth retention/deletion configuration |
| Password/auth provider data | Supabase Auth | Account holder | Authentication/security | Required for login | Contract/security | Privacy | Auth-managed | No app-table copy; Auth closure behavior needs confirmation | LEGAL/FACT REVIEW | Implemented by provider | Auth provider retention/subprocessors |
| Lifecycle/eligibility | `account_lifecycles` | Account holder | Access, closure, paid gate, retry | Required for service control | Contract/security/evidentiary | Terms, Privacy | Account lifecycle | Minimal lifecycle/audit linkage remains | LEGAL REVIEW | Implemented | Exact production retention policy |
| Email confirmation | `auth.users.email_confirmed_at` | Account holder | Prove email control | Required for certain services | Security/service operation | Privacy | Auth/account lifetime as reviewed | Auth tombstone flow; no adult implication | LEGAL REVIEW | Implemented | Auth policy facts |
| Profile fields | `profiles` | Profile subject; account holder manages entry | Requested saju analysis | Required for requested analysis | Contract/service performance or LEGAL REVIEW | Terms, Privacy | Until deletion/closure under approved policy | Values tombstoned; UUID retained for FKs | Not automatically statutory transaction record | Implemented | Any external exports/retention |
| Member free analysis | `free_analysis_results` | Profile subject/account holder | Deliver and cache requested free analysis | Required for requested service; optional retention for convenience | Contract/service performance or LEGAL REVIEW | Terms, Privacy | While account/service retention is approved | Content/snapshot/fingerprint scrubbed under 52D-2B | Not automatically five-year transaction data | Implemented | External cache/export consumers |
| Guest analysis | `guest_free_analyses` | Guest/profile subject | Deliver Guest free result and transfer | Required for requested Guest service | Contract/service performance or LEGAL REVIEW | Privacy, Guest notice | Access 24h; backend maximum 7 days | Raw fields scrubbed after transfer; rows hard-deleted by day 7 or earlier closure for transferred tombstones | Not automatically a transaction record | Implemented | Processor/provider handling |
| Interests | `interested_analyses` | Account holder | Save product preference | Optional user-requested state | Contract/service request or LEGAL REVIEW | Privacy | Until removed/closure | Deleted on closure | Not a transaction record by default | Implemented | Any future export |
| Orders | `orders` | Account holder/consumer | Contract, payment, supply, edition identity | Required for paid transaction | Contract/legal obligation/evidentiary claim defense | Terms, Privacy, Refund | Active and legally required period | Financial fields/linkage retained; input snapshot cleared | Candidate contract/withdrawal and payment/supply categories: 5 years, subject to field mapping | Implemented | Final legal category per field |
| Purchases | `purchases` | Account holder/consumer | Purchase history and supply linkage | Required for paid history | Contract/legal obligation/evidentiary | Terms, Privacy, Refund | Active and legally required period | Linkage retained; input snapshot cleared | Candidate contract/payment/supply: 5 years, subject to mapping | Implemented | Final legal category per field |
| Entitlements | `entitlements` | Account holder/consumer | Supply/access and revocation | Required for access/refund integrity | Contract/legal obligation/evidentiary | Terms, Privacy, Refund | Through entitlement/refund/legal period | Revoked, linkage retained, reference minimized | Candidate supply/payment: 5 years only where justified | Implemented | Legal retention scope |
| Paid report | `paid_reports` | Profile subject/account holder | Personalized paid supply | Required to supply report | Contract/service performance; claim defense | Terms, Privacy, Refund | Until supply/closure policy | Content scrubbed; linkage/status retained | Not automatically five-year content retention | Implemented | Error/export consumers |
| Payment | `toss_payment_records` | Account holder/consumer | Confirm payment and reconcile | Required for payment integrity | Contract/legal obligation/evidentiary/security | Privacy, Refund | Provider/legal period | Do not scrub payment evidence in this product step | Candidate payment/supply: 5 years, subject to law/provider facts | Implemented | Processor/retention facts |
| Refund/withdrawal | `refund_workflows` | Account holder/consumer | Process refunds and withdrawal issues | Required when invoked | Contract/legal obligation/evidentiary | Refund Policy, Privacy | While open and approved legal period | Preserve status/evidence; no service-content restoration | Candidate contract/withdrawal: 5 years; complaints/disputes: 3 years if applicable | Implemented | Complaint system/provider |
| Policy evidence | `policy_acceptance_events` | Account holder | Evidence of accepted policy version | Required only for selected policy evidence | Consent/agreement evidence or LEGAL REVIEW | Terms, Privacy | No duration assigned | Separate closure treatment | LEGAL REVIEW; do not assume five years | Implemented foundation | Legal evidence period |
| Operator/audit | `operator_audit_events`, lifecycle retry fields | Account holder/operator | Security, support accountability, incident response | Security/operational necessity | Security/legal obligation/evidentiary | Privacy | Approved security/audit period | Separate from service content | LEGAL REVIEW | Implemented | Audit system policy |

## 4. Personal-Data Classification

1. **Personal information:** Auth email, account identifiers when linked to a
   person, profile labels, birth date/time, gender/calendar fields, and any
   identifiable profile data.
2. **Authentication/security data:** Password processing in Auth, email
   verification state, Guest secret hash, session/cookie credentials, payment
   keys, retry claims, and security audit references.
3. **Transaction/legal records:** Orders, purchases, payment records, refund
   workflows, entitlement/revocation evidence, exact edition identifiers, and
   only the fields actually needed for contract, payment, supply, withdrawal,
   dispute, or audit purposes.
4. **Service-generated personalized content:** Member/Guest free result content,
   paid report content, profile snapshots, fingerprints, and personalized
   reference context. 52D-2B scrubs these service-purpose copies as specified.
5. **Policy evidence:** `policy_acceptance_events` policy type/version, user
   linkage, accepted time, source, and event ID. It is not service analysis data.
6. **Operational/audit metadata:** Lifecycle state/timestamps, generation state,
   retry counts/errors, operator action/correlation/hash references, and payment
   reconciliation state.

The current code/docs reviewed do not incorrectly declare ordinary saju birth
date, birth time, or gender to be statutory sensitive information. They are
personal data when identifiable, but any statutory sensitive-data classification
requires a separate legal determination.

## 5. Third-Person and Child-Profile Treatment

The contracting/service user is the account holder who satisfies the V1 direct
user rule. A profile is an analysis subject and may represent another person,
including a child. Profile birth data is not account-holder age proof.

Future Terms and Privacy copy should state, subject to legal wording review:

- the account holder should have appropriate authority to provide another
  person’s information;
- the account holder is responsible for lawful and accurate provision;
- the information is used to provide the analysis requested by that account
  holder;
- the account holder manages or deletes profiles through the service where the
  product supports it;
- the profile subject is not automatically the contracting user;
- no representative-consent infrastructure is being implemented in this V1
  design.

## 6. Guest Retention Disclosure

The public Privacy Policy should distinguish these concepts precisely:

- Guest analysis access and transfer use a 24-hour customer credential window;
- Guest data may remain in the service backend for bounded recovery/operational
  purposes until the absolute `created_at + 7 days` deletion boundary;
- transferred Guest raw profile input, fingerprint, and content are scrubbed
  promptly after successful transfer;
- transferred rows retain only minimized retry/transfer linkage until deletion,
  unless the account closes first and the transferred tombstone is deleted;
- untransferred rows remain subject to the independent bounded cleanup;
- the 24-hour access period is not the total database-retention period;
- the service does not promise that a Guest result remains recoverable after the
  stated access/retention boundary.

No Guest self-attestation evidence is copied into member policy events.

## 7. Member Closure Disclosure

The customer-facing closure statement should say, after legal approval, that
closure makes saved profiles and personalized free/paid analysis content
unavailable and causes service-purpose data to be scrubbed or deleted according
to the product cleanup process. It should separately state that orders,
payments, refunds, supply, dispute, security, or other legally required records
may remain in minimized form for their applicable purpose and period.

It must not say that every database row is immediately physically deleted.
Current 52D-2B treatment is:

- profile personal fields tombstoned while identity UUIDs remain for restricted
  financial/report FKs;
- member free-analysis content, profile snapshot, and fingerprint set to NULL;
- reference snapshots reduced to allowlisted generic `anchorDate` or NULL;
- interests deleted;
- paid report content replaced by the existing scrub marker;
- order/purchase input snapshots cleared;
- active entitlements revoked with `ACCOUNT_CLOSED`;
- transferred Guest tombstones for the closing user deleted;
- financial/payment/refund/order/purchase/audit records not deleted by this
  service-data cleanup.

## 8. Transaction Retention Matrix

The supplied target periods are mapped only where the actual record purpose
supports them. They require final Korean legal review:

| Target category | Candidate current records/fields | Do not automatically retain |
|---|---|---|
| Advertising/display, 6 months | No dedicated authoritative advertising-record table identified | Profiles, analysis content, or all catalog rows merely because they were displayed |
| Contract/withdrawal, 5 years | Order identity/status/amount/product/edition fields; purchase linkage; refund workflow request/status/reason/evidence fields, field-by-field | Free-analysis content, profile snapshots, Guest payloads, every column in every linked table |
| Payment/supply, 5 years | Payment record identity/status/amount/provider evidence; order/purchase identity; entitlement/revocation/supply linkage; paid report supply status and identity | Paid report content, raw profile snapshots, birth input, fingerprints unless separately justified |
| Consumer complaint/dispute, 3 years | Any future complaint/support record; current refund owner-review/error evidence only where it actually serves a complaint/dispute | All operator logs, all refund rows, or all account data without a complaint/dispute purpose |

Potential over-retention risks:

- retained profile UUID/user linkage in financial rows may be technically required
  by current FKs, but the legal necessity of the linkage is separate;
- `analysis_reference_snapshot` historically supported regeneration context, but
  52D-2B removes personalized Fortune context and retains only an allowlisted
  generic anchor where technically useful;
- operational error fields and generation-attempt metadata need a separate
  content-leak review;
- policy-event evidence needs a defined legal/evidentiary period before public
  Privacy copy makes a claim.

## 9. Policy Evidence Retention

`policy_acceptance_events` currently stores only:

- `id`;
- `user_id`;
- `policy_type` (`TERMS` or `AGE_14_PLUS`);
- `policy_version`;
- `accepted_at`;
- `source` (`SIGNUP`);
- `created_at`.

The event exists to show which policy version was accepted by which account at
what time. It is not service content and must not be used to restore a closed
account or authorize a new account after re-signup.

`user_id` may remain while the approved evidentiary purpose requires it. A future
legal design may pseudonymize or expire the event, but that decision must retain
sufficient evidence if needed. No retention number is assigned here. The event
should eventually expire or remain only for a defined legal/claim purpose; this
is LEGAL-PENDING.

## 10. Public Terms of Use Structure

Final copy must be supplied by legal review. The V1 outline should contain:

1. Purpose and service scope.
2. Definitions: account holder, Guest, analysis subject, free analysis, paid
   edition, order, entitlement, report, and policy version.
3. Posting, effect, amendment, effective date, and version history.
4. Eligibility: direct users 14+; no age restriction for analysis subjects;
   self-attestation is not verified age.
5. Account registration, email/password security, and email verification.
6. Account-holder responsibility for credentials and account activity.
7. Responsibility/authority for entering third-person or child profile data.
8. Guest free analysis, 24-hour access, full promised result, and no signup gate.
9. Paid personalized analysis and exact-edition behavior.
10. Purchase/payment flow and server-side account eligibility.
11. Immediate personalized generation after successful payment approval.
12. Withdrawal, cancellation, and refund process without blanket no-refund text.
13. Incorrect user-entered profile data and correction/support path.
14. System error, failed, delayed, or irrecoverable supply handling.
15. Duplicate payment handling.
16. Account closure, unavailable service content, retained transaction records,
    and no promise of universal physical deletion.
17. Service suspension, changes, and discontinuation.
18. Prohibited conduct and abuse prevention.
19. Intellectual property and permitted use of service output.
20. Saju/fortune informational disclaimer and high-stakes-decision warning.
21. Support/contact and verified business disclosures.
22. Governing law and dispute handling, as legally reviewed.

No business address, telephone, email, registration number, or final legal
statement is invented here.

## 11. Saju/Fortune Disclaimer

The policy design should explain that saju/fortune output is interpretive and
informational content. It is not medical, legal, investment, tax, psychological,
or other licensed professional advice, and it should not be the sole basis for
high-stakes decisions.

The disclaimer must not promise accuracy, destiny, success, or guaranteed
outcomes, and must not purport to waive rights that cannot lawfully be waived.
Final wording is LEGAL-PENDING.

## 12. Privacy Policy Full Outline

The public Privacy Policy should contain:

1. Purpose, scope, and version/effective-date governance.
2. Processing purposes and legal-basis mapping for each category.
3. Account/email/authentication items and verification state.
4. Profile/saju fields, analysis-subject distinction, and third-person
   responsibility.
5. Member free-analysis processing and 52D-2B closure minimization.
6. Guest processing: 24-hour access, seven-day maximum backend lifetime,
   transfer scrubbing, minimized tombstones, and closure deletion.
7. Paid order, purchase, entitlement, paid report, payment, and refund data.
8. Policy acceptance evidence and its unresolved approved retention purpose.
9. Processing and retention periods stated only after legal mapping.
10. Deletion/destruction and account-closure behavior without universal-row
    deletion claims.
11. Processors/outsourcing, only with verified provider contracts.
12. Overseas transfer, only if actual destinations/mechanisms are confirmed.
13. Data-subject rights and exercise procedure.
14. Security measures stated from actual controls.
15. Cookies/local storage/logs only where actually used: Supabase session,
    HttpOnly Guest credential, and server operational logging should be verified
    against final implementation.
16. Privacy responsible contact using a verified support/business value.
17. Effective date, version, and change history.
18. Contact and complaint/dispute route.

Do not fabricate processor names, overseas locations, retention periods, or legal
basis conclusions.

## 13. Legal-Basis Table

| Group | Candidate public statement | Consent checkbox? | Status |
|---|---|---:|---|
| Account | Necessary account creation/authentication processing, basis to be confirmed | Not automatic | LEGAL-PENDING |
| Profile | Requested profile management and analysis-subject processing | Not automatic; no sensitive-data conclusion inferred | LEGAL-PENDING |
| Free analysis | Deliver requested analysis and optional saved service state | Not automatic | LEGAL-PENDING |
| Guest | Deliver Guest analysis and bounded recovery/cleanup | Not automatic; Guest age is separate self-attestation | LEGAL-PENDING |
| Interests | Save user-selected preferences | Not automatic | OWNER/LEGAL REVIEW |
| Paid purchase | Contract/payment/supply and exact-edition fulfillment | Checkout acknowledgement may be separately reviewed | LEGAL-PENDING |
| Payment/refund | Payment confirmation, reconciliation, withdrawal/refund handling | Not a generic signup consent | Legal obligation/contract/evidence candidates; pending |
| Support | Resolve service, payment, duplicate, wrong-input, and supply issues | Not automatic | FACT/LEGAL-PENDING |
| Policy evidence | Record approved Terms/age acceptance version and time | Evidence event itself is required by owner decision; legal treatment pending | Implemented foundation; retention LEGAL-PENDING |
| Security/audit | Abuse prevention, access accountability, reconciliation safety | Not automatic | Security/legal-obligation candidate; pending |

No `PRIVACY_CONSENT` event or blanket privacy checkbox is recommended by this
matrix.

## 14. Refund, Cancellation, and Withdrawal Policy Matrix

The public policy should use actual state and evidence, not promise outcomes
beyond legal rights:

| Scenario | Policy treatment/design |
|---|---|
| Before payment completion | No paid order supply is complete; payment failure/cancellation follows payment state |
| Payment approved; generation begins immediately | Disclose that personalized generation begins immediately after approval; no separate start button |
| Personalized supply commenced | Explain reviewed withdrawal/cancellation consequences without blanket waiver |
| Content supplied successfully | Explain exact purchased edition and applicable reviewed refund rights |
| Duplicate payment | Existing product principle: investigate/reconcile and provide full refund where duplicate payment is proven |
| Payment succeeded but entitlement/report missing | Recovery/reconciliation first; do not make the customer prove a new purchase; owner review if unresolved |
| Irrecoverable generation/supply failure | Existing product principle: full refund path after confirming irrecoverable failure |
| Temporary generation delay | Status/retry/owner workflow; a short wait alone is not automatically a refund reason |
| Incorrect customer profile input | Distinguish customer-confirmed wrong input from Unboda processing error; final legal treatment pending |
| Unboda processed different data | Treat as service/processing error with correction/refund/support path as legally reviewed |
| Edition changes after purchase | Preserve frozen exact-edition identity; do not silently substitute a new edition |
| Owner-review/ambiguous exception | Preserve evidence and route to reviewed manual handling |

Current implementation supports full-amount refund workflows and does not
support partial refunds initially. Statutory consumer rights override conflicting
internal shortcuts.

## 15. Checkout Pre-Contract Disclosure Matrix

Future checkout at `app/checkout/[productId]/page.tsx` and
`CheckoutAccessPanel.tsx` should present before payment:

| Item | Surface | Evidence/decision |
|---|---|---|
| Product/service name | Review summary | Notice; exact catalog source |
| Selected analysis subject/profile | Review summary with subject label | Notice; subject age separate from account eligibility |
| Exact edition/period | Review summary | Contract identity; frozen server value |
| Price/currency | Review summary | Contract/payment record |
| Payment method | Provider checkout context | FACT-PENDING final provider display |
| Immediate personalized generation | Short disclosure | Legal copy review |
| Expected supply flow | Short disclosure/status explanation | Product notice |
| Withdrawal/refund conditions | Short summary + full policy link | Legal review |
| Failure/duplicate/wrong-input handling | Summary + policy/support link | Legal/product review |
| Business/support link | Public footer/policy | FACT-PENDING verified values |
| Terms and Refund links | Public navigation | Must exist before activation |
| Explicit acknowledgement | Separate unchecked control only if legally required | LEGAL/OWNER-PENDING; server enforcement if activated |

No checkout implementation is proposed in this step.

## 16. Business Disclosure Matrix

| Field | Availability | Treatment |
|---|---|---|
| Business/trade name | FACT-PENDING | Do not display until verified |
| Representative | FACT-PENDING | Do not display until verified |
| Business address | FACT-PENDING | Do not insert a private/unverified address |
| Customer telephone | FACT-PENDING | Do not insert a personal/unverified number |
| Support email | FACT-PENDING | Do not invent a mailbox |
| Business registration number | FACT-PENDING | Do not display placeholder data |
| Ecommerce/mail-order registration information | FACT-PENDING/LEGAL-PENDING | Confirm applicability and value |
| Reporting authority/verification link | FACT-PENDING/LEGAL-PENDING | Confirm actual authority and URL |
| Terms link | Not implemented | Add only with approved public page |
| Privacy link | Not implemented | Add only with approved public page |
| Refund/Cancellation link | Not implemented | Add only with approved public page |
| Support contact | Not provisioned | Use one verified official channel when available |

## 17. Provider and Processor Fact Matrix

| Provider/surface | Known current technical use | Personal data likely involved | Public-policy role | Known/unknown |
|---|---|---|---|---|
| Supabase Auth/Database | Auth, sessions, app persistence, RLS/service-role server access | Auth identity, account data, profile/analysis/commerce records | Processor/outsourcing and overseas-transfer review | Technical use known; contract/location/retention unknown |
| Hosting/runtime | Next.js application and server routes | Requests/session handling and server data access | Hosting/processor disclosure if applicable | Exact provider/configuration fact pending |
| AI model/provider | Analysis generation code invokes generation service paths | Profile-derived analysis input and generated content may reach provider | Processor, purpose, transfer, retention | Actual provider/contract unknown |
| Toss/payment processor | Checkout SDK and payment confirmation/reconciliation | Payment/order/provider data | Payment processing and retention disclosure | Technical product known; contractual/retention facts pending |
| Supabase email/Auth delivery | Confirmation, password reset, auth email flows | Email address and Auth messages | Email processor/transfer disclosure | Delivery/subprocessor facts pending |
| NICE/adult-verification provider | None implemented | None currently sent by this feature | Future paid boundary only | FACT-PENDING; do not invent |
| Analytics/error monitoring | No authoritative dedicated provider identified | Avoid assuming any collection | Disclose only after confirmed | FACT-PENDING |

No provider name, overseas destination, subprocessor, or retention claim should
be added to public copy until verified.

## 18. Public Route and IA Design

Recommended public routes, aligned with the existing App Router:

- `/terms`
- `/privacy`
- `/refund`

They should be public without authentication, accessible from signup, checkout,
Guest input, login, and one shared footer. Each page should be readable,
printable, copyable, mobile-friendly, and show its policy version/effective date.
No account-specific data should be loaded.

A future shared `LegalFooter` can be owned by `app/layout.tsx` or a public layout
boundary. It should not duplicate navigation in `AppShell`. The pages should
consume one policy configuration source for route, version, effective date, and
publication state.

## 19. Versioning

Use stable canonical version IDs from one policy configuration source. The exact
same Terms version must be referenced by:

- public `/terms` page;
- signup UI/server contract;
- `policy_acceptance_events`.

Similarly configure Privacy and Refund versions even if they are notice-only and
not acceptance-event types. Do not scatter version literals across components,
API handlers, SQL, or tests. A page may remain unpublished until its content and
verified values are ready.

## 20. Publication and Enforcement Sequence

1. Finalize the data/legal/retention matrix.
2. Finalize draft Terms, Privacy, and Refund/Cancellation/Withdrawal content.
3. Verify business, support, processor, transfer, and retention facts.
4. Create public policy routes with version/effective-date configuration.
5. Verify public access, content, responsive layout, and links.
6. Activate canonical policy versions only after publication.
7. Wire signup Terms and age controls.
8. Complete server-owned signup enforcement and Auth/DB partial-failure recovery.
9. Implement checkout disclosure and any legally required acknowledgement.
10. Run final legal/product/security E2E audit.

## 21. FACT-PENDING

These are missing factual values or technical confirmations, not legal
interpretations:

- Official business/trade name and representative.
- Business registration number.
- Verified business address.
- Verified customer telephone.
- Official support email.
- Applicable ecommerce/mail-order registration number and reporting authority.
- Hosting provider and deployment-region details.
- Actual AI provider, processor role, subprocessor, retention, and transfer facts.
- Actual Toss/payment contractual role, retention, and transfer facts.
- Supabase contractual, regional, subprocessor, and Auth email-delivery facts.
- Overseas-processing destinations and transfer mechanisms.
- Actual NICE/adult-verification provider and protocol, which is not implemented.
- Analytics/error-monitoring provider, if any.
- Dedicated complaint/dispute/support system, if any.

## 22. LEGAL-PENDING

- Final Terms, Privacy, and Refund/Cancellation/Withdrawal wording.
- Legal basis for each processing category.
- Whether any specific Privacy consent is required and its exact scope.
- Final age self-attestation wording and evidentiary treatment.
- Whether acceptance evidence is retained, pseudonymized, or eventually deleted.
- Retention duration for policy evidence.
- Field-level mapping of order/purchase/payment/refund/supply records to the
  supplied 6-month/5-year/3-year categories.
- Whether profile/account linkage is needed for each retained financial field.
- Third-person/child-profile responsibility language.
- Immediate digital-content supply disclosure and any required acknowledgement.
- Withdrawal/refund exceptions for wrong input, processing errors, delays,
  duplicate payment, and failed supply.
- Required business disclosure fields and publication format.
- Applicable complaint/dispute record treatment.
- Privacy statements for cookies, logs, processors, and overseas transfer.

## 23. OWNER-PENDING

- Approve the public route names `/terms`, `/privacy`, and `/refund`.
- Approve whether checkout requires an affirmative immediate-generation
  acknowledgement.
- Approve the public footer scope and placement for authenticated/public layouts.
- Approve the final policy version/publication workflow.
- Approve which policy evidence types remain in V1, currently only TERMS and
  AGE_14_PLUS.
- Approve whether Guest and member age language should share a component while
  retaining separate evidence semantics.
- Approve customer-facing closure wording and the level of retained-record
  explanation.
- Approve whether support/refund data requires a dedicated support integration.
- Approve the final owner for legal/business-value provisioning.

## 24. Exact Next Implementation Slices

### 52D-3D-B: policy configuration and public page shell

- Add public policy configuration for Terms, Privacy, and Refund versions,
  publication state, effective date, and route.
- Add `/terms`, `/privacy`, and `/refund` only with approved or explicitly
  unpublished-safe content.
- Add shared public legal footer and verified business-value slots.
- Add public-route, mobile, accessibility, and no-account-data regressions.

### 52D-3D-C: privacy/legal data disclosure finalization

- Populate approved data categories, basis, retention, processor, transfer,
  rights, closure, and contact text.
- Add no fabricated-value/configuration tests.

### 52D-3C-D or equivalent: server signup activation

- Complete the Auth-to-DB signup orchestration and partial-failure recovery.
- Activate Terms and AGE_14_PLUS only after public Terms exists and owner/legal
  approval is recorded.
- Keep generic Privacy consent absent unless separately determined.

### 52D-3E: checkout disclosure

- Add exact product/profile/edition/price review and immediate-generation
  disclosure.
- Add refund/withdrawal link and any reviewed affirmative acknowledgement.
- Preserve paid eligibility and payment/reconciliation behavior.

### Closure alignment

- Update account closure warning only after final legal copy is approved;
  preserve 52D-2B cleanup semantics and the no-universal-deletion statement.

## 25. Final Recommendation

The public Terms, Privacy, and Refund/Cancellation/Withdrawal documents can now
be produced as structured legal drafts based on this matrix, but they should
remain clearly marked draft/internal until legal review supplies final wording,
field-level retention decisions, processor/transfer facts, and verified business
contacts.

The next safe implementation is the public policy shell and shared configuration,
with publication disabled until content and facts are complete. Do not add a
blanket Privacy consent checkbox, do not assign every table a five-year period,
do not expose fabricated business values, and do not change Guest, paid,
provider, payment, refund, or account-closure behavior in this design phase.
