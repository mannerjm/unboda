# STEP 52D-3C-A Member Signup Consent and Evidence Design

## 1. Executive Verdict

**PASS for read-only architecture design.** A small, server-authoritative signup policy/evidence foundation can be implemented after owner/legal decisions below. No source, migration, test, database, remote, provider, commit, or push action was performed in this step.

The recommended V1 architecture is a dedicated immutable policy-acceptance event table, but only for acceptance types that owner/legal review confirms should be evidenced. Terms acceptance is the clearest candidate. Member 14+ self-attestation may use the same event shape if evidence is desired; it must remain self-attestation, never verified age or adult identity verification. A blanket privacy-consent checkbox must not be added merely because the product processes personal data.

The current signup is entirely client-side. Before implementing required controls, create a server signup boundary that validates the exact applicable policy versions and acceptance claims before or atomically with application-account initialization. Supabase Auth email verification remains separate from policy acceptance and from paid `VERIFIED_ADULT` eligibility.

## 2. Current Signup Architecture

### Direct signup

- Page/form: `app/auth/signup/page.tsx`, client component `SignupPageContent`.
- Current fields: email, password, password confirmation.
- Current validation: required email/password, matching passwords, minimum password length.
- Current submit: browser Supabase client from `app/lib/supabase/client.ts`, then `supabase.auth.signUp({ email, password, options.emailRedirectTo })`.
- Current redirect target: `/auth/callback?returnTo=${safeReturnTo}`; `getSafeReturnTo()` validates the return path.
- Current success state: page displays “check your email” guidance and the entered email address.
- Current failure state: Supabase error message is placed in the form; no policy-specific state exists.
- No server signup route, Server Action, API, or application account/profile creation occurs in the signup page.
- No consent/version event is written.

### Post-signup and verification

- Callback: `app/auth/callback/route.ts`.
- Function: `GET(request)` exchanges the Supabase confirmation code through `createClient().auth.exchangeCodeForSession(code)` and redirects to the validated `returnTo`, defaulting to `/result`.
- Email verification authority: `auth.users.email_confirmed_at`, read server-side by `requireVerifiedEmailAccount()` in `app/lib/accounts/server.ts` and by the account status route.
- Lifecycle initialization: `ensureAccountLifecycle(userId)` in `app/lib/accounts/server.ts` creates an `account_lifecycles` row lazily when an authenticated server operation first needs it. There is no signup-triggered application-row creation in the current signup flow.
- The initial lifecycle defaults to `ACTIVE` and `paid_eligibility_status = UNVERIFIED` through migration 024. This does not mean email is verified or adult eligibility is verified.

### Other account-creation entry points

| Entry point | Exact path | Current account boundary | Policy implication |
|---|---|---|---|
| Standalone signup | `app/auth/signup/page.tsx` | Direct browser `auth.signUp` | Primary future server-enforcement boundary |
| Guest-result save/transfer | `app/auth/complete-guest-analysis/page.tsx` -> `POST /api/guest-free-analysis/transfer` | User first signs up/logs in, then transfer RPC runs | Uses existing signup page; transfer is not a second signup API |
| Checkout account gate | `app/checkout/[productId]/CheckoutAccessPanel.tsx` links to `/auth/signup?returnTo=...` | Same signup page, then return to checkout | Must preserve return path and later server order eligibility |
| Login handoff | `app/auth/login/page.tsx` links to signup | Same signup page | No separate account creation |
| Profile creation | `POST /api/profiles`, `app/lib/profiles/server.ts` | Authenticated, verified-email account service | Creates analysis subjects after signup; not an account-creation boundary |
| Lifecycle initialization | `ensureAccountLifecycle()` | Lazy server-side row initialization | Must not be treated as evidence that Terms/age policy was accepted |

No signup modal or alternative account-creation component was found. The exact future authoritative account boundary should be one server endpoint or Server Action used by the signup page, while Supabase Auth remains the identity provider operation.

## 3. Current Legal and Consent UI Inventory

Absent from the current repository:

- Terms of Service page or route;
- Privacy Policy page or route;
- Refund/Cancellation policy page or route;
- signup agreement checkbox;
- signup age declaration;
- “agree all” control;
- consent/policy version constants;
- consent or policy-acceptance table;
- account metadata acceptance fields;
- effective-date/version display for public policies;
- shared legal/footer component;
- verified support/business/legal configuration.

Existing related surfaces:

- Guest 14+ self-attestation is implemented separately in `app/guest-saju/page.tsx` and enforced at both Guest initiation endpoints. It is not member consent evidence.
- Email confirmation is implemented through Supabase Auth and `app/auth/callback/route.ts`.
- Paid eligibility is represented by `account_lifecycles.paid_eligibility_status` and is enforced by `assertPaidPurchaseEligibility()` before order creation. It has no NICE/PASS implementation or setter in this baseline.
- Operator audit events in migrations 033/034 are for operator lookup actions, not customer consent.

## 4. Processing-Category and Legal-Basis Matrix

This is an implementation design classification, not legal advice. The exact lawful basis, notice, consent, retention, and required wording remain LEGAL REVIEW items.

| Category | Purpose | Data surface | Likely basis candidate | Signup checkbox automatically required? | Notice/link | Evidence recommendation |
|---|---|---|---|---|---|---|
| Account email | Create/login/recovery and deliver verification | Supabase Auth email | Contract/pre-contract necessity; legal review | Not automatically | Signup notice and Privacy link | Retain Auth verification state; Terms acceptance event if approved |
| Password/auth data | Authentication and account security | Supabase Auth credential processing; password is not exposed to app DB | Contract/security necessity; legal review | No separate checkbox | Privacy/security notice | Do not copy password or auth payload into app tables |
| Account UUID | Ownership and access control | `auth.users.id`, app FKs | Contract/security necessity | No | Privacy notice | Existing identity/linkage records; no checkbox evidence needed |
| Account lifecycle | Access state, closure, retry, paid boundary | `account_lifecycles` | Contract/security/operational necessity | No separate checkbox | Terms and Privacy | Existing lifecycle timestamps/status; not consent evidence |
| Email verification | Prove control of email address | `auth.users.email_confirmed_at` | Account security/service operation; legal review | No separate consent checkbox | Clear verification guidance | Auth-managed timestamp |
| 14+ self-attestation | Direct-user age policy gate | Signup request field; optional acceptance event | Owner policy; legal review for basis/evidence | Required product control under frozen policy | Terms/age explanation | Dedicated event only if approved; never `VERIFIED_ADULT` |
| Member profiles | Create subjects for saju analysis | `profiles` birth/saju fields | Contract/service necessity or legal review | No generic “personal data” checkbox by assumption | Privacy notice; Terms service scope | Terms/policy evidence, not profile contents |
| Free-analysis results | Provide requested free service and saved member result | `free_analysis_results` | Contract/service necessity; legal review | No automatic separate checkbox | Privacy notice | Do not store result content as consent evidence |
| Interests | Save user-selected product preferences | `interested_analyses` | User-requested service state; contract or legitimate interest candidate | No | Privacy notice | No consent event unless a separate policy requires it |
| Purchase/paid analysis | Order, payment, paid report, entitlement, refund handling | Orders, purchases, reports, entitlements, payment/refund records | Contract/pre-contract plus legal-obligation/security candidates; legal review | Checkout acknowledgement may be required, separate from signup | Terms, Privacy, Refund/Cancellation | Order-linked acknowledgement only if legally required |
| Support/refund | Resolve exact order, refund, duplicate payment, or service issue | Refund workflows, support messages/configuration | Contract/legal obligation/security; legal review | No signup checkbox | Refund policy and Privacy notice | Retain operational/financial evidence per legal mapping |
| Audit/security metadata | Prevent abuse, investigate access, support operator accountability | Lifecycle retry data, operator audit, auth security fields | Legitimate/security need or legal obligation candidate; legal review | No | Privacy notice | Immutable operator audit remains separate from consent events |

Do not create one blanket required “개인정보 수집·이용 동의” checkbox until legal review identifies a specific processing purpose and basis for which explicit consent is required. A Privacy Policy link/notice may be the correct surface for some categories.

## 5. Terms Acceptance Recommendation

Owner policy should be implemented as a required, unchecked Terms control if legal review confirms that signup requires explicit Terms acceptance:

`[필수] 이용약관에 동의합니다` -> public `/legal/terms` page.

Do not write final legal text in the implementation slice. The control should identify the exact policy version through shared configuration, not embed a long text blob in the account row or request log.

Recommended evidence:

- one immutable acceptance event for each accepted Terms version;
- user/account UUID;
- policy type `TERMS`;
- canonical policy version;
- accepted timestamp;
- source such as `SIGNUP`;
- generated event ID.

The same-version retry should be idempotent from the signup operation’s perspective. A unique key such as `(user_id, policy_type, policy_version, source)` can prevent duplicate evidence for one signup attempt, but do not use that uniqueness to erase an audit history if a later legal design requires multiple acceptance contexts. Major policy updates and re-consent can be deferred from V1 unless the owner/legal team requires version transitions now; the event shape should not prevent adding them later.

## 6. Member 14+ Evidence Recommendation

The required control applies to the direct account holder/service user, not to a profile subject. It must remain distinct from:

- profile birth date;
- analysis-subject age;
- email verification;
- `VERIFIED_ADULT`;
- NICE/PASS or any future adult identity provider.

Recommended initial evidence choice: use the same dedicated immutable event table if owner/legal review wants durable proof that signup included the 14+ declaration. Otherwise, accept a request-only boolean at the server signup boundary and do not persist it. Do not use account metadata because it loses version history and couples policy evidence to a mutable account row.

If persisted, use `policy_type = AGE_SELF_ATTESTATION`, an explicit policy version, `accepted_at`, and source `SIGNUP`. Never name the event `VERIFIED_AGE`, never set `VERIFIED_ADULT`, and never infer the value from a profile birth date.

Unlike the Guest flow, member signup has an account UUID after Auth creation, so evidence can be associated with that user. It still should not contain birth date, profile data, IP, device fingerprint, or raw checkbox text. Closure treatment is a legal review item: the event is more likely compliance/audit evidence than service-purpose profile data, but no retention period should be invented. Re-signup should not inherit old acceptance events by default; the new account generation should accept current policy versions independently.

## 7. Privacy Notice and Consent Recommendation

The signup UI should link to the Privacy Policy and describe account creation, authentication, profile/analysis service, saved state, and support/refund processing at the level approved by legal review.

Do not presume all of these require explicit consent. Candidate distinctions:

- account creation, authentication, and requested analysis may be service/contract processing or another reviewed basis;
- security, fraud prevention, and operator audit may rely on security/legitimate-interest or legal-obligation candidates, subject to review;
- financial and refund records may have legal/contract obligations, subject to retention mapping;
- optional marketing would need a separate unchecked control only if a real marketing program exists, which it does not in V1.

If legal review requires explicit privacy consent, define the exact processing category and version it separately, for example `PRIVACY_PROCESSING_CORE_V1`, rather than creating a vague all-purpose checkbox. The event should link to the Privacy Policy version and not store the full notice text.

## 8. Evidence Architecture Comparison

| Option | Simplicity | Versioning/auditability | Closure behavior | Main risk | Assessment |
|---|---|---|---|---|---|
| A. No evidence | Highest | Weak | Nothing extra | Cannot prove accepted version | Acceptable only if legal/owner confirms no evidence need |
| B. Account metadata fields | Medium | Poor for multiple versions/reacceptance | Coupled to account scrub/tombstone | Mutable state can overwrite history | Not recommended |
| C. Immutable event table | Medium | Strong and explicit | Separate retention/legal review | Requires migration/RLS/server insert | Recommended smallest robust design |
| D. Hybrid current fields + event history | Highest | Strong but duplicated | More closure/config complexity | Two sources can disagree | Defer; no V1 need identified |

Recommendation: Option C, but limit event types to Terms, approved required privacy acceptance if any, and approved signup age self-attestation. Do not build a general compliance platform.

## 9. Recommended Immutable Event Schema

Proposed future table name: `policy_acceptance_events` or `consent_events`; choose one canonical name before implementation.

Minimum fields:

- `id uuid primary key`;
- `user_id uuid not null references auth.users(id) on delete restrict`;
- `policy_type text not null` with a small allowlist such as `TERMS`, `AGE_SELF_ATTESTATION`, and an approved privacy type;
- `policy_version text not null`;
- `accepted_at timestamptz not null default now()`;
- `source text not null` with a small allowlist such as `SIGNUP`;
- `created_at timestamptz not null default now()`.

Potential constraints:

- nonblank bounded version/type/source;
- unique `(user_id, policy_type, policy_version, source)` if one acceptance per version/source is the chosen idempotency contract;
- no update/delete grants to normal clients;
- no raw checkbox wording or request payload.

Do not add IP, User-Agent, device fingerprint, birth date, email copy, profile ID, policy text blob, or request headers without a verified requirement. If withdrawal/replacement becomes legally relevant, model it explicitly later rather than overloading `accepted_at`.

Events are immutable. Repeated submission of the same policy version should converge to the existing event or a no-op. A failed event insert must not be silently treated as a successful required-acceptance signup if the event is part of the enforcement contract.

## 10. Signup Ordering and Failure Matrix

The current browser call cannot safely guarantee server evidence. Future recommended ordering:

1. Client collects separate unchecked required controls and policy versions from shared configuration.
2. A server signup boundary validates email/password shape, safe return path, required acceptance claims, and current policy versions.
3. Server creates the Auth user through the approved server-side Auth operation or uses a tightly coordinated two-phase contract.
4. Server obtains the resulting Auth user ID.
5. Server inserts immutable acceptance events idempotently and initializes the application lifecycle if the chosen contract requires immediate initialization.
6. Server returns “check email” state; email verification remains pending and separate.
7. Callback exchanges the email code and preserves safe `returnTo`.

The exact Supabase Auth server API and rollback capability must be confirmed before implementation. If Auth creation succeeds but evidence insertion fails, the safest behavior is not to report successful signup completion as policy-compliant: either delete/rollback the unverified Auth user where that operation is safe and approved, or mark the signup incomplete and provide a retry path that cannot create duplicate evidence. Do not invent a compensating state in this design.

| Failure | Required behavior |
|---|---|
| User checks boxes but Auth signup fails | No acceptance event; show bounded Auth error |
| Auth user created but app lifecycle initialization fails | Do not lose the Auth ID; retry deterministic initialization; do not claim full app signup until contract is complete |
| Event insert fails after Auth creation | Fail closed for required evidence; use approved rollback or explicit incomplete-signup recovery |
| Email verification never completes | Auth account may remain pending; acceptance event may exist if signup evidence was recorded, but it is not email verification or paid eligibility |
| Duplicate signup/retry | Auth provider’s duplicate semantics plus idempotent event uniqueness; never duplicate or overwrite historical evidence |
| User returns from Guest transfer | Preserve current transfer flow; transfer authentication is separate from signup acceptance evidence |
| User returns from checkout | Preserve safe checkout `returnTo`; paid eligibility is rechecked server-side before order creation |

A simpler alternative is client Auth signup followed by a server acceptance endpoint after session establishment, but that creates a window where Auth exists without required evidence. It should be used only if owner/legal accepts that state and the server can prevent service use until completion.

## 11. Server Enforcement Boundary

The authoritative future boundary should be a new server signup API or Server Action called by `app/auth/signup/page.tsx`. It must validate:

- required Terms acceptance and exact current version;
- 14+ self-attestation boolean, if required by owner policy;
- approved privacy acceptance, if legal review classifies one as required;
- safe return path;
- authenticated identity association for event insertion.

The browser may provide claims, but it cannot create evidence for another user, set lifecycle state, set `email_confirmed_at`, set `VERIFIED_ADULT`, or bypass the order boundary. The server must derive the Auth user ID from the Auth operation/session, not from a client-submitted user ID.

If Supabase Auth must remain browser-created, the minimum safe alternative is:

- browser completes `auth.signUp`;
- after a session/user ID is available, browser calls a server `complete-signup-policy` endpoint;
- server verifies the current Auth user and writes idempotent events;
- account service access remains incomplete until the required completion marker/events exist.

That alternative needs an explicit application state and is more complex. Prefer a single server-owned signup orchestration if supported safely by the project’s Supabase setup.

## 12. Email-Verification Interaction

Policy acceptance should occur at signup, before email verification, because it describes the terms under which the account creation request is made. Email verification should remain a separate required account-security step for paid use and any service operation that already requires verified email.

The distinctions must be visible in copy and code:

- 14+ self-attestation = user declaration;
- Terms/privacy acceptance = policy agreement or acknowledgement;
- email verification = control of the email address;
- `VERIFIED_ADULT` = separate paid eligibility state;
- future NICE/adult verification = provider boundary, not part of signup.

An unverified account may have a Terms/age acceptance event if the chosen signup transaction records it before email confirmation. That event must not grant active paid access or adult eligibility. If legal review requires acceptance only after email verification, move event insertion to a verified completion endpoint; do not silently mix both models.

## 13. Closure and Retention Treatment

If acceptance evidence is stored, classify it separately from service-purpose profile and analysis content:

- do not scrub it with profile/free-result content by default;
- retain only if a legal, security, or audit basis is approved;
- do not invent a duration;
- do not include profile birth data, analysis content, or raw policy text;
- ensure closed accounts cannot use acceptance events to regain service access.

The existing 52D-2 cleanup preserves minimal account/lifecycle/audit and financial linkage while scrubbing service data. A future migration must explicitly decide whether consent events remain as bounded compliance evidence or are removed after the approved period. Re-signup must not inherit prior acceptance events unless a later owner/legal design explicitly makes policy versions account-global rather than account-specific.

## 14. Signup UI Design

Future signup should preserve the current email/password form and add a clearly separated policy section before the CTA:

- `[필수] 이용약관에 동의합니다` with Terms link;
- `[필수] 저는 만 14세 이상입니다` with concise service-user clarification;
- `[필수/notice/none]` Privacy surface only after legal-basis decision.

All controls are unchecked by default. Required and optional controls must remain individually visible. An “모두 동의” control is optional and must only toggle visible applicable controls; it must not imply that every future policy is accepted or hide required/optional distinctions.

Validation requirements:

- no signup request while required controls are unchecked;
- inline error associated with the control group;
- no prechecked state;
- keyboard and screen-reader accessible labels;
- links to public policy pages work before login;
- mobile text wraps without obscuring the CTA;
- signup error does not echo passwords or raw request data;
- the confirmation-email state does not expose more email than the current deliberate display and should follow the final privacy review.

The signup explanation should continue to frame signup as saving/managing profiles and analyses, not as a condition for seeing the Guest free result.

## 15. Public Policy-Page Dependency

Do not ship required signup links pointing to missing routes or placeholder legal copy. Recommended sequence:

1. Legal/owner team approves policy identifiers, versions, effective dates, and final publication values.
2. Implement public `/legal/terms` and `/legal/privacy` shells with approved or clearly unpublished content, plus shared version config.
3. Implement the consent evidence/server contract against those stable versions.
4. Add signup controls and direct API/server enforcement.
5. Add regressions for version mismatch, missing acceptance, duplicate retry, and public route access.

If technical work must begin earlier, build a non-production contract/config test that fails when policy pages or verified versions are absent. Do not use fake production links or silently accept missing policies.

## 16. Versioning Strategy

Use a stable opaque policy version identifier controlled by one authoritative public-policy configuration source, for example `TERMS_2026_01` and `PRIVACY_2026_01`, rather than deriving versions from page text or scattered dates.

The same configuration should provide:

- policy type;
- version ID;
- effective date;
- public route;
- publication state;
- required/optional classification after legal approval.

Acceptance events reference the exact version ID. Displayed pages expose the same version and effective date. Components must not hardcode independent versions. Semantic-version support is unnecessary for this small V1 surface unless policy governance already uses it; stable code/version IDs are easier to compare and audit.

## 17. Security and RLS Design

For a future `policy_acceptance_events` table:

- enable RLS;
- revoke insert/update/delete from `anon` and `authenticated`;
- grant only the minimum service-role/server permissions;
- optionally allow authenticated users to read only their own bounded event types if the product needs an account-history view, otherwise provide no normal-client read;
- use `user_id` derived from verified server Auth state;
- use immutable event rows with no update/delete path;
- use bounded allowlist constraints for policy type/source;
- avoid bulk public reads and cross-user queries.

Operator audit events remain a separate security/audit surface. Consent events must not be written into operator audit reasons, and operator lookup APIs must not expose policy event payloads beyond an approved bounded status.

No client request may:

- create an event for another user;
- change an existing event;
- mark email verified;
- set `VERIFIED_ADULT`;
- set `ACTIVE`/`CLOSED` lifecycle state;
- provide a profile birth date as account age proof.

## 18. Exact Future Migration and File Plan

No migration should be added by 52D-3C-A. The smallest likely future implementation slice is:

### 52D-3C-B consent/evidence foundation

- one additive migration after current migration 036 for the immutable acceptance-event table;
- `app/lib/consent/` or equivalent server repository/validation module;
- one server signup completion/orchestration route or Server Action;
- policy configuration module shared by server and public pages;
- focused regression for RLS/uniqueness/idempotency/version matching.

### 52D-3C-C signup controls

- `app/auth/signup/page.tsx`;
- shared accessible policy-control component if it removes duplication;
- signup server boundary from 52D-3C-B;
- focused signup regression.

Potentially required only after architecture proof:

- `app/auth/callback/route.ts` for confirmation guidance or completion handoff;
- `app/lib/accounts/server.ts` for an explicit incomplete-signup/access state;
- `app/auth/complete-guest-analysis/page.tsx` only if Guest transfer must coordinate with new signup completion.

Do not modify Guest 52D-3B enforcement, checkout/NICE/adult eligibility, payment/refund code, or account-closure cleanup for this consent design.

## 19. OWNER Decisions Still Required

- Is explicit Terms acceptance required at signup in V1?
- Should member 14+ self-attestation be persisted as evidence or remain request/account state only?
- Is a Privacy Policy link/notice sufficient for core signup/profile/analysis processing, or is any explicit privacy consent required? If so, which exact category?
- Is an “agree all” convenience control wanted?
- Should policy acceptance be recorded before email verification or only after verification?
- Is server-owned Auth signup orchestration required, or is a temporary Auth-created/incomplete-policy state acceptable?
- Which account services are permitted before email verification and policy completion?
- Which policy event types are in the V1 allowlist?
- Should a future major policy update force re-consent immediately or be deferred?
- Should policy pages appear in public root/authenticated layouts and which shared footer owns them?

## 20. LEGAL Decisions Still Required

- Final Terms text and whether acceptance is required for account creation.
- Final age self-attestation wording and whether it needs evidence or a particular notice.
- Whether signup processing relies on contract/pre-contract necessity, consent, notice, legal obligation, legitimate interest/security, or another basis for each category.
- Whether any explicit Privacy consent is required, and its exact scope.
- Whether acceptance before email verification is legally and operationally appropriate.
- Required evidence fields, retention period, deletion/withdrawal treatment, and re-consent requirements.
- Whether 14+ direct-user policy has any special disclosure requirement; no Korean legal requirement is inferred here.
- Whether account, profile, analysis, support, and financial retention statements must appear in signup or only the Privacy/Terms pages.
- Final Korean copy for required/optional labels and errors.

## 21. What Can Safely Be Implemented Before Final Legal Wording

Safe technical work before final wording, provided it is not published as final policy:

- policy configuration types with an explicit unpublished/missing state;
- immutable event schema prototype and server-only RLS tests;
- request validation that requires configured version IDs without embedding legal text;
- signup component mechanics with unchecked controls and accessible error handling;
- server-vs-client orchestration proof;
- tests proving client fields cannot set `VERIFIED_ADULT`, email verification, lifecycle state, or subject-age eligibility;
- public route shells only when they cannot render fabricated legal copy.

Not safe to finalize before legal review:

- mandatory privacy-consent classification;
- final Terms/Privacy text;
- final age declaration wording beyond the provisional product copy;
- acceptance retention/deletion claims;
- claims that email verification proves age or that signup proves adult eligibility;
- actual business/support disclosures.

## 22. Final Implementation Recommendation

Proceed in this order after owner/legal decisions:

1. Freeze policy identifiers, effective dates, applicable event types, and public-route ownership.
2. Add one server-authoritative immutable acceptance-event migration and repository with strict RLS.
3. Add a server signup orchestration or explicit incomplete-policy completion boundary; preserve Supabase email verification and safe `returnTo` behavior.
4. Add separate unchecked Terms and 14+ controls to the existing signup form; add a Privacy control only if its exact legal basis requires it.
5. Add focused tests for duplicate signup, event insertion failure, pending email verification, Guest transfer handoff, checkout return, no prechecked state, and no `VERIFIED_ADULT` coupling.
6. Add public policy pages before enabling production links.

The existing Guest 14+ self-attestation, paid `ACTIVE + verified email + VERIFIED_ADULT` boundary, and current login/email-verification behavior remain unchanged by this design.
