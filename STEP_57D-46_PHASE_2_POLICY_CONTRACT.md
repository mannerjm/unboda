# STEP 57D-46 ??PHASE 2 POLICY CONTRACT
## ACCOUNT / AGE / IDENTITY / DELETION POLICY DESIGN

**Date:** 2026-08-30
**Phase:** 2 (Policy Design Only)
**Status:** No code/database changes made
**Basis:** Phase 1 Inventory verified findings

---

## 1. ACCOUNT HOLDER VS SAJU PROFILE BOUNDARY

### Formal Invariant

**CANONICAL RULE:**

```
ACCOUNT HOLDER = Supabase auth.users entity
  - Identity: email (verified)
  - Properties: authentication state, eligibility status, lifecycle state
  - Bounded: Supabase Auth session, account_lifecycles row, account controls

SAJU PROFILE = public.profiles entity
  - Identity: profile_id, user_id (foreign key to account holder)
  - Properties: birth_date, birth_time, gender, calendar_type, relationship_type
  - Purpose: Subject of birth-chart analysis (may be self/spouse/child/parent/sibling/other)
  - Bounded: profiles table, free/paid analysis targeting this subject

SEPARATION INVARIANT:

1. Saju profile birth_date MUST NOT establish account-holder age
   - Profile DOB describes analysis subject, not account owner
   - Even if profile.relationship_type == "self", it is NOT legal identity proof
   - Profile DOB is NOT used for account eligibility checks

2. Profile relationship_type MUST NOT be treated as legal identity
   - "self" means "this profile represents myself" (UI convenience only)
   - "self" profile birth data is still analysis data, not identity proof
   - Multiple users may have "self" profiles with same birth date (unrelated people)
   - Accounts are not verified through Saju profile data

3. Identity / Adult Eligibility MUST be account-level only
   - Stored in: account_lifecycles.paid_eligibility_status + related fields
   - Source: Verified through external provider (NICE, PASS, etc.) or declaration
   - NOT derived from: profile birth date, profile relationship type, profile labels
   - Account-level state applies to ALL profiles owned by that account holder

4. Account-level eligibility gates apply to account holder
   - If account.paid_eligibility_status == REVOKED, account holder cannot purchase
   - NOT: "this profile cannot be analyzed"
   - But: "this account cannot purchase analysis for any of their profiles"
```

**Rationale:**

- **Data minimization:** Account holder age/identity is orthogonal to Saju profile subject data
- **Legal clarity:** Account eligibility is about who is paying/contracting, not who is being analyzed
- **Operator simplicity:** One eligibility state per account, not per profile
- **Future-proof:** Profile data can be deleted; eligibility decisions must be audited separately

---

## 2. ACCOUNT LIFECYCLE SEMANTICS

### State Definitions

**ACTIVE**

**Meaning:** Account is operational and available for all customer functions.

**Customer Capabilities:**
- ??Login (email + password via Supabase Auth)
- ??Create profiles
- ??Edit profiles
- ??Delete profiles (if no blockers)
- ??Run free analysis
- ??View free analysis results
- ??Enter checkout
- ??Create orders for paid analysis
- ??Confirm payments
- ??Access purchased reports
- ??Manage account settings (email verification, password recovery)
- ??Request refunds for purchases

**Server Enforcement:**
- Required for order creation: `account.status !== "ACTIVE"` ??reject with 403
- Required for payment confirmation: `account.status !== "ACTIVE"` ??reject with 403
- Implied for all authenticated API endpoints

**Transition Out:**
- Only when account holder initiates closure ??DELETION_REQUESTED

**Default:** All new users are ACTIVE

---

**DELETION_REQUESTED**

**Meaning:** Account holder has requested account closure. Cleanup is in progress. Account is being wound down but has not yet been fully closed.

**Customer Capabilities:**
- ??Login (session expires, account inaccessible)
- ??Create profiles
- ??Edit profiles
- ??Delete profiles
- ??Run free analysis
- ??View free analysis results (unless pre-downloaded)
- ??Enter checkout
- ??Create orders
- ??Confirm payments
- ??Request refunds
- ?좑툘 View existing purchased reports: Depends on policy (see section 10)

**Server Enforcement:**
- `requireActiveAccount()` rejects access with 403
- Financial blockers checked: `getAccountClosureFinancialBlockers(userId)`

**Transition In:**
- From ACTIVE when account holder requests closure
- Requires all financial blockers to be resolved first

**Transition Out:**
- To CLOSED when safe deletion/anonymization is complete
- Or back to ACTIVE if account holder cancels (future capability)

**Duration:** Varies by cleanup requirements (could be hours to days depending on refund/payment reconciliation state)

---

**CLOSED**

**Meaning:** Account lifecycle has terminated. Account holder cannot login. All customer-facing access is revoked. Audit trail and certain financial records are retained separately.

**Customer Capabilities:**
- ??Login
- ??Access any service
- ??Retrieve personal data
- ??Request operations

**Server Enforcement:**
- `requireActiveAccount()` rejects with 403
- Auth session is no longer valid

**Transition In:**
- From DELETION_REQUESTED when safe cleanup is complete

**Transition Out:**
- No transition out (terminal state)
- Exception: Future capability to export data for legal/compliance review (deferred)

**Retention:**
- Account_lifecycles row persists (audit trail)
- Generation immutable (for re-registration logic if enabled later)
- Financial records retained per separate financial retention policy

---

### State Transition Matrix

```
ACTIVE ??DELETION_REQUESTED
  Trigger: Account holder requests closure
  Prerequisite: No OWNER_REVIEW_REQUIRED financial blockers
  Action: Begin account closure workflow
  Duration: Depends on background cleanup

DELETION_REQUESTED ??CLOSED
  Trigger: All cleanup/anonymization complete
  Prerequisite: Audit trail established
  Action: Finalize account closure
  Duration: Varies

DELETION_REQUESTED ??ACTIVE (future)
  Trigger: Account holder cancels closure before finalization
  Prerequisite: Not yet started safe deletion
  Status: Deferred (not yet designed)

ACTIVE ??ACTIVE
  Allowed: Password change, email verification retry, etc. (normal operations)
```

---

## 3. PAID ELIGIBILITY SEMANTICS

### State Definitions

**UNVERIFIED**

**Canonical Meaning:**
Account holder's eligibility status (adult/age) has not been established or verified. Identity verification is pending.

**When This State Occurs:**
- Default state for all new accounts
- After eligibility is revoked (return to unverified, awaiting re-verification)

**Checkout Behavior:**
- Entry: ??Allowed (unverified user can view checkout)
- Order creation: ?좑툘 Depends on enforcement flag (see section 6 for policy)
- Payment confirmation: ?좑툘 Depends on enforcement flag

**Current Production:**
- Feature gate `PAID_ELIGIBILITY_ENFORCEMENT_ENABLED` defaults to FALSE
- With flag OFF: Unverified users CAN complete purchases (no eligibility gate)
- With flag ON: Guard would block checkout (when wired in Phase 3D)

**Paid Report Access:**
- ??Permitted (existing purchase remains active)
- UNVERIFIED status does NOT revoke previously granted entitlements

---

**VERIFIED_ADULT**

**Canonical Meaning:**
Account holder has passed approved adult/identity verification and is eligible for paid analysis purchase. Verification method and timestamp are recorded.

**When This State Occurs:**
- Never (in current production; awaiting provider integration)
- Future: After external identity provider confirms adult status
- Future: Method recorded in `paid_eligibility_method` + `paid_eligibility_provider`

**Checkout Behavior:**
- Entry: ??Allowed
- Order creation: ??Allowed
- Payment confirmation: ??Allowed

**Paid Report Access:**
- ??Permitted

**Duration:**
- Indefinite until revoked OR expired
- Expiration policy: TBD with provider contract

---

**REVOKED**

**Canonical Meaning:**
Account holder previously verified as adult/eligible, but eligibility has been revoked or expired. Account holder no longer meets purchase criteria.

**When This State Occurs:**
- Policy violation (deferred design)
- Eligibility window expired (deferred design)
- Provider-initiated revocation (deferred design)
- Legal/compliance requirement (owner-initiated)

**Checkout Behavior:**
- Entry: ??Rejected ("Account not eligible for paid purchase")
- Order creation: ??Rejected with 403
- Payment confirmation: ??Would reject if reached

**Paid Report Access:**
- ??Permitted (existing purchases remain active; do not revoke historical access)

**Important:** Revoked status does NOT revoke existing purchases/entitlements retroactively

---

### Eligibility State Enforcement Points

**PROPOSED PRODUCTION POLICY:**

1. **Checkout Entry (UI):**
   - If `paid_eligibility_status == REVOKED`: Show message "怨꾩젙???좊즺 遺꾩꽍 援щℓ ??곸씠 ?꾨떃?덈떎." (Account not eligible for paid purchase)
   - If `paid_eligibility_status == UNVERIFIED`: Show neutral message (pending provider integration decision)

2. **Order Creation (API Guard):**
   - Current: Checks only `account.status == ACTIVE`
   - Future (Phase 3D): Will also check `paid_eligibility_status == VERIFIED_ADULT` (when enforcement enabled)
   - Gap: Email verification should also be checked (see section 4)

3. **Payment Confirmation (API Guard):**
   - Current: Checks only `account.status == ACTIVE`
   - Future (Phase 3D): Will also check `paid_eligibility_status == VERIFIED_ADULT` (consistency)

4. **Paid Report Access (Read Guard):**
   - Eligibility state does NOT block access to purchased reports
   - Access is gated by: `entitlements.is_active == true`
   - NOT by: current `account_lifecycles.paid_eligibility_status`
   - Rationale: Historical purchases remain accessible even if future eligibility revoked

---

### Critical Design Decision: Eligibility Does Not Retroactively Revoke Access

**Decision:** If account holder's eligibility is revoked/expired:
- ??Do NOT automatically deactivate existing entitlements
- ??Do NOT hide previously purchased reports
- ??DO prevent new purchases
- ??DO require re-verification for future purchases

**Rationale:**
- Service continuity for existing customers
- No ambiguity about "you purchased, now access denied" scenarios
- Clear separation: eligibility gates new access; entitlements maintain existing access
- Refund workflows remain independent of eligibility state

---

## 4. EMAIL VERIFICATION POLICY

### Production Invariant

**FAIL-CLOSED PAID FLOW:**

Email verification MUST be enforced for paid purchase to maintain clear audit trail of account identity.

**Proposed Enforcement:**

1. **At Signup:**
   - ??REQUIRED: Email confirmation before account can be used for durable data
   - NOT enforced: Can login without verification, but...

2. **For Profile Creation/Editing:**
   - ??ENFORCED: `requireVerifiedEmailAccount()` guard
   - Rejects with 403 if `email_confirmed_at == null`
   - Prevents unverified users from creating durable profiles

3. **For Free Analysis:**
   - ?좑툘 NOT enforced (guest flow remains available)
   - Rationale: Free tier is low-friction entry point

4. **For Paid Order Creation (NEW IN PHASE 3B):**
   - ??ENFORCE: Email verification required before order creation
   - Add `requireVerifiedEmailAccount()` guard to `/api/orders` endpoint
   - Rejects with 403 if email not verified
   - Message: "?대찓???몄쬆???꾩슂?⑸땲??" (Email verification required)

5. **For Payment Confirmation:**
   - ??ENFORCED: Email verification (inherited from order creation guard)
   - Rationale: If order required verification, payment confirmation is valid

6. **Resend Verification (Self-Service):**
   - ??TO BE IMPLEMENTED: New self-service endpoint
   - Allow unverified users to resend verification email
   - Supabase provides capability; UI not yet built (Phase 3B candidate)

### Email Verification Summary

| Stage | Current | Proposed | Enforced By |
|-------|---------|----------|-------------|
| Signup | Required | Required | Supabase Auth |
| Login unverified | Allowed | Allowed | None (users need access to email) |
| Create profile | Required | Required | `requireVerifiedEmailAccount()` |
| Free analysis | None | None | None |
| Start checkout | None | Required | `requireVerifiedEmailAccount()` at /api/orders |
| Create order | None | Required | `requireVerifiedEmailAccount()` at /api/orders |
| Confirm payment | None | Required | Inherited from order |
| Resend verification | None | Allowed | Self-service email request endpoint |

---

## 5. MINIMUM ACCOUNT AGE POLICY

### Policy Decision

**MINIMUM ACCOUNT REGISTRATION AGE:**

**Decision:** No minimum age for account signup.

**Rationale:**
- Service is analysis-only (not age-gated content like subscription/gambling)
- Free analysis is unrestricted
- Paid eligibility is handled separately (section 6)
- Profile system supports child profiles (analyzing self/parents/siblings)
- Guardian infrastructure not yet implemented
- Minimizes operator burden and legal complexity

**Implementation:** No age check at signup; email-only requirement.

### Account Types Allowed

- ??Verified adults (age known, adult status confirmed via external provider)
- ??Unverified users (age unknown, can use free tier, cannot purchase)
- ??Minors (under 14, under 19, etc.) ??permitted to signup and use free tier
- ?좑툘 Child-owned paid accounts ??currently PERMITTED but not recommended (see section 6)

### Account Holder Self-Profile Policy

**Decision:** A user may create a profile with `relationship_type = "self"` at any age.

- 10-year-old can create a "self" profile with their birth date
- This profile is for Saju analysis only
- Does NOT make the 10-year-old eligible to purchase
- Paid eligibility remains separate, account-level check

---

## 6. PAID PURCHASE AGE POLICY

### Policy Decision

**PAID PURCHASE AGE REQUIREMENT:**

**Decision:** Only account holders verified as adults can purchase paid analysis (future, when provider integrated).

**Rationale:**
- Legal requirement in many jurisdictions
- Payment processing requires clear adult responsible party
- Separates from Saju profile data

**Specifics:**

1. **Adult Definition:**
   - Provider-specific (NICE: age 19+ for Korean legal adults; may vary by provider)
   - Deferred: Will align with selected provider contract
   - Current: Not yet enforced (provider not integrated)

2. **Age Unknown Treatment:**
   - Current: All users default to UNVERIFIED
   - Policy: Unverified users cannot purchase (gate via `PAID_ELIGIBILITY_ENFORCEMENT_ENABLED` flag)
   - Message: "蹂몄씤?몄쬆???꾩슂?⑸땲??" (Identity verification required)
   - Deferred: UI for users to initiate verification

3. **Identity Verification Failure:**
   - If provider returns "not adult": Status remains UNVERIFIED or becomes REVOKED
   - Account holder cannot purchase
   - Account holder can retry (future UI; deferred)
   - No ban, no operator review needed for failed verification

4. **Revoked Eligibility:**
   - Account holder cannot purchase new analysis
   - Existing purchased reports remain accessible
   - Account holder can retry verification (deferred UI)

5. **Minor Purchase Attempt:**
   - System rejects at order creation: "怨꾩젙???좊즺 遺꾩꽍 援щℓ ??곸씠 ?꾨떃?덈떎." (Account not eligible)
   - No special "minor" UI or parental consent flow (not yet implemented)
   - Legal: Not recommended to allow minors to purchase

### Age Verification NOT via Profile Birth Data

**CRITICAL:** Purchased content may be for profiles of ANY age (spouse, child, parent, etc.)

- Parent's age ??Child profile's age
- Account holder's age must be verified independently
- Child profile can be analyzed by adult account holder
- Child cannot own account and purchase (until age of majority, when they can create own account)

---

## 7. IDENTITY VERIFICATION CONTRACT

### Provider-Neutral Data Contract

**Minimum Trusted Result the Application Needs:**

```
IDENTITY_VERIFICATION_RESULT {
  verification_success: boolean,
  verified_at: ISO8601 timestamp,
  provider_name: string (e.g., "NICE", "PASS", "external_provider"),
  provider_reference_id: string,
  adult_status: "VERIFIED_ADULT" | "NOT_ADULT" | "UNKNOWN",
  // Optional fields (provider-dependent):
  verification_method: string,
  confidence_score: float (0.0-1.0),
  error_code: string (if failed),
  expires_at: ISO8601 timestamp (if applicable)
}
```

### Data Minimization Principles

**MUST NOT Store:**
- Resident registration number (二쇰??깅줉踰덊샇)
- Full legal name (if not already in auth.users)
- CI/DI hash (Korea-specific; only if provider requires internal matching)
- Raw identity document images or scans
- Address details beyond what's in auth.users
- Phone number (unless separately consented)

**MAY Store:**
- Provider reference ID (for audit trail and potential re-verification)
- Verification timestamp (for eligibility policy/expiration)
- Adult status confirmation (boolean/enum)
- Verification method (provider-specific technique used)
- One-way hash of CI/DI if provider mandates (for internal deduplication only, never exposed)

**Application Contract:**
- Store provider response summary in `account_lifecycles`:
  - `paid_eligibility_method`: "DECLARATION" | "EXTERNAL_PROVIDER"
  - `paid_eligibility_provider`: Provider name (e.g., "NICE", "PASS")
  - `paid_eligible_at`: ISO timestamp of verification
  - `paid_eligibility_policy_version`: Version of this policy
  - `paid_eligibility_invalidated_at`: Revocation timestamp (if revoked)

**No New Table Needed:**
- Current `account_lifecycles` row already accommodates these fields
- Additional raw identity data ??separate encrypted table (deferred, not in Phase 2-3 scope)

### Toss Payment NOT Treated as Identity Verification

**CRITICAL:** Payment success is evidence of payment, NOT identity verification.

- Toss payment does NOT confirm adult status
- Toss payment is a separate financial flow
- Account eligibility must be verified before (or separately from) payment
- Future: NICE integration is independent of Toss payment reconciliation

---

## 8. ACCOUNT DELETION POLICY

### Separation of Concepts

**Key Insight:** Account holder wants to delete account, but financial/legal records must survive.

**Two Separate Workflows:**

#### A. CUSTOMER ACCOUNT CLOSURE (Immediate)

**What Ends Immediately:**
- Login capability (session invalidated)
- Profile management access
- Free analysis access
- Paid checkout access
- Order/payment capabilities
- Account settings modification
- Personal data access (except as legally required export)

**Implementation:**
- Set `account_lifecycles.status = "DELETION_REQUESTED"`
- Server guards reject all authenticated endpoints
- Email verification state preserved (for audit)
- Supabase Auth user NOT deleted yet

**Duration:** Occurs when account holder requests closure

---

#### B. SAFE CLEANUP & RETENTION SEPARATION (Background)

**What Happens:**
- Personal profiles ??Deleted or anonymized (if no purchase history)
- Profile with purchase history ??Retained with anonymized user_id
- Free analysis results ??Deleted (user-owned content)
- Paid reports ??Content anonymized OR deleted, metadata retained
- Orders/purchases ??User_id set to NULL (anonymized), order/amount/timestamp retained
- Refund workflows ??User_id set to NULL (anonymized), refund evidence retained
- Account_lifecycles row ??Retained (audit trail, eligibility history)
- Financial records ??Retained with anonymized linkage

**Implementation:** See section 9 (Data Classes)

**Duration:** 1-7 days (depending on refund reconciliation state)

---

#### C. FINAL CLOSURE (Terminal State)

**What Completes:**
- All anonymization done
- All personal data removed or encrypted
- Account_lifecycles.status = "CLOSED"
- Auth.users row: Deferred (May keep for audit, or cascade-delete with NULL FK migration)

**Duration:** After cleanup complete

---

### Account Closure Lifecycle

```
1. ACTIVE account
   ??
   [Customer requests closure via UI]
   ??
2. DELETION_REQUESTED state
   [Server rejects all access]
   ??
   [Check financial blockers]
   ?쒋? If blockers exist: OWNER_REVIEW_REQUIRED (operator must resolve)
   ?? ?붴? Operator resolves refund/reconciliation
   ?붴? If no blockers: Begin cleanup
   ??
3. Background cleanup (hours to days)
   [Anonymize profiles, free results, reports]
   [Separate financial records from user_id]
   ??
4. CLOSED state
   [All cleanup complete, audit trail preserved]
   [Account no longer retrievable by customer]
   ??
5. Future: Scrap financial records
   [After legal retention period expires]
   [Requires separate retention policy per jurisdiction]
```

---

## 9. DATA CLASSES

### Classification System

**CLASS A: REMOVABLE PERSONAL/SERVICE DATA**

Can be deleted or anonymized without compromising financial/legal audit trail.

| Data | Current Table | Action | Rationale |
|------|---------------|--------|-----------|
| Login email | auth.users | NULL ??anon@placeholder.local | Preserve auth row for audit, break user linkage |
| Email verified at | auth.users.email_confirmed_at | Retained (audit) | Part of session establishment proof |
| Profiles (no purchase) | profiles | DELETE | No financial link, user-removable |
| Profiles (with purchase) | profiles | Anonymize: set user_id=NULL | Keep for report metadata, break personal link |
| Free analysis results | free_analysis_results | DELETE | User-owned analysis content, no purchase |
| Account status history | account_lifecycles | Retain as-is | Essential audit trail, immutable |
| Recommendations | (derived from analysis) | DELETE with results | Part of free analysis content |

---

**CLASS B: RETAINED FINANCIAL/AUDIT DATA**

Must survive account closure for financial reconciliation and audit.

| Data | Current Table | Action | Reason |
|------|---------------|--------|--------|
| Orders | orders | Anonymize user_id ??NULL | Preserve order truth, break personal link |
| Order amount | orders | Retain | Financial evidence required |
| Order timestamps | orders | Retain | Timeline evidence for disputes |
| Purchases | purchases | Anonymize user_id ??NULL | Preserve purchase proof |
| Purchase timestamps | purchases | Retain | Transaction history for audit |
| Entitlements metadata | entitlements | Anonymize user_id, retain profile_id + resource_id | Access right history |
| Entitlement timestamps | entitlements | Retain | Policy compliance evidence |
| Revocation reason | entitlements.revocation_reason | Retain | Audit trail for why access ended |

---

**CLASS C: RETAINED SECURITY/LEGAL EVIDENCE**

Critical for payment provider reconciliation, legal compliance, and fraud investigation.

| Data | Current Table | Action | Reason |
|------|---------------|--------|--------|
| Toss payment records | toss_payment_records | Anonymize order_id linkage, retain payment evidence | Provider requires exact match for reconciliation |
| Payment key | toss_payment_records.payment_key | Retain encrypted | Proof of payment to Toss |
| Provider order ID | toss_payment_records.provider_order_id | Retain | Toss reconciliation match |
| Confirmed amount | toss_payment_records.confirmed_amount | Retain | Financial evidence |
| Payment timestamp | toss_payment_records.confirmed_at | Retain | Transaction timeline |
| Refund workflows | refund_workflows | Anonymize user_id, retain refund evidence | Refund provider reconciliation |
| Refund amounts | refund_workflows.requested_amount | Retain | Financial audit trail |
| Refund status | refund_workflows.status | Retain | Refund completion evidence |
| Reconciliation status | toss_payment_records.reconciliation_status | Retain | Indicates if payment truth verified |

---

**CLASS D: DERIVED CONTENT**

Generated from personal/financial data; removal depends on personal data lifecycle.

| Data | Current Table | Action | Reason |
|------|---------------|--------|--------|
| Paid report content (JSONB) | paid_reports.content | DELETE | User-specific generated analysis |
| Paid report metadata | paid_reports | Anonymize user_id, retain profile_id + product_id | Prove report exists, not content |
| Report status | paid_reports.status | Retain | Audit trail for troubleshooting |
| Report timestamps | paid_reports.created_at, completed_at | Retain | Timeline evidence |

---

### Anonymization Strategy

**Level 1: Break User Linkage (Done at Closure)**
- `auth.users.email` ??anonymized/hashed placeholder
- `orders.user_id` ??NULL (use order ID as primary reference)
- `purchases.user_id` ??NULL (use purchase ID as primary reference)
- `refund_workflows.user_id` ??NULL (use refund ID as primary reference)
- `entitlements.user_id` ??NULL (use entitlement + profile ID as reference)
- `paid_reports.user_id` ??NULL (use report + profile ID as reference)

**Level 2: Separate Financial Records (Done at Closure)**
- Create snapshot of orders/purchases/refunds/payments without user_id
- Financial truth is preserved in provider-independent form
- User cannot be re-identified from financial records

**Level 3: Archive (Optional, Deferred)**
- After legal retention period expires
- Move anonymized financial records to archive storage
- Retain profile_id for potential legal export (non-linked to individual)

---

## 10. PURCHASED REPORT ACCESS AFTER ACCOUNT CLOSURE

### Policy Decision

**PURCHASED REPORT ACCESS AFTER CLOSURE: REVOKED IMMEDIATELY**

**Rationale:**
- Fail-closed security model
- Service is subscription-like access, not perpetual ownership
- Can be changed in future if business model shifts to perpetual ownership

### Implementation

**For Closed Accounts:**

1. **Login Attempt:**
   - Session rejected: "怨꾩젙???ъ슜?????놁뒿?덈떎." (Account not available)
   - Redirect to login with account-closed message

2. **Direct Report URL Access:**
   - API checks `account_lifecycles.status == "ACTIVE"`
   - Returns 403 "?묎렐 遺덇?" (Access denied)
   - Does NOT reveal whether account closed vs. disabled

3. **Purchase History View:**
   - `/mypage` endpoint rejects with 401/403
   - Historical purchase data not accessible

4. **Downloaded Reports:**
   - Locally stored reports (if user downloaded PDFs, etc.) remain accessible
   - Service cannot prevent local files
   - Assume user responsibility

### Entitlement Behavior

**Current Entitlement Model:**
- Entitlements have `is_active` boolean
- Revoked entitlements have `revocation_reason` and `revoked_at`

**At Account Closure:**
- Deferred: Whether to automatically deactivate all entitlements
- Option A: Set all `is_active = false` (immediate access revocation)
- Option B: Leave `is_active` unchanged, rely on account status guard
- Recommendation: Option A (explicit, auditable revocation)

---

## 11. SELF-SERVICE CS POLICY

### Target Self-Service Capabilities

**Goal:** Operator should handle exceptions only, not normal customer flows.

**Current Status ??Proposed Status:**

| Capability | Current | Proposed | Target Phase |
|------------|---------|----------|--------------|
| Signup | IMPLEMENTED | IMPROVED (add resend verification) | 3B |
| Login | IMPLEMENTED | Keep as-is | Existing |
| Forgot password | IMPLEMENTED | Keep as-is | Existing |
| Reset password | IMPLEMENTED | Keep as-is | Existing |
| Change password (logged-in) | NOT IMPLEMENTED | Self-service (new UI) | 3B |
| Change login email | NOT IMPLEMENTED | Self-service (new UI) | 3B |
| Resend email verification | NOT IMPLEMENTED | Self-service (new endpoint) | 3B |
| Verify identity/age | NOT IMPLEMENTED | Self-service (provider-neutral UI) | 3E |
| Retry identity verification | NOT IMPLEMENTED | Self-service (retry button) | 3E |
| View account status | IMPLEMENTED | Keep as-is | Existing |
| View eligibility status | IMPLEMENTED | Keep as-is | Existing |
| Manage profiles | IMPLEMENTED | Keep as-is | Existing |
| Request account closure | NOT IMPLEMENTED | Self-service (new UI) | 3B |
| Cancel closure request | NOT IMPLEMENTED | Self-service (before finalization) | 3B |
| View purchase history | IMPLEMENTED | Keep as-is | Existing |
| Request refund | NOT IMPLEMENTED | Self-service (new endpoint) | 3C? |
| Track refund status | NOT IMPLEMENTED | Self-service (view in mypage) | 3C? |
| Download paid reports | IMPLEMENTED | Keep as-is | Existing |

### Self-Service Principles

1. **Normal flows should not require operator:**
   - Signup, password recovery, profile management, purchase ??all self-service
   - Operator only for exceptional/blocked cases

2. **Blocked cases escalate to operator:**
   - Refund blocked by payment provider
   - Identity verification provider returns error
   - Account deletion blocked by financial reconciliation
   - Fraud/abuse flags

3. **All self-service flows have clear error messages:**
   - No cryptic codes
   - User knows what action to take next
   - Operator reference link if human help needed (deferred)

---

## 12. OWNER REVIEW BOUNDARY

### OWNER_REVIEW_REQUIRED Cases (Exceptional Only)

**When Operator Review is Necessary:**

1. **Refund Provider Failure (Current)**
   - Payment provider returns non-retryable error
   - Refund amount mismatch detected
   - Provider requires manual intervention

2. **Account Closure Blocked by Financial State (Phase 3C)**
   - Non-terminal refund workflow exists
   - Payment reconciliation incomplete
   - Cannot safely anonymize without closing refund

3. **Identity Verification Provider Failure (Phase 3E)**
   - Provider returns ambiguous result (UNKNOWN)
   - Provider returns provider-error (service down)
   - Manual review required before denying purchase

4. **Fraud/Abuse Detection (Future)**
   - Multiple failed identity verifications
   - Unusual purchase pattern
   - Abuse report flag

5. **Legal/Compliance (Future)**
   - Tax authority data request
   - Law enforcement subpoena
   - GDPR/privacy legal hold

### What MUST NOT Escalate to Owner

- ??Unverified users attempting to purchase (system rejects automatically)
- ??Forgot password requests (Supabase handles)
- ??Email verification resend (user self-service)
- ??Normal refund requests (auto-process if no blocker)
- ??Failed identity verification (user retries self-service)
- ??Account closure request (auto-process if no financial blocker)

### Owner Escalation Flow

```
1. Customer hits exceptional case
   ??
2. System marks as OWNER_REVIEW_REQUIRED
   ??
3. Operator queue displays:
   - Account ID
   - Reason code (refund_provider_error, identity_verification_failed, etc.)
   - Context (amounts, timestamps, logs)
   ??
4. Operator:
   - Reviews context
   - Decides: approve, deny, retry, escalate further
   - Documents decision
   ??
5. System acts on operator decision:
   - Update status
   - Notify customer
   - Resume automation
```

---

## 13. NICE INTEGRATION AS DEFERRED PROVIDER INTEGRATION

### Current Status (Phase 2)

**NICE Integration: DEFERRED**

**What is Deferred:**
- NICE service application and account setup (manual process)
- NICE sandbox/production credential configuration
- NICE callback URL setup and security
- NICE response parsing and error handling
- NICE failure retry policy
- NICE expiration/renewal logic
- NICE provider-specific UI (if any)

**What is Defined in Phase 2:**
- Abstract identity verification contract (section 7)
- Policy for handling provider success/failure
- Data classes and anonymization strategy

**What is NOT Assumed:**
- NICE is the only provider (support abstract "external_provider")
- NICE-specific fields beyond generic contract
- NICE residential registration validation
- NICE CI/DI hashing

### Provider-Neutral Architecture for Future Integration

**Application Layer (Phase 3E - Provider-Neutral Adapter):**
- Abstract interface: `IdentityVerificationProvider`
- Methods:
  - `async initiateVerification(userId): VerificationSession`
  - `async confirmVerification(userId, sessionId, provider_result): VerificationResult`
  - `async getVerificationStatus(userId): CurrentStatus`
  - `async revokeVerification(userId, reason): void`

**Implementation (Phase 3F - NICE Integration):**
- Concrete: `NiceIdentityVerificationProvider extends IdentityVerificationProvider`
- Handles NICE-specific HTTP calls, credential management, callback parsing
- Pluggable so other providers can be added later

**Configuration (Deferred):**
```
IDENTITY_VERIFICATION_PROVIDER=nice_korea  (or: pass_korea, external_kvs, etc.)
NICE_API_URL=https://nice.checkplus.co.kr/...
NICE_MERCHANT_ID=...
NICE_MERCHANT_KEY=...
NICE_CLIENT_ID=...
NICE_CALLBACK_URL=https://unboda.kr/api/identity-verification/callback
```

### NICE Dependency Isolation

- No NICE-specific code in core account/eligibility logic
- No NICE-specific database fields (only generic method + provider name)
- No NICE-specific error handling in payment flow
- If NICE unavailable: UI shows "Please try later" (provider-agnostic)

---

## 14. POLICY DECISION MATRIX

### Decision Table

**Format:**
Account State | Email Status | Eligibility Status | Free Analysis | Checkout Entry | Order Creation | Payment | Purchased Report Access | Account Changes

---

### MATRIX

**Row 1: ACTIVE + VERIFIED + UNVERIFIED**
- Free Analysis: ??YES
- Checkout Entry: ??YES (see checkout behavior below)
- Order Creation: ?좑툘 DEPENDS on enforcement flag (default: allowed; future: blocked)
- Payment: ?좑툘 DEPENDS on enforcement flag
- Purchased Reports: ??YES (only if eligibility was verified when purchased)
- Account Changes: ??YES

**Row 2: ACTIVE + VERIFIED + VERIFIED_ADULT**
- Free Analysis: ??YES
- Checkout Entry: ??YES
- Order Creation: ??YES
- Payment: ??YES
- Purchased Reports: ??YES
- Account Changes: ??YES

**Row 3: ACTIVE + VERIFIED + REVOKED**
- Free Analysis: ??YES
- Checkout Entry: ??NO (show ineligibility message)
- Order Creation: ??NO (reject with 403)
- Payment: ??NO (would reject at order creation)
- Purchased Reports: ??YES (existing purchases not revoked)
- Account Changes: ??YES

**Row 4: ACTIVE + UNVERIFIED + UNVERIFIED**
- Free Analysis: ??YES
- Checkout Entry: ??YES (unverified allowed to view, enforcement TBD)
- Order Creation: ?좑툘 DEPENDS on enforcement flag (current: allowed; future: blocked)
- Payment: ?좑툘 DEPENDS on enforcement flag
- Purchased Reports: ??YES (if somehow purchased)
- Account Changes: ?좑툘 PARTIAL (cannot edit/create profiles)

**Row 5: ACTIVE + UNVERIFIED + VERIFIED_ADULT**
- Not possible (VERIFIED_ADULT requires email verification first)

**Row 6: ACTIVE + UNVERIFIED + REVOKED**
- Not possible (REVOKED implies previous verification, which requires email)

**Row 7: DELETION_REQUESTED + (any) + (any)**
- Free Analysis: ??NO (account not active)
- Checkout Entry: ??NO (account not active)
- Order Creation: ??NO (account not active)
- Payment: ??NO (account not active)
- Purchased Reports: ?좑툘 TBD (see section 10; current proposal: NO)
- Account Changes: ??NO (account not active)

**Row 8: CLOSED + (any) + (any)**
- Free Analysis: ??NO
- Checkout Entry: ??NO
- Order Creation: ??NO
- Payment: ??NO
- Purchased Reports: ??NO
- Account Changes: ??NO

---

### Checkout Behavior Details

**For UNVERIFIED eligibility (enforcement flag OFF):**

Checkout page shows:
```
[?뺤긽?곸쑝濡?吏꾪뻾?⑸땲??
?ъ링 遺꾩꽍???좏깮?섍퀬 寃곗젣??二쇱꽭??
```
(Proceeds normally)

**For UNVERIFIED eligibility (enforcement flag ON, Phase 3D):**

Checkout page shows:
```
[蹂몄씤?몄쬆???꾩슂?⑸땲??
蹂몄씤?몄쬆???꾨즺??二쇰㈃ ?ъ링 遺꾩꽍??援щℓ?????덉뒿?덈떎.
??蹂몄씤?몄쬆 ?쒖옉
```
(Identity verification required)

**For REVOKED eligibility (always):**

Checkout page shows:
```
[援щℓ 遺덇?]
怨꾩젙???좊즺 遺꾩꽍 援щℓ ??곸씠 ?꾨떃?덈떎.
```
(Account not eligible for paid purchase)

---

## 15. IMPLEMENTATION PHASES

### Proposed Sequencing

**Rationale:** Balance policy enforcement, provider integration, and operator tooling with minimal rework.

---

**Phase 3A: Account Lifecycle Guards & Policy Helpers**

**Scope:**
- Implement policy decision helpers (no UI changes)
- Formalize account lifecycle state transitions
- Add read-only financial blocker detection
- Add eligibility state checks (wired conditionally)

**Deliverables:**
- `canUserCloseAccount(userId): Promise<{ canClose, blockers }>`
- `validateAccountStateForOperation(userId, operation): boolean`
- Update `requireActiveAccount()` guards with clear error messages
- Add `requireVerifiedEmailAccount()` guard to `/api/orders`

**Dependency:** None (standalone guards)

---

**Phase 3B: Self-Service Account Controls**

**Scope:**
- Implement customer-facing account management UI
- Enable normal flows without operator help

**Deliverables:**
- New `/account/change-password` page
- New `/account/change-email` page
- New `/account/resend-verification` endpoint
- New `/account/request-closure` endpoint
- Update `/account` page with links to new features
- Add email verification requirement to `/api/orders`

**Dependency:** Phase 3A (requires guards)

---

**Phase 3C: Safe Account Deletion & Retention Architecture**

**Scope:**
- Implement DELETION_REQUESTED ??CLOSED workflow
- Anonymize personal data per data classification
- Preserve financial records per retention policy

**Deliverables:**
- Implement `transitionAccountToDeletionRequested(userId)`
- Implement `performSafeAccountCleanup(userId)` (background job)
- Update FK constraints (orders, purchases, refunds) to ON DELETE SET NULL
- Add anonymization columns/flags for tracking
- Update entitlements to deactivate on account closure
- Add audit logging for all anonymization steps

**Dependency:** Phase 3A (requires blocker detection)

**Database Changes:**
- Modify orders/purchases/refunds FK behavior
- Add anonymization tracking columns
- Add entitlement deactivation logic

---

**Phase 3D: Paid Eligibility Enforcement**

**Scope:**
- Wire the eligibility guard into checkout/order flow
- Enforce PAID_ELIGIBILITY_ENFORCEMENT_ENABLED flag

**Deliverables:**
- Update `/api/orders` to call `requirePaidEligibleAccount()` (when flag ON)
- Update `/checkout` page to show eligibility status
- Update checkout UI to handle REVOKED state
- Add error message localization for eligibility blocks

**Dependency:** Phase 3A (requires guard functions)

**No Database Changes**

---

**Phase 3E: Provider-Neutral Identity Verification Adapter**

**Scope:**
- Design abstract verification provider interface
- Implement UNVERIFIED ??VERIFIED_ADULT flow without specific provider
- UI for initiating verification (generic)
- Error handling for provider failures

**Deliverables:**
- `IdentityVerificationProvider` abstract interface
- `POST /api/identity-verification/initiate` endpoint
- `POST /api/identity-verification/callback` endpoint (for provider redirects)
- New `/account/verify-identity` page
- Verification status display on `/account` page
- Error retry UI

**Dependency:** Phase 3A (requires account helpers)

**Database:** No changes (uses existing account_lifecycles fields)

---

**Phase 3F: NICE Integration (When Provider Access Ready)**

**Scope:**
- Implement NICE-specific provider
- Configure production NICE credentials
- Test end-to-end verification flow

**Deliverables:**
- `NiceIdentityVerificationProvider` implementation
- NICE credential configuration (env vars)
- NICE callback URL setup
- NICE error code mapping
- NICE failure mode handling
- E2E regression tests with NICE sandbox

**Dependency:** Phase 3E (requires abstract interface)

**Prerequisite:** NICE service application + merchant approval (manual, external)

---

**Phase 3G: Operator Exception Tooling (When Needed)**

**Scope:**
- Implement operator dashboard for OWNER_REVIEW_REQUIRED cases
- Provide admin actions for exceptional cases

**Deliverables:**
- Operator dashboard: list pending reviews
- Review detail page: context + decision buttons
- Approve/deny refund actions
- Approve/deny identity verification retry
- Resolve account closure blockers
- Audit log of operator decisions

**Dependency:** Phases 3A-3E (all policies defined)

---

### Sequencing Rationale

1. **3A first:** Guards and helpers are dependencies for all downstream phases
2. **3B next:** Self-service features reduce operator load early
3. **3C parallel with 3B:** Data retention architecture is independent
4. **3D after 3A:** Eligibility enforcement depends on guard infrastructure
5. **3E after 3A:** Provider adapter is independent of other features
6. **3F after 3E:** NICE-specific implementation waits for provider access
7. **3G last:** Operator tooling is only needed after other phases mature

---

## 16. UNRESOLVED POLICY QUESTIONS

**These items are deferred pending legal/business review:**

1. **Legal Retention Period:**
   - How long must financial records be retained? (Jurisdiction-specific)
   - Who decides retention period policy?
   - Answer: Pending legal/compliance review

2. **Refund Revocation on Account Closure:**
   - If customer closes account before refund is received, what happens?
   - Current: Refund is exception case, blocks closure
   - Alternative: Auto-cancel refund, close account, re-issue refund to linked payment method
   - Answer: Requires payment provider contract review

3. **Profile Birth Data Retention:**
   - Can profile birth data (even anonymized) be retained for analytics?
   - Regulatory concern: GDPR prohibits retention even if anonymized
   - Answer: Pending privacy policy/legal guidance

4. **Re-registration After Closure:**
   - Can same email re-register after account is closed?
   - Concern: Migration of financial records to new account?
   - Answer: Pending re-registration workflow design

5. **Child-Owned Accounts:**
   - Should minors be allowed to own paid accounts?
   - Current: System allows it (no age gate)
   - Alternative: Require guardian account ownership
   - Answer: Pending business decision (parental control feature, extra liability?)

6. **Eligibility Expiration:**
   - Should VERIFIED_ADULT status have expiration date?
   - Current: Indefinite until revoked
   - Alternative: Re-verification required every N years
   - Answer: Pending provider contract (NICE may require re-verification)

7. **Revocation Reason:**
   - Why can eligibility be revoked?
   - Current: Policy undefined (deferred design)
   - Possible: Policy violation, provider revocation, customer request, legal hold
   - Answer: Pending compliance policy definition

8. **Payment Provider Age Verification:**
   - Does Toss payment age verification count as identity verification?
   - Current: No, treated separately
   - Answer: Requires fintech/payment compliance review

9. **CI/DI Storage:**
   - If NICE returns CI/DI hash, should it be stored?
   - Current: No, policy: don't store
   - Concern: Deduplication requires some linkage
   - Answer: Pending data privacy lawyer review

10. **Account Deletion Soft vs Hard:**
    - Should auth.users row be soft-deleted or cascade-deleted?
    - Current: Proposed CASCADE (with FK migration to ON DELETE SET NULL)
    - Alternative: Soft delete with is_deleted flag
    - Answer: Pending Supabase Auth behavior review

---

## FINAL REPORT

---

### PHASE 2 POLICY CONTRACT COMPLETED

**YES**

All 16 policy sections completed. Repository-specific design. Provider-neutral where required. Deferred items clearly marked.

---

### ACCOUNT HOLDER / PROFILE INVARIANT

```
ACCOUNT HOLDER = Supabase auth.users entity with email verification, eligibility status, lifecycle state
SAJU PROFILE = Analysis subject (self/spouse/child/parent/sibling/other) with birth data

CANONICAL RULE:
- Saju profile birth_date MUST NOT establish account-holder age
- Profile relationship_type MUST NOT be treated as legal identity proof
- Identity / adult eligibility MUST be account-level only
- Profile birth data is orthogonal to account eligibility
- Even "self" profile is analysis data, not identity proof
```

---

### ACCOUNT LIFECYCLE POLICY

**ACTIVE:**
- Meaning: Account operational, all customer functions available
- Login: ??YES | Profiles: ??YES | Free Analysis: ??YES | Checkout: ??YES
- Orders: ??YES | Payment: ??YES | Reports: ??YES | Settings: ??YES

**DELETION_REQUESTED:**
- Meaning: Closure initiated, cleanup in progress, account inaccessible
- Login: ??NO | Profiles: ??NO | Free Analysis: ??NO | Checkout: ??NO
- Orders: ??NO | Payment: ??NO | Reports: ?좑툘 TBD | Settings: ??NO
- Duration: Hours to days (depends on financial blocker resolution)

**CLOSED:**
- Meaning: Account lifecycle terminated, all customer access revoked, audit trail retained
- Login: ??NO | Profiles: ??NO | Free Analysis: ??NO | Checkout: ??NO
- Orders: ??NO | Payment: ??NO | Reports: ??NO | Settings: ??NO
- Terminal state (no transition out)

---

### EMAIL VERIFICATION POLICY

**Fail-closed paid flow:**

| Stage | Required | Enforced | Self-Service Resend |
|-------|----------|----------|-------------------|
| Signup | ??YES (Supabase) | ??YES | TBD (Phase 3B) |
| Login unverified | ??NO | ??NO | N/A |
| Profile create | ??YES | ??YES | Blocked until verified |
| Paid order creation | ??YES (NEW) | ??YES (Phase 3B) | Blocked until verified |
| Payment confirmation | ??YES (inherited) | ??YES | Blocked until verified |

---

### MINIMUM ACCOUNT AGE POLICY

**No minimum age for account signup.**

- Rationale: Service is analysis-only, not age-gated content; free tier unrestricted
- Permitted: Verified adults, unverified users, minors
- Implication: Minors may signup and use free tier; paid eligibility is separate check

---

### PAID PURCHASE AGE POLICY

**Only verified adults may purchase paid analysis.**

- Adult definition: Deferred (will align with provider contract; currently no enforcement)
- Age unknown treatment: Cannot purchase (gate via enforcement flag, default OFF)
- Verification failure: Status remains UNVERIFIED, no penalty, can retry
- Revoked eligibility: Cannot purchase new, existing purchases remain active
- Note: NOT via profile birth date; account-level check only

---

### PAID ELIGIBILITY

**UNVERIFIED:**
- Meaning: Account holder's adult/eligibility status not established (provider not integrated yet)
- Checkout: ??Allowed to view (enforcement flag OFF by default)
- Order creation: ?좑툘 Depends on enforcement flag (current: allowed; future: blocked)
- Existing reports: ??Accessible (historical access not revoked)

**VERIFIED_ADULT:**
- Meaning: Account holder verified as eligible for paid purchases (provider integration required)
- Checkout: ??Allowed
- Order creation: ??Allowed
- Existing reports: ??Accessible

**REVOKED:**
- Meaning: Previously verified, now revoked/expired (provider or policy-triggered)
- Checkout: ??Rejected (ineligible message)
- Order creation: ??Rejected (403)
- Existing reports: ??Accessible (retro-revocation does NOT remove access)

---

### IDENTITY VERIFICATION DATA CONTRACT

**Minimum Trusted Result:**
```
VERIFICATION_SUCCESS: boolean
VERIFIED_AT: ISO8601 timestamp
PROVIDER_NAME: string ("NICE", "PASS", "external", etc.)
PROVIDER_REFERENCE_ID: string (for audit trail)
ADULT_STATUS: "VERIFIED_ADULT" | "NOT_ADULT" | "UNKNOWN"
VERIFICATION_METHOD: string (optional, provider-specific)
CONFIDENCE_SCORE: float 0.0-1.0 (optional)
ERROR_CODE: string (if failed)
EXPIRES_AT: ISO8601 timestamp (if applicable)
```

**Data Minimization:**
- ??MUST NOT store: Resident registration number, CI/DI raw, legal name, address, phone
- ??MAY store: Provider reference, timestamp, adult status, method, CI/DI hash (dedup only, encrypted)
- ??Store in: account_lifecycles columns (paid_eligibility_method, paid_eligibility_provider, paid_eligible_at, paid_eligibility_policy_version, paid_eligibility_invalidated_at)

---

### ACCOUNT CLOSURE POLICY

**Three-phase lifecycle:**

1. **Customer Closure Request (ACTIVE ??DELETION_REQUESTED)**
   - Immediate: Account inaccessible, all logins rejected
   - Check: Financial blockers (refunds, reconciliation)
   - If blockers: Owner review required; customer cannot proceed

2. **Safe Cleanup (Background, hours to days)**
   - Anonymize profiles (no purchase) ??DELETE
   - Anonymize profiles (with purchase) ??user_id=NULL
   - Anonymize free results ??DELETE
   - Anonymize paid reports ??content=NULL, user_id=NULL
   - Anonymize orders/purchases/refunds ??user_id=NULL, preserve amounts/timestamps

3. **Final Closure (DELETION_REQUESTED ??CLOSED)**
   - Cleanup complete
   - Account_lifecycles.status = CLOSED
   - Audit trail retained
   - Account no longer retrievable

---

### PHYSICAL DELETION POLICY

**Data Class Actions:**

| Class | Examples | Action at Closure |
|-------|----------|------------------|
| CLASS A: Removable Personal | Email, profiles (no purchase), free results | DELETE (apply anonymization where linkable) |
| CLASS B: Financial Audit | Orders, purchases, refunds (amounts, timestamps) | user_id ??NULL (preserve evidence) |
| CLASS C: Legal Evidence | Toss payment records, reconciliation state | Retain encrypted (provider match requirement) |
| CLASS D: Derived Content | Paid report JSONB, recommendations | DELETE content, retain metadata |

**Separate Workflows:**
- Account closure: Immediate (DELETION_REQUESTED state)
- Personal data deletion: Background cleanup (hours to days)
- Financial record archival: Separate retention policy (years, jurisdiction-dependent)

---

### PURCHASED REPORT ACCESS AFTER CLOSURE

**Access is revoked immediately upon account closure.**

- Reason: Fail-closed security model; service is access-based, not ownership-based
- Mechanism: API checks account_lifecycles.status == ACTIVE; returns 403
- Workaround: Downloaded reports (if any) locally stored; service cannot revoke files
- Future: Business model may change to perpetual ownership (deferred)

---

### SELF-SERVICE TARGET

**Normal Flows (Self-Service):**
- Signup (email + password verification)
- Login/logout
- Password recovery (forgot password ??email ??reset)
- Profile management (create/edit/delete)
- Account status viewing
- Eligibility status viewing
- Purchase history
- Refund status (future)

**Exceptional Flows (Owner Review):**
- Payment provider errors (non-retryable)
- Account closure blocked by financial state
- Identity verification provider errors
- Fraud/abuse flags
- Legal requests

---

### OWNER REVIEW BOUNDARY

**Operator Should NOT Handle:**
- Forgot password (Supabase automatic)
- Email verification retry (user self-service)
- Unverified users attempting purchase (system auto-rejects)
- Identity verification retry (user retries themselves)
- Account closure (auto-processes if no financial blocker)

**Operator SHOULD Handle:**
- Refund workflow stuck in OWNER_REVIEW_REQUIRED (provider error)
- Account closure blocked by unresolved refund/reconciliation (manual resolution)
- Identity verification provider returns ambiguous result (manual review)
- Abuse/fraud flags (investigation)
- Legal/compliance holds (data protection requests)

---

### NICE INTEGRATION

**NICE Integration: DEFERRED**

**Phase 2 (Current):** Abstract identity verification contract defined
**Phase 3E (Proposed):** Provider-neutral adapter interface implemented
**Phase 3F (When Ready):** NICE-specific implementation (after merchant approval)

**Assumption:** NICE is optional provider; system supports any provider via abstract interface

**Prerequisite:** NICE service application and account setup (manual, external to this project)

---

### POLICY DECISION MATRIX

**Simplified View (Full Matrix in Section 14):**

| Account State | Email Status | Eligibility | Free Analysis | Checkout Entry | Order Creation | Purchased Reports |
|---------------|--------------|-------------|----------------|----------------|-----------------|------------------|
| ACTIVE | Verified | UNVERIFIED | ??YES | ??YES | ?좑툘 FLAG-DEPENDENT | ??YES |
| ACTIVE | Verified | VERIFIED_ADULT | ??YES | ??YES | ??YES | ??YES |
| ACTIVE | Verified | REVOKED | ??YES | ??NO | ??NO | ??YES |
| ACTIVE | Unverified | (any) | ??YES | ??YES | ?좑툘 FLAG-DEPENDENT | (no purchase) |
| DELETION_REQUESTED | (any) | (any) | ??NO | ??NO | ??NO | ??NO (TBD) |
| CLOSED | (any) | (any) | ??NO | ??NO | ??NO | ??NO |

---

### PROPOSED IMPLEMENTATION SEQUENCE

**1. Phase 3A: Account Lifecycle Guards & Policy Helpers**
   - Implement canUserCloseAccount(), validateAccountStateForOperation()
   - Add requireVerifiedEmailAccount() to /api/orders
   - Formalize error messages

**2. Phase 3B: Self-Service Account Controls**
   - Implement change-password, change-email, resend-verification pages
   - Add request-closure endpoint
   - Update /account page with links

**3. Phase 3C: Safe Account Deletion & Retention Architecture**
   - Implement DELETION_REQUESTED ??CLOSED workflow
   - Migrate FK constraints to ON DELETE SET NULL
   - Implement anonymization background job
   - Update entitlement deactivation logic

**4. Phase 3D: Paid Eligibility Enforcement**
   - Wire requirePaidEligibleAccount() guard into /api/orders (when flag ON)
   - Update checkout UI to show eligibility status
   - Add REVOKED state handling

**5. Phase 3E: Provider-Neutral Identity Verification Adapter**
   - Design IdentityVerificationProvider interface
   - Implement /api/identity-verification/initiate endpoint
   - Implement /api/identity-verification/callback endpoint
   - Add /account/verify-identity page
   - Add verification status display on /account

**6. Phase 3F: NICE Integration (When Provider Access Ready)**
   - Implement NiceIdentityVerificationProvider class
   - Configure NICE credentials (env vars)
   - Test end-to-end with NICE sandbox
   - Prerequisite: NICE merchant approval (external)

**7. Phase 3G: Operator Exception Tooling**
   - Implement operator dashboard for OWNER_REVIEW_REQUIRED cases
   - Add review detail page and decision buttons
   - Add audit logging

---

### UNRESOLVED POLICY QUESTIONS

**Pending Legal/Business Review:**

1. Legal retention period for financial records (jurisdiction-dependent)
2. Refund handling on account closure (payment provider contract)
3. Profile birth data retention for analytics (privacy/GDPR concern)
4. Re-registration after closure (account migration policy)
5. Child-owned paid accounts (liability, parental controls)
6. Eligibility expiration timeline (provider contract)
7. Revocation reason categories (compliance policy)
8. Payment provider age verification equivalence (fintech compliance)
9. CI/DI hash storage requirements (privacy lawyer review)
10. Auth.users soft vs hard deletion (Supabase behavior)

**Action:** Each item requires review by legal, compliance, business, and/or payment provider before implementation.

---

### PRODUCTION FILES CHANGED

**NO**

No code, migrations, or database changes made in Phase 2.

---

### DATABASE/MIGRATION CHANGED

**NO**

No schema changes. Existing account_lifecycles table suffices for policy implementation.

---

### COMMIT

**NO**

---

### PUSH

**NO**

---

## END OF PHASE 2 POLICY CONTRACT

**Status: Complete ??Policy Design Only**

Awaiting human review before proceeding to Phase 3A implementation.

**Next Step:** Present policy contract to legal, compliance, and business stakeholders for approval. Resolve unresolved questions. Then proceed to Phase 3A technical implementation.
