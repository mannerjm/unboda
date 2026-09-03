# STEP 52D-3A Age, Consent and Legal Surface Design

## 1. Executive Verdict

**Verdict: PASS for design and dependency planning.** No source, migration, test, database, remote, provider, commit, or push action is required for this read-only step.

The repository has clear insertion points for V1 age, consent, checkout disclosure, legal-page, footer, and closure-warning work. The safest sequence is to establish a small consent/evidence contract and server enforcement foundation first, then add the Guest and signup UX, then public legal surfaces, then checkout disclosure, and finally closure-warning copy alignment.

Final Korean legal wording, lawful basis, retention periods, business identity values, customer contact values, and any mandatory affirmative checkout language remain legal/owner review items. They must not be invented in implementation.

## 2. Frozen Product Policy

The following are owner-frozen product decisions from `STEP_52C_POLICY_CONTRACT.md`, not legal conclusions:

- Direct Unboda users are age 14+ in V1.
- Analysis subjects have no age restriction.
- Direct-user eligibility must never be inferred from a profile birth date.
- A Guest may submit saju input, explicitly self-confirm being 14+, receive the full promised free result, and remain a Guest.
- Guest confirmation is self-attestation, not identity or adult verification.
- Signup requires 14+ confirmation, email/password, required policy confirmation, and email verification.
- Signup does not require NICE/adult identity verification.
- Paid purchase requires an authenticated `ACTIVE` account, verified email, and `VERIFIED_ADULT` before payment/new order creation.
- NICE/adult identity verification belongs at the paid-purchase boundary.
- Free results are not hidden behind signup; signup is positioned for saving, retention, and profile management.
- Payment approval starts personalized paid generation immediately. There is no post-payment customer-facing “start generation” button.
- Payment must not be described as categorically non-refundable.
- Refund entry is My Page -> payment history -> exact order/purchase -> refund/cancellation request.
- A support email and business disclosures will exist in V1 only after verified values are provisioned.

Current implementation and legal review must remain separately labeled from these product decisions.

## 3. Current Route and Component Inventory

| Surface | Current route/component | Current implementation |
|---|---|---|
| Root | `app/page.tsx` | Server state machine for Guest, profile, free-result, and authenticated states; no legal footer |
| Global layout | `app/layout.tsx` | Root metadata/body wrapper using `Geist` fonts; no footer or policy navigation |
| Middleware | `middleware.ts` | Refreshes Supabase session claims and cookies; does not enforce an auth route allowlist |
| Authenticated shell | `app/components/AppShell.tsx` | Desktop sidebar/header and six-item mobile navigation; customer product navigation only |
| Saju input | `app/saju/page.tsx` | Authenticated profile/input flow |
| Guest input | `app/guest-saju/page.tsx` | Client form; probes saved Guest result and POSTs profile input to `/api/guest-free-analysis/start`; no age confirmation |
| Guest start | `app/api/guest-free-analysis/start/route.ts` | Validates Guest profile input and creates server-backed Guest analysis; current request has no age-attestation field |
| Guest execution | `app/guest-loading/page.tsx`, `/api/guest-free-analysis/generate` | Starts generation and routes to Guest result; no signup requirement |
| Guest result | `app/guest-result/page.tsx`, `/api/guest-free-analysis` | Server-backed full result rendering and retry; no age state persisted |
| Guest transfer | `app/auth/complete-guest-analysis/page.tsx`, `/api/guest-free-analysis/transfer` | Explicit transfer after authentication; separate from initial Guest access |
| Signup | `app/auth/signup/page.tsx` | Client email/password form; calls Supabase `auth.signUp`; no age/policy controls |
| Login | `app/auth/login/page.tsx` | Client email/password login and safe `returnTo` redirect |
| Email callback | `app/auth/callback/route.ts` | Exchanges confirmation code and redirects to validated `returnTo` or `/result`; no dedicated confirmation page |
| Password recovery | `app/auth/forgot-password`, `app/auth/reset-password` | Existing account recovery surfaces |
| My Page | `app/mypage/page.tsx`, `/api/mypage/summary` | Profiles, free-analysis state, purchased analysis/history, and refund summaries |
| Account | `app/account/page.tsx`, account API routes | Email/password controls, eligibility display, closure request/cancel UI |
| Paid catalog | `app/deep-analysis/page.tsx` | Premium catalog and product navigation |
| Paid detail | `app/paid-analysis/[productId]/page.tsx` and access panels | Product detail, profile selection, saved-interest state, account access |
| Checkout | `app/checkout/[productId]/page.tsx`, `CheckoutAccessPanel.tsx` | Shows product/profile and invokes `/api/orders` before Toss payment request |
| Order creation | `app/api/orders/route.ts` and `app/lib/purchases/server.ts` | Server derives identity/amount and enforces paid eligibility before order insertion |
| Payment confirmation | `app/api/orders/[orderId]/confirm-payment/route.ts` | Existing payment confirmation/finalization boundary |
| Checkout result | `app/checkout/success/page.tsx`, `app/checkout/fail/page.tsx` | Existing payment outcome guidance |
| Refund | `app/api/orders/[orderId]/refund/route.ts`, My Page summaries | Exact-order refund request/status path; current policy messages are not a full public policy page |
| Purchased library | `app/purchased-analyses/page.tsx`, `PurchasedAnalysesList*` | Authenticated purchased-analysis library |
| Interests | `app/interests/page.tsx`, `app/lib/interestedAnalyses/server.ts` | Authenticated saved product state |
| Existing policy pages | None found | Terms, Privacy, and Refund/Cancellation routes do not exist |
| Footer | None found in root layout or shared shell | Public legal/business navigation must be added |

The natural shared ownership is a new public legal/footer component rendered from `app/layout.tsx` or a public layout boundary. It should not be duplicated in each page. `AppShell` should continue owning authenticated product navigation, while the legal footer can be shared by public pages and optionally by authenticated pages outside the shell’s navigation region.

## 4. Guest 14+ Execution-Boundary Design

### Authoritative boundary

The current Guest execution begins at the submit handler in `app/guest-saju/page.tsx`, which sends profile input to `POST /api/guest-free-analysis/start`. The server validator is `validateGuestProfileInput` in `app/lib/guestFreeAnalyses/input.ts`; the route creates a server-backed row and an HttpOnly 24-hour credential. The profile birth date is analysis-subject input and must not be used to infer the direct user’s age.

### Recommended UX

Add a required, unchecked semantic checkbox immediately before the submit CTA:

`저는 만 14세 이상입니다.`

Final wording is a legal review item. The label must explain self-attestation if legal review requires that clarification; it must never say “성인 인증 완료”, “본인 인증”, or imply provider verification.

When unchecked:

- the CTA remains disabled or submission returns an inline validation error;
- no `/start` request is sent;
- the error is associated with the checkbox group;
- the result remains available without signup when checked and the server flow succeeds.

Do not add phone verification, signup, profile-age validation, or a persistent Guest “verified age” record.

### Authority recommendation

Use a **client acknowledgement plus server request field**, without durable Guest evidence in V1 unless legal review requires evidence.

- Client UI owns immediate affordance and accessibility feedback.
- The start route accepts an explicit `ageSelfAttested: true` request field and rejects missing/false values.
- The server treats this as a request-time self-attestation only; it does not set `VERIFIED_ADULT`, create an identity-verification record, or infer age from profile data.
- Do not persist the field in `guest_free_analyses` by default. Persisting it would add Guest data and would not turn self-attestation into verified age.

This server check closes the direct-API bypass created by a UI-only checkbox. A caller can still lie about self-attestation, but that is the defined V1 self-attestation model; it is not an identity-verification bypass.

The existing 24-hour access, full free result, Guest transfer, and 52D-1B seven-day cleanup behavior remain unchanged.

## 5. Signup Consent Design

### Current flow

`app/auth/signup/page.tsx` currently collects email, password, and confirmation, then calls Supabase `auth.signUp` with an email-confirmation redirect. There is no current consent table, consent version, acceptance timestamp, or server-side signup policy contract.

### Proposed required controls

Before `auth.signUp`, use separate, unchecked controls with explicit labels:

1. Required Terms of Service agreement, linking to `/legal/terms`.
2. Required 14+ self-confirmation.
3. Privacy notice/processing acknowledgement only if the final legal basis and product requirement classify it as required.

Do not automatically add a mandatory “개인정보 수집·이용 동의” checkbox solely because the product processes personal data. Whether notice, contract necessity, consent, or another legal basis applies is a LEGAL REVIEW item.

No marketing checkbox is needed in V1 because no marketing program exists. If an optional control is ever added, it must remain visually and semantically separate from required controls and default to unchecked.

An “agree all” convenience control may be added only as a parent control that toggles separate required/optional controls. It must not hide the individual policy links, required state, or optional distinction, and it must never precheck acceptance without an explicit user action.

### Enforcement

The browser should block submission when required controls are unchecked. The server-side signup boundary should also require a versioned policy contract or equivalent request claims before creating an account if the product chooses server evidence. Client fields must never set paid eligibility.

The signup copy must clearly position the 14+ control as direct-user self-attestation, not subject-age validation and not adult identity verification.

## 6. Email-Verification Distinction

Current email verification is Supabase confirmation email -> `app/auth/callback/route.ts` -> code exchange -> safe redirect. `auth.users.email_confirmed_at` is the current server authority used by `requireVerifiedEmailAccount` and order eligibility.

Future copy must distinguish:

- **14+ self-confirmation:** a user declaration made during Guest use or signup;
- **email verification:** proof of control of the email address through Supabase confirmation;
- **paid adult eligibility:** the separate `VERIFIED_ADULT` state required before paid order creation.

Email verification must never be labeled adult verification. `VERIFIED_ADULT` must remain server-derived and fail-closed. No NICE/PASS provider UI should be invented until a real provider integration exists.

The callback may later redirect to a small confirmation state when guidance is needed, but this is not required to design the legal pages. Any confirmation state should preserve the validated `returnTo` flow and explain the three concepts separately.

## 7. Checkout Disclosure Design

### Purchase boundary

The customer-facing checkout is `app/checkout/[productId]/page.tsx` plus `CheckoutAccessPanel.tsx`. The panel first calls `POST /api/orders`; the server uses `createPendingOrder` and the account eligibility boundary before an order is created. The server requires:

- authenticated user;
- lifecycle `ACTIVE`;
- verified email;
- `VERIFIED_ADULT`.

The selected profile is an analysis subject. Its age must not be conflated with the account holder’s paid eligibility.

### Pre-payment review block

Before the payment CTA, display a compact review block containing:

- exact product name and edition/period;
- selected profile label and explicit indication that this is the analysis subject;
- price and currency;
- statement that payment approval starts personalized analysis generation immediately;
- concise reviewed cancellation/withdrawal/refund summary;
- link to `/legal/refund-cancellation`;
- Terms and Privacy links where required by final legal review.

Do not say payment is absolutely non-refundable. Do not promise a refund outcome. Do not insert provider or NICE steps before their actual integration point.

If legal review requires affirmative acknowledgement of immediate digital supply/generation, implement it as a separate unchecked checkout control with its own linked explanation and server-enforced claim before `/api/orders`. Whether that control is legally required is unresolved.

### Eligibility failure/recovery

Current failure appears from `/api/orders` as a sanitized customer error rendered by `CheckoutAccessPanel.tsx`. `VERIFIED_ADULT` has no current setter or NICE/PASS implementation. Future adult-verification flow belongs immediately before order creation, not in Guest analysis, signup, or profile input. Its exact UI/protocol is a provider/business implementation item.

## 8. Digital-Content Withdrawal Surface Matrix

| Topic | Short checkout disclosure | Required affirmative control | Full public policy | My Page/order detail |
|---|---:|---:|---:|---:|
| Personalized analysis generation begins after payment approval | Yes | Possibly, legal review | Yes | Yes, status context |
| Withdrawal/cancellation conditions | Summary | Only if legally required | Yes | Exact order action/status |
| Refund exceptions | Summary | No blanket waiver | Yes | Request outcome/status |
| System or Unboda processing error | Short support path | No | Yes | Failure/refund guidance |
| Duplicate payment | Short support path | No | Yes | Exact order/payment history |
| Wrong customer input | Short warning and correction path | Possibly, legal review | Yes | Order support/refund path |
| Paid report unavailable or not supplied | Short status explanation | No | Yes | Refund/request state |
| Absolute “no refund” claim | Never | Never without review | Never as a product shortcut | Never |

Final language must be supplied or approved through legal review. Product copy should provide links and accurate state, not make legal determinations.

## 9. Terms, Privacy, and Refund/Cancellation IA

Recommended public routes:

- `/legal/terms`
- `/legal/privacy`
- `/legal/refund-cancellation`

These names avoid collision with existing Auth routes and make the legal namespace explicit. All three pages should be public without login and accessible before signup and payment.

### Terms of Service

Purpose: contract, service scope, account rules, analysis-subject distinction, age rule, paid service flow, prohibited use, account closure, and dispute/support routing.

Sections should include service description, direct-user 14+ rule, no age restriction for subjects, Guest/free-result promise, account obligations, paid-generation behavior, acceptable use, closure effects, retained transaction records, changes/versioning, and contact/business identity values. Final copy and legal basis are legal-owned.

### Privacy Policy

Purpose: explain categories, purposes, authority/basis, recipients/processors, retention, user rights/process, cookies/Guest credential handling, and support contact.

Sections must be populated only from verified implementation and legal review. Do not state retention periods or legal bases that have not been approved. The page may reference policy version and effective date.

### Refund/Cancellation Policy

Purpose: describe payment approval, immediate personalized generation, withdrawal/cancellation conditions, refund categories/process, duplicate payment, service error, unavailable content, status handling, and My Page entry path.

The page must not promise or deny a refund categorically. It should link the exact-order My Page workflow and use the existing refund state vocabulary only after final legal copy is approved.

Each page should show an effective date and policy version from one authoritative configuration. Pages are public, cache behavior must avoid accidentally exposing account data, and no page should require a customer session.

## 10. Consent and Evidence Persistence Recommendation

No consent/version table was found in the current schema. The current product also has no server-persisted signup acceptance evidence.

Recommendation: **Option C, a dedicated immutable consent/acceptance event table**, but introduce it in the first future foundation slice only after owner/legal agreement on which events require evidence.

A suitable minimal shape would be:

- event ID;
- user ID;
- consent type, such as `TERMS`, legally required privacy acceptance if applicable, or `AGE_SELF_ATTESTATION`;
- policy version;
- accepted-at timestamp;
- action/outcome if withdrawal or replacement is meaningful.

Do not store checkbox text blobs, IP addresses, device fingerprints, or unnecessary request metadata. Do not store Guest self-attestation permanently by default. Do not represent self-attestation as `VERIFIED_ADULT` or provider verification.

Why not account metadata? It couples mutable policy evidence to the account row, makes multiple versions/re-acceptance awkward, and is less auditable. Why not no evidence? It is simplest, but weak for proving which version a member accepted. The dedicated event table is the smallest robust architecture if legal/owner review confirms evidence is desired.

Separate concerns:

- Terms acceptance may need immutable version evidence.
- A required signup privacy acknowledgement depends on legal basis and must not be assumed.
- Signup 14+ self-attestation may be recorded only if owner/legal review wants evidence; it remains self-attestation.
- Checkout immediate-generation acknowledgement may require an order-linked acceptance record if legally required. It should not be stored as generic account consent.
- Guest self-attestation should remain request-scoped unless a verified requirement says otherwise.

## 11. Account-Closure Warning Design

Current warning is inline in `app/account/page.tsx`. It explains `DELETION_REQUESTED`, blocks new paid purchase, and notes pending refund/payment checks. It does not yet explain the completed 52D-2 cleanup effects.

Future final confirmation should accurately state that:

- saved profiles become unavailable;
- free and personalized analyses become unavailable;
- purchased report content becomes unavailable after closure;
- restoration after closure or re-signup is not promised;
- legally retained transaction, dispute, reconciliation, or audit records may remain separately;
- unresolved payment/refund work may prevent closure finalization;
- account closure is not a claim that every database row is physically deleted.

The warning must not expose implementation internals, promise a universal deletion timestamp, or imply that profile subjects’ ages control the account-holder rule. The final copy should be a small component in the account closure confirmation area, linked to the public policy pages.

## 12. Footer and Business Disclosure Architecture

There is currently no shared footer. Add one public `LegalFooter` component used by the root layout/public legal pages and, where layout permits, authenticated public-facing pages. It should support responsive desktop and mobile rendering without changing AppShell’s six-destination navigation.

Design slots for:

- verified business/trade name;
- representative;
- business registration number;
- business address;
- customer service telephone;
- support email;
- mail-order/ecommerce registration information where applicable;
- Terms, Privacy, and Refund/Cancellation links;
- applicable business-information verification link.

Use typed configuration values in design and tests such as `VERIFIED_BUSINESS_ADDRESS` and `VERIFIED_CUSTOMER_PHONE`; never ship those placeholder strings to customers. Do not insert a private home address, personal phone, fake support email, or unverified registration data.

The footer should be compact, readable at 390px, keyboard accessible, and present on public pages before login. Authenticated AppShell pages may use the same legal component below their content if that does not interfere with the existing shell/navigation.

## 13. Business-Value Configuration

Recommended source: a server-side public-business configuration module backed by deployment configuration, with explicit validation that required values are provisioned before publication. The values are public disclosures, not secrets, but they should not be scattered across pages or placed in `NEXT_PUBLIC_*` merely for convenience.

The configuration should distinguish:

- required verified values;
- optional registration fields;
- effective date and policy versions;
- safe absence state used during pre-publication development.

Terms, Privacy, Refund/Cancellation, Footer, checkout links, and support guidance should all consume the same source. The implementation must fail clearly or hide a disclosure slot when a required verified value is absent; it must never render fake placeholders in production.

## 14. Public Route and Middleware Analysis

`middleware.ts` refreshes Supabase claims but does not redirect unauthenticated users. The current public pages are accessible by route unless their own server/client code requires an account. Therefore `/legal/terms`, `/legal/privacy`, `/legal/refund-cancellation`, and a public business-information section can be added without a middleware auth exception.

Future legal pages must not call `requireActiveAccount`, `requireVerifiedEmailAccount`, or paid eligibility helpers. Guest age confirmation remains local to Guest analysis execution and must not make legal pages authenticated. Legal links should remain usable from login, signup, Guest input, product detail, and checkout.

Any future middleware changes should preserve safe return paths and session-refresh behavior; none are required by this design.

## 15. Mobile and Accessibility Requirements

Use current responsive conventions and test at desktop and 390px widths.

- Checkbox hit areas should be at least a comfortable mobile target and include the label in the clickable association.
- Use native semantic `input type="checkbox"` with `label htmlFor` or an equivalent accessible grouping.
- Required state must not be indicated by color alone.
- Validation text must be associated with the checkbox group through `aria-describedby` and, where appropriate, `aria-invalid`.
- Focus must remain visible for links, checkboxes, accordions, and checkout controls.
- Policy links must have descriptive names and open in a predictable same-tab flow unless legal UX explicitly chooses otherwise.
- Signup must remain usable when the policy section makes the form taller; do not hide required controls below an inaccessible sticky CTA.
- Checkout disclosures should wrap naturally and keep the payment CTA stable; legal text may expand below the summary rather than overlap it.
- Footer columns should collapse into readable blocks on mobile; business values must wrap without horizontal scrolling.
- No consent box may be prechecked.
- Screen readers must hear required versus optional distinctions and the difference between self-attestation, email verification, and paid adult eligibility.

## 16. Client, Server, Database, and Provider Trust Boundary

| Decision | Client UI | Server route/service | Database | Provider |
|---|---|---|---|---|
| Guest 14+ self-attestation | Shows unchecked control and blocks obvious submit | Must require explicit `true` request field before Guest start; must not call it verification | No durable Guest evidence by default | None |
| Signup Terms acceptance | Collects separate required control | Must enforce required claim/evidence if persisted acceptance is selected | Dedicated immutable evidence table only if approved | None |
| Signup 14+ self-attestation | Collects separate required control | Enforces request contract; never maps it to adult eligibility | Optional acceptance event, not provider verification | None |
| Email verification | Displays confirmation guidance | `auth.users.email_confirmed_at` is authoritative | Auth-managed | Supabase Auth email flow |
| Paid adult eligibility | Displays state/error only | `assertPaidPurchaseEligibility` remains authoritative before order creation | `account_lifecycles.paid_eligibility_status` remains fail-closed | Future provider only; NICE not implemented |
| Checkout acknowledgement | Displays separate unchecked control if legally required | Must reject order creation when required acknowledgement is absent | Order-linked evidence only if approved | None |
| Legal page access | Public links/pages | Must not require customer session | No customer data access | None |
| Business disclosure | Renders verified public configuration | Validates configuration source | No secrets or customer data | None |

No client field may set `VERIFIED_ADULT`, bypass account status, create an order, or turn Guest self-attestation into identity verification.

## 17. Exact Expected Implementation Files by Future Slice

### 52D-3B: consent/evidence foundation

Expected files, subject to final evidence decision:

- new migration for a dedicated immutable acceptance-event table;
- `app/lib/consent/*` server validation/repository module;
- signup and Guest route enforcement only if server request contracts require it;
- focused static/local regression for version, required state, and no prechecked evidence;
- no NICE/provider code.

### 52D-3C: Guest 14+ and signup policy UX

- `app/guest-saju/page.tsx`;
- `app/api/guest-free-analysis/start/route.ts`;
- `app/auth/signup/page.tsx`;
- possibly shared checkbox/consent component under `app/components/`;
- focused Guest and signup regressions.

### 52D-3D: public legal pages and footer

- `app/legal/terms/page.tsx`;
- `app/legal/privacy/page.tsx`;
- `app/legal/refund-cancellation/page.tsx`;
- `app/components/LegalFooter.tsx`;
- `app/lib/publicBusinessConfig.ts` or the approved equivalent config module;
- `app/layout.tsx` or a public layout wrapper;
- public-route and responsive/accessibility regressions.

### 52D-3E: checkout disclosure/acknowledgement

- `app/checkout/[productId]/page.tsx`;
- `app/checkout/[productId]/CheckoutAccessPanel.tsx`;
- `app/api/orders/route.ts` only if a legally required acknowledgement must be server-enforced;
- order-linked consent migration/repository only if approved;
- checkout regression.

### 52D-3F: account closure warning alignment

- `app/account/page.tsx`;
- potentially a shared disclosure component or legal-link component;
- focused copy/accessibility regression.

Do not modify payment/refund policy, adult eligibility implementation, Guest 24-hour/7-day behavior, or stale unrelated regressions as part of these slices unless a direct contract dependency is proven.

## 18. OWNER Decisions Still Required

- Whether V1 requires persisted evidence for Terms acceptance.
- Whether signup 14+ self-attestation should be persisted as an acceptance event or remain request/account state only.
- Whether checkout needs an affirmative immediate-generation acknowledgement.
- Whether an “agree all” control is desired, provided it preserves separate required/optional controls.
- Exact product copy tone and placement for Guest self-attestation and the signup save/retain explanation.
- Whether `anchorDate` or other existing service metadata is referenced in legal pages; this design does not alter 52D-2 data cleanup.
- Whether legal/footer should appear below authenticated AppShell content or only in public/root layouts.
- Who owns approval and publication of policy versions/effective dates.
- Which verified business fields are available for the initial release.

## 19. LEGAL Decisions Still Required

- Final Korean Terms, Privacy, and Refund/Cancellation copy.
- Whether 14+ self-attestation needs a particular wording, evidence, notice, or retention treatment.
- Legal basis and notice/consent treatment for signup account creation, authentication, profile/saju processing, Guest processing, paid analysis, and support/refund handling.
- Whether immediate personalized digital generation changes withdrawal/cancellation disclosure or requires affirmative acceptance.
- Conditions and exceptions for refunds involving system failure, duplicate payment, wrong input, unavailable content, and provider/payment errors.
- Required business disclosure fields and publication format.
- Required support/contact disclosures and lawful retention statements.
- Whether policy acceptance versions must be retained, and for how long.
- Whether any Korean e-commerce/mail-order disclosure or business-information verification link is applicable; no requirement is inferred here.

## 20. PROVIDER and Business Facts Still Required

- A provisioned and verified official support email address.
- Verified business/trade name and representative.
- Verified business registration number.
- Verified business address; do not use a personal home address unless intentionally approved for publication.
- Verified customer-service telephone number.
- Applicable mail-order/ecommerce registration information and official verification URL, if any.
- Actual future adult-verification provider, contract, redirect/callback behavior, status mapping, and failure/retry semantics. NICE/PASS is not implemented and must not be assumed.
- Production Toss configuration and approved customer-facing payment wording remain separate from this legal design; no provider was contacted.

## 21. Recommended Implementation Sequence

1. **52D-3B:** settle evidence decisions and add a minimal server-side consent contract only for approved acceptance types.
2. **52D-3C:** add Guest 14+ self-attestation at the Guest start request boundary and signup Terms/age controls; preserve full Guest results and the 24-hour flow.
3. **52D-3D:** add public Terms, Privacy, and Refund/Cancellation page shells, shared footer, verified business configuration, and public-route/accessibility tests. Do not publish fabricated legal/business values.
4. **52D-3E:** add checkout review disclosures and any legally required affirmative acknowledgement at the `/api/orders` trust boundary; do not alter eligibility or refund policy.
5. **52D-3F:** align account closure warning copy with 52D-2 cleanup and retained financial/legal metadata without claiming universal physical deletion.
6. Validate desktop, 390px mobile, keyboard, screen-reader semantics, direct API bypasses, and server-side trust boundaries for each slice.

## 22. Final Verdict: What Can Safely Be Implemented Before Final Legal Copy

Safe before final wording, provided placeholders are not published:

- component and route shells for public legal pages;
- shared footer structure and verified-value configuration validation;
- semantic unchecked checkbox mechanics and server request validation;
- Guest self-attestation request enforcement without durable Guest evidence;
- clear separation of email verification, self-attestation, and paid eligibility;
- checkout layout slots showing product/profile/price and an explicit immediate-generation placeholder marked for review;
- account-warning component structure and links;
- accessibility, responsive, and direct-API regression scaffolding.

Not safe to finalize without owner/legal review:

- exact Korean legal copy;
- mandatory privacy-consent classification;
- final refund/withdrawal wording;
- claims about lawful basis or retention duration;
- actual business address, telephone, support email, registration data;
- NICE/adult-verification UI or provider protocol;
- any categorical no-refund statement.

No implementation was performed by STEP 52D-3A.
