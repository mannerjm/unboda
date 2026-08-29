# STEP 57D-46 ??ACCOUNT LIFECYCLE + IDENTITY + AGE + SOLO-OPERATOR CS POLICY
## PHASE 1: READ-ONLY ACCOUNT / AUTH INVENTORY

**Date:** 2026-08-30
**Inventory Status:** COMPLETE
**Read-Only Verification:** YES ??No implementation, refactoring, schema changes, migrations executed, or commits made.

---

## PHASE 1 COMPLETION

**STEP 57D-46 PHASE 1 INVENTORY COMPLETED:** YES

---

## 1. CURRENT PROJECT CONTEXT PRESERVED

The project has substantial financial safety infrastructure across multiple STEP phases:

- **STEP 57D-42:** Toss payment persistence and reconciliation
- **STEP 57D-43:** Toss failure injection reconciliation proof
- **STEP 57D-44:** Production-safe reconciliation scheduler and E2E observability
- **STEP 57D-45:** Toss cancellation, refund automation, DB-backed refund recovery
- **STEP 57D-46C-1:** Account lifecycle and paid eligibility foundation (just implemented)

All principles preserved:
- Normal customer flows are self-service
- Normal payment/refund processing is automated
- Financial ambiguity fails closed
- Exceptional financial cases become `OWNER_REVIEW_REQUIRED`
- Manual SQL is not a normal CS workflow
- Recommendation is separate from purchase
- Purchase is separate from entitlement
- Paid report is a separate content asset
- My Page purchase library is implemented
- Account lifecycle work does not damage financial audit history

---

## 2. AUTH PROVIDER: SUPABASE AUTH

**Implementation Status:** IMPLEMENTED

### Current Implementation

**Authentication Provider:**
- Supabase Auth (service: `auth.users`)
- Confirmed in middleware.ts, app/lib/supabase/auth.ts, app/lib/supabase/server.ts

**Server-Side Auth Helpers:**
- `getCurrentUser()` ??returns authenticated user from server session (does not trust client-supplied identity)
- `ensureAccountLifecycle(userId)` ??creates/resolves account_lifecycles row
- `requireActiveAccount()` ??guards active account status
- `requireVerifiedEmailAccount()` ??guards verified email + active status
- `requirePaidEligibleAccount()` ??guards paid eligibility + verified email + active status
- All use `createClient()` from `@supabase/ssr` for server-side Auth validation

**Client Auth Helpers:**
- `createClient()` ??browser-exposed Supabase client
- No browser-side authentication helpers for production flows; signup/login are pages

**Middleware / Session Refresh:**
- `middleware.ts`: Uses `@supabase/ssr` createServerClient
- Calls `auth.getClaims()` for JWT validation (not `getSession()`)
- Sets cache headers to prevent CDN-level session leakage
- Refreshes expired tokens and writes updated cookie

**Cookie/Session Handling:**
- Supabase SSR automatic cookie management via middleware
- Verified email state read from `email_confirmed_at` (not client boolean)

**Signup Route/Actions:**
- `app/auth/signup/page.tsx`
  - Email and password input
  - Calls `supabase.auth.signUp({ email, password, options: { emailRedirectTo: ... } })`
  - Sends confirmation email with redirect to `/auth/callback`
  - Shows "check your email" confirmation state
  - REQUIRES email verification before account is usable

**Login Route/Actions:**
- `app/auth/login/page.tsx`
  - Email and password input
  - Calls `supabase.auth.signInWithPassword({ email, password })`
  - Supports `returnTo` URL parameter for post-login redirect
  - No Magic Link, OTP, or OAuth

**Logout Route/Actions:**
- Confirmed in reset-password flow: `supabase.auth.signOut({ scope: "global" })`
- No dedicated logout page found; logout is triggered during password recovery

**Email Verification Flow:**
- Signup calls `signUp()` with `emailRedirectTo` containing `/auth/callback`
- Email sent by Supabase with confirmation link
- User clicks link, which redirects to `/auth/callback?code=...`
- `/auth/callback` calls `exchangeCodeForSession(code)` to exchange code for session
- On success, redirects to `returnTo` or `/result`
- On failure, redirects to `/auth/login?error=auth_failed`

**Password Recovery Flow (Self-Service):**
- `/auth/forgot-password` form sends email via `resetPasswordForEmail(email, { redirectTo: ... })`
- Email contains recovery link with recovery code
- User clicks link, redirects to `/auth/reset-password?code=...`
- Recovery session is verified via `auth.onAuthStateChange('PASSWORD_RECOVERY')` and `getSession()`
- User sets new password via `auth.updateUser({ password })`
- After update, global sign-out via `signOut({ scope: "global" })`
- User must log in again with new password

**Password Update (Logged-In User):**
- Not implemented as dedicated UI currently; deferred
- Can be done via `auth.updateUser({ password })` if session valid

**Login Email Change:**
- Not implemented currently; deferred

**OAuth/Social Login:**
- NONE FOUND

**Magic Link/OTP:**
- NONE FOUND

### Auth Summary Table

| Feature | Status | Files |
|---------|--------|-------|
| Supabase Auth Provider | IMPLEMENTED | middleware.ts, lib/supabase/auth.ts, lib/supabase/server.ts |
| Server-Side Auth Helpers | IMPLEMENTED | lib/accounts/server.ts, lib/supabase/auth.ts |
| Signup | IMPLEMENTED | app/auth/signup/page.tsx |
| Login | IMPLEMENTED | app/auth/login/page.tsx |
| Logout | PARTIAL | Reset-password flow only; no dedicated logout page |
| Email Verification | IMPLEMENTED | app/auth/callback/route.ts |
| Resend Verification | NOT IMPLEMENTED | (Can be inferred: need new signUp() call or Supabase resend UI) |
| Forgot Password Request | IMPLEMENTED | app/auth/forgot-password/page.tsx |
| Password Reset Completion | IMPLEMENTED | app/auth/reset-password/page.tsx |
| Logged-In Password Change | NOT IMPLEMENTED | Deferred |
| Login Email Change | NOT IMPLEMENTED | Deferred |
| OAuth / Social Login | NOT IMPLEMENTED | Never added |
| Magic Link / OTP | NOT IMPLEMENTED | Never added |

---

## 3. CURRENT /ACCOUNT PAGE

**File:** `app/account/page.tsx`

**Currently Displayed Fields:**

1. **濡쒓렇???대찓??* (Login Email)
   - Source: `user.email` from `getCurrentUser()`
   - Display: Raw email with text-wrapping

2. **?대찓???몄쬆** (Email Verification)
   - Source: `authData.user?.email_confirmed_at` from server `auth.getUser()`
   - Values: "?몄쬆?? (verified) or "?몄쬆 ?꾩슂" (verification needed)
   - Display: Server-derived, not client-asserted

3. **怨꾩젙 ?곹깭** (Account Status)
   - Source: `account.status` from `account_lifecycles` table
   - Values: `ACTIVE` ??"?ъ슜 以?, `DELETION_REQUESTED` ??"?덊눜 泥섎━ 以?, `CLOSED` ??"醫낅즺??
   - Display: Korean label from status map

4. **?좊즺 ?댁슜 ?먭꺽** (Paid Eligibility)
   - Source: `account.paidEligibilityStatus` from `account_lifecycles` table
   - Values: `UNVERIFIED` ??"?뺤씤 ??, `VERIFIED_ADULT` ??"?좊즺 ?댁슜 媛??, `REVOKED` ??"?뺤씤 留뚮즺"
   - Display: Korean label from eligibility map

5. **Password Reset Button**
   - Link to `/auth/forgot-password?returnTo=/account`
   - Self-service password recovery

**Account Page Actions:**

- Link back to My Page (`/mypage`)
- Password reset link

**Account Page Architecture:**

- Server-rendered (async component)
- Uses `getCurrentUser()` for authentication
- Uses `ensureAccountLifecycle()` for account state
- Uses server-side `auth.getUser()` for email verification state
- No client-side auth state; all derived from server

---

## 4. PAID ELIGIBILITY MODEL

**Model Status:** IMPLEMENTED (provider-neutral foundation)

### Database Schema

**Table:** `public.account_lifecycles` (Migration: `024_account_lifecycle_paid_eligibility.sql`)

**Key Columns:**

```sql
user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT
generation integer NOT NULL DEFAULT 1
status text NOT NULL DEFAULT 'ACTIVE'
paid_eligibility_status text NOT NULL DEFAULT 'UNVERIFIED'
paid_eligibility_method text
paid_eligibility_provider text
paid_eligible_at timestamptz
paid_eligibility_policy_version text
paid_eligibility_invalidated_at timestamptz
```

**Paid Eligibility Status Enum:**
- `UNVERIFIED` (default for all new users)
- `VERIFIED_ADULT` (eligible for paid purchase)
- `REVOKED` (eligibility revoked)

**Paid Eligibility Method Enum:**
- `NULL` (no method set yet)
- `DECLARATION` (self-declared; not yet used)
- `EXTERNAL_PROVIDER` (verified by external provider; not yet integrated)

**Constraints:**
- `status IN ('ACTIVE', 'DELETION_REQUESTED', 'CLOSED')`
- `paid_eligibility_status IN ('UNVERIFIED', 'VERIFIED_ADULT', 'REVOKED')`
- `paid_eligibility_method IS NULL OR paid_eligibility_method IN ('DECLARATION', 'EXTERNAL_PROVIDER')`
- Unique index on `(user_id, generation)` to ensure only one active generation per user

### Current Enforcement

**Paid Eligibility Enforced at Checkout:** PARTIAL (feature-gated, disabled by default)

**Enforcement Point:** `PAID_ELIGIBILITY_ENFORCEMENT_ENABLED` environment variable

- File: `app/lib/accounts/server.ts`
- Status: Defaults to `false`
- Code: `export const PAID_ELIGIBILITY_ENFORCEMENT_ENABLED = process.env.PAID_ELIGIBILITY_ENFORCEMENT_ENABLED === "true";`

**Where Checked:**

1. **Order Creation** (`app/api/orders/route.ts`):
   - Calls `ensureAccountLifecycle(user.id)` to verify account status
   - Checks `account.status !== "ACTIVE"` and rejects with 403
   - **Does NOT** currently check `paid_eligibility_status` (even if enforcement enabled)

2. **Payment Confirmation** (`app/api/orders/[orderId]/confirm-payment/route.ts`):
   - Calls `ensureAccountLifecycle(user.id)` to verify account status
   - Checks `account.status !== "ACTIVE"` and rejects with 403
   - **Does NOT** currently check paid eligibility

3. **Guard Function:** `requirePaidEligibleAccount()`
   - Checks `account.paidEligibilityStatus === "VERIFIED_ADULT"`
   - Also requires verified email and active status
   - NOT called by any production route (only available for future use)

**Current Meaning of Paid Eligibility:**

- `UNVERIFIED`: Account holder has not been verified as adult/eligible
- `VERIFIED_ADULT`: Account holder has been verified (future verification method TBD)
- `REVOKED`: Previously verified, now revoked (e.g., policy violation, request by user)

**Implementation Reality:**

- All existing and new users default to `UNVERIFIED`
- No external verification provider integrated
- No declaration flow implemented
- No way for users to become `VERIFIED_ADULT` in current system
- Paid eligibility enforcement is currently disabled

**Does NOT Depend On:**

- Account holder date of birth
- Account holder age
- Profile creation date or profile birth date
- Profile relationship type
- Any profile data

**Profile Birth Data vs. Account Eligibility:**

- Profile stores: `birth_date`, `birth_time`, `gender`, `calendar_type`, `is_leap_month`
- Account lifecycle stores: NO birth data
- Account page disclaimer: "?깆씤 蹂몄씤?뺤씤? 蹂꾨룄 ?몃? ?몄쬆 ?곕룞 ?댄썑 ?쒓났?⑸땲?? ?꾨줈?꾩쓽 異쒖깮 ?뺣낫??怨꾩젙 ?먭꺽????좏븯吏 ?딆뒿?덈떎." (Adult identity verification will be provided after external auth integration. Profile birth data does not substitute for account eligibility.)

### Paid Eligibility Summary Table

| Aspect | Current State |
|--------|---------------|
| Model exists | YES |
| Database persisted | YES |
| Account-level | YES |
| Profile-scoped | NO |
| Age-dependent | NO (not yet) |
| Identity-dependent | NO (not yet) |
| Enforcement enabled | NO (default) |
| External provider | NONE |
| Method: Declaration | NOT IMPLEMENTED |
| Method: External Provider | NOT IMPLEMENTED |
| Current enforcement point | Account active status only |

---

## 5. PASSWORD RESET FLOW

**Status:** IMPLEMENTED (self-service, complete)

### Complete Flow

1. **Request Flow**
   - User visits `/auth/forgot-password`
   - Enters email address
   - Form submits to client-side `requestReset()` function
   - Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: ... })`
   - `redirectTo` points to `/auth/reset-password?returnTo={safeReturnTo}`
   - Shows message: "?낅젰???대찓??二쇱냼媛 留욌떎硫?鍮꾨?踰덊샇 ?ъ꽕???덈궡瑜?蹂대깉?듬땲??" (If email is correct, we sent password reset instructions)
   - Message does NOT reveal whether account exists (security-conscious)

2. **Email and Link**
   - Supabase sends recovery email with recovery link
   - Link contains recovery code and redirects to `/auth/reset-password?code=...`
   - User clicks link in email

3. **Reset Session Establishment**
   - `/auth/reset-password` page loads
   - Client-side code calls `auth.onAuthStateChange('PASSWORD_RECOVERY')` listener
   - When recovery event fires, marks page as "ready"
   - Also calls `auth.getSession()` to check for active recovery session
   - Sets `ready` state when session is available

4. **Password Update**
   - User enters new password (min 8 chars)
   - User confirms password
   - Form submits to client-side `updatePassword()` function
   - Validates password length and match
   - Calls `auth.updateUser({ password })`
   - On success: calls `auth.signOut({ scope: "global" })`
   - Redirects to `/auth/login?returnTo={safeReturnTo}`

5. **Error Handling**
   - If link expired or invalid: shows "?ъ꽕??留곹겕媛 留뚮즺?섏뿀嫄곕굹 ?좏슚?섏? ?딆뒿?덈떎." (Recovery link expired or invalid)
   - If passwords don't match: "鍮꾨?踰덊샇媛 ?쇱튂?섏? ?딆뒿?덈떎." (Passwords don't match)
   - If password too short: "鍮꾨?踰덊샇??8???댁긽?댁뼱???⑸땲??" (Password must be 8+ chars)

### Self-Service Password Reset

**SELF-SERVICE PASSWORD RESET: YES**

Complete end-to-end self-service flow implemented:
- User initiates via email entry
- Email sent by Supabase auth system
- User clicks email link
- User sets new password
- User signs back in with new password
- No operator interaction required for normal flow

### Current Gaps

- Supabase recovery email template not reviewed (provider configuration)
- Recovery token expiry and replay behavior not explicitly tested
- Password policy constraints not documented (8-char minimum is enforced client-side)
- Rate limiting on recovery requests not confirmed (Supabase default behavior)
- Exact global sign-out behavior in deployed environment not verified

---

## 6. EMAIL VERIFICATION FLOW

**Status:** IMPLEMENTED

### Current Implementation

**Signup Email Verification:**

1. User signs up via `/auth/signup` with email and password
2. `auth.signUp()` called with `emailRedirectTo: /auth/callback?returnTo={safeReturnTo}`
3. Supabase sends confirmation email
4. User clicks link in email
5. Redirects to `/auth/callback?code=...&returnTo={safeReturnTo}`
6. `/auth/callback/route.ts` calls `auth.exchangeCodeForSession(code)`
7. On success: redirects to safe `returnTo` URL (defaults to `/result`)
8. On failure: redirects to `/auth/login?error=auth_failed`
9. Session is established, user is logged in

**Email Verification State:**

- Verified by: `email_confirmed_at` field in Supabase auth.users
- Read via: `auth.getUser()` on server side
- Display: Account page shows "?몄쬆?? (verified) or "?몄쬆 ?꾩슂" (verification needed)
- Source: Server-authoritative `email_confirmed_at`, never client-side boolean

**Enforcement Points:**

1. **Profile Creation:**
   - Requires verified email via `requireVerifiedEmailAccount()` guard
   - Rejects with 403 if email not verified
   - File: `app/api/profiles/route.ts`

2. **Profile Editing:**
   - Requires verified email via `requireVerifiedEmailAccount()` guard
   - Rejects with 403 if email not verified
   - File: `app/api/profiles/[profileId]/route.ts`

3. **Paid Order Creation:**
   - NOT currently guarded by verified email (only active account status)
   - File: `app/api/orders/route.ts`

### Unverified User Access

**Unverified users currently CAN:**

- Sign up (required)
- Log in (required)
- View free analysis results (no guard in free flow)
- Run free analysis (no verification guard observed)
- Navigate to checkout (no verification guard at checkout page level)

**Unverified users currently CANNOT:**

- Create profiles (guard: `requireVerifiedEmailAccount()`)
- Edit profiles (guard: `requireVerifiedEmailAccount()`)
- View or manage My Page (likely requires profiles)

**Unverified users and Paid Purchase:**

- Can see checkout page (no verification guard)
- Can create order (only active account guard, no email verification guard)
- Can proceed to payment

### Email Verification Summary

| Scenario | Current Behavior |
|----------|------------------|
| Signup requires email verification | YES - confirmation email required |
| Unverified users can login | YES |
| Unverified users can create profiles | NO - guard blocks |
| Unverified users can edit profiles | NO - guard blocks |
| Unverified users can run free analysis | YES |
| Unverified users can access checkout | YES |
| Unverified users can create orders | YES - only active account guard |
| Email verification enforced at purchase | NO |
| Verification state on account page | YES - displayed |
| Email resend | NOT IMPLEMENTED (can infer Supabase has capability) |

---

## 7. ACCOUNT STATUS & DISABLE LOGIC

**Status:** IMPLEMENTED (foundation only, limited operations)

### Account Status Model

**Table:** `public.account_lifecycles`

**Status Values:**

- `ACTIVE` (default for new accounts)
- `DELETION_REQUESTED` (account closure initiated, awaiting completion)
- `CLOSED` (account lifecycle terminated)

**Database Constraints:**

```sql
constraint account_lifecycles_status_valid check (status in ('ACTIVE', 'DELETION_REQUESTED', 'CLOSED'))
```

**Current Operations:**

1. **Active Account Check:**
   - `requireActiveAccount()` rejects with error code "ACCOUNT_NOT_ACTIVE"
   - Used by: order creation, payment confirmation

2. **Account Lifecycle Lazy Creation:**
   - `ensureAccountLifecycle(userId)` creates account row on first access if not exists
   - Generation defaults to 1
   - Status defaults to ACTIVE

3. **Financial Closure Blocker Detection:**
   - `getAccountClosureFinancialBlockers(userId)` checks for:
     - Non-terminal refund workflow states (REFUND_REQUESTED, REFUND_PROCESSING, REFUND_FAILED_RETRYING, OWNER_REVIEW_REQUIRED)
     - Unresolved payment reconciliation states (reconciliation_required, reconciliation_failed)
   - Returns list of blockers preventing account closure
   - Does NOT perform deletion; read-only check only

### Disable/Ban Logic

**Service-Level Account Disable:** NOT FOUND

No application-level disable, suspend, ban, or locked state beyond DELETION_REQUESTED and CLOSED.

### Account Status

**Application Lifecycle States:**

| State | Meaning | Enforced | Current Users |
|-------|---------|----------|----------------|
| ACTIVE | Account usable | YES - order/payment | All new users default here |
| DELETION_REQUESTED | Closure in progress | Not actively enforced yet | None (deletion not implemented) |
| CLOSED | Lifecycle ended | Not actively enforced yet | None (deletion not implemented) |

**Account Status on UI:**

- Displayed on `/account` page
- User cannot change own status (server-only writes via service_role)
- No admin/operator UI for status changes currently

---

## 8. ACCOUNT DELETION / WITHDRAWAL

**Status:** NOT IMPLEMENTED

### Search Results

**Keywords Searched:**
- ?뚯썝?덊눜 (account withdrawal)
- ?덊눜 (withdrawal)
- delete account
- delete user
- deleteUser
- remove user
- anonymize
- soft delete
- tombstone
- retention

**Finding:** No account deletion UI, API, or workflow found.

### Account Deletion Capability

**ACCOUNT DELETION: NOT IMPLEMENTED**

### Financial Blocker Detection

**What Exists:**

The foundation for deletion decision logic is partially present:

```typescript
export async function getAccountClosureFinancialBlockers(userId: string): Promise<AccountClosureFinancialBlocker[]>
```

This read-only function checks:

1. Refund workflows in non-terminal states
2. Refund workflows in OWNER_REVIEW_REQUIRED state
3. Payment records in reconciliation_required or reconciliation_failed states

**What Does NOT Exist:**

- No UI to request account deletion
- No route to initiate deletion
- No Supabase `auth.admin.deleteUser()` call
- No personal data deletion logic
- No soft delete mechanism
- No anonymization scheduler
- No retention policy implementation
- No account reactivation logic
- No account merge logic

### Account Closure Entry Points

No customer-facing or operator-facing account deletion entry points found.

---

## 9. DATA OWNERSHIP BY USER_ID

**Inventory of User-Owned Tables:**

All tables reference `auth.users(id)` with `user_id` foreign key:

### 1. Core Auth
- **Table:** `auth.users` (Supabase built-in)
  - Primary identifier: `id` (UUID)
  - Ownership: Individual user
  - Delete cascade behavior: Would cascade to all app tables (ON DELETE CASCADE)

### 2. Account Lifecycle
- **Table:** `public.account_lifecycles`
  - User link: `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT`
  - Primary identifier: `id` (UUID)
  - ON DELETE behavior: RESTRICT (cannot delete auth.users if account_lifecycles row exists)
  - Audit value: HIGH (lifecycle state, eligibility status)

### 3. Profiles (Birth Chart Subjects)
- **Table:** `public.profiles`
  - User link: `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - Primary identifier: `id` (UUID)
  - Data: `label`, `relationship_type`, `birth_date`, `birth_time`, `gender`, `calendar_type`, `is_leap_month`
  - ON DELETE behavior: CASCADE (delete all profiles if user deleted)
  - Ownership: Account holder creates/manages these

### 4. Orders (Purchase Intent)
- **Table:** `public.orders`
  - User link: `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - Primary identifier: `id` (UUID)
  - References: `profile_id` (profile being analyzed)
  - Data: `product_id`, `amount`, `status`, `payment_provider`, `transaction_id`, `created_at`, `paid_at`
  - ON DELETE behavior: CASCADE
  - Audit value: CRITICAL (financial order history)

### 5. Purchases (Confirmed Purchase)
- **Table:** `public.purchases`
  - User link: `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - Primary identifier: `id` (UUID)
  - References: `order_id` (CASCADE), `profile_id` (RESTRICT)
  - Data: `product_id`, `purchased_at`
  - ON DELETE behavior: CASCADE
  - Audit value: CRITICAL (financial purchase history)

### 6. Entitlements (Active Access Rights)
- **Table:** `public.entitlements`
  - User link: `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - Primary identifier: `id` (UUID)
  - References: `profile_id` (RESTRICT), `purchase_id` (SET NULL)
  - Data: `resource_id`, `resource_type`, `is_active`, `source`, `revoked_at`, `revocation_reason`
  - ON DELETE behavior: CASCADE
  - Audit value: CRITICAL (current entitlement state, historical revocation)

### 7. Paid Reports (Generated Content)
- **Table:** `public.paid_reports`
  - User link: `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - Primary identifier: `id` (UUID)
  - References: `profile_id` (RESTRICT), `purchase_id` (SET NULL)
  - Data: `product_id`, `status`, `content` (JSONB), `error_code`, `created_at`, `completed_at`
  - ON DELETE behavior: CASCADE
  - Audit value: MEDIUM (user-owned generated content)

### 8. Toss Payment Records (Payment Evidence)
- **Table:** `public.toss_payment_records`
  - User link: Indirect via `order_id -> orders.user_id`
  - Primary identifier: `id` (UUID)
  - References: `order_id` (CASCADE)
  - Data: `payment_key`, `provider_order_id`, `expected_amount`, `confirmed_amount`, `provider_status`, `confirmation_started_at`, `confirmed_at`, `reconciliation_status`, `last_reconciliation_result`, `last_reconciled_at`
  - ON DELETE behavior: CASCADE (with order)
  - Audit value: CRITICAL (payment provider evidence)

### 9. Refund Workflows (Refund Automation)
- **Table:** `public.refund_workflows`
  - User link: `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT`
  - Primary identifier: `id` (UUID)
  - References: `order_id` (RESTRICT), `payment_record_id` (RESTRICT), `profile_id` (RESTRICT)
  - Data: `product_id`, `requested_amount`, `reason_category`, `status`, `provider_status`, `provider_cancellation_reference`, `retry_count`, `max_retry_count`, `next_retry_at`, last attempt timestamps/error codes
  - ON DELETE behavior: RESTRICT (cannot delete user if refund workflow exists)
  - Audit value: CRITICAL (refund history, financial reconciliation)

### 10. Free Analysis Results (Guest & Member)
- **Table:** `public.free_analysis_results`
  - User link: `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - References: `profile_id` (RESTRICT)
  - Data: Status, timestamps, analysis results
  - ON DELETE behavior: CASCADE
  - Audit value: MEDIUM (free tier usage)

### 11. Guest Free Analyses (Pre-Auth Analysis)
- **Table:** `public.guest_free_analyses`
  - User link: `transferred_user_id` (optional, user who claimed guest analysis)
  - Data: Guest fingerprint, resolved profile, transfer status
  - ON DELETE behavior: SET NULL (guest_id can be deleted without losing transfer evidence)
  - Audit value: LOW-MEDIUM (transfer history)

### 12. Active Profiles (Selection State)
- **Table:** `public.active_profiles`
  - User link: `user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
  - Data: Selected `profile_id`, `updated_at`
  - ON DELETE behavior: CASCADE
  - Audit value: LOW (session/UI state only)

### Dependency Map

```
auth.users (root)
?쒋? ON DELETE CASCADE
?? ?쒋? profiles (all user profiles)
?? ?쒋? orders (all purchase intents)
?? ?쒋? purchases (all confirmed purchases)
?? ?쒋? entitlements (all access rights)
?? ?쒋? paid_reports (all generated reports)
?? ?쒋? free_analysis_results (all free analyses)
?? ?쒋? active_profiles (UI selection state)
?? ?붴? guest_free_analyses (transfer history)
?붴? ON DELETE RESTRICT
   ?쒋? account_lifecycles (lifecycle state; prevents deletion)
   ?붴? refund_workflows (refund automation; prevents deletion)
```

**If auth.users were deleted TODAY:**

- ??CASCADE deletion would destroy all non-restricted tables
- ??RESTRICT prevents deletion if `account_lifecycles` or `refund_workflows` exist
- ?좑툘 Financial audit history would be permanently lost (orders, purchases, refund records)
- ?좑툘 Generated content would be deleted (paid reports)

---

## 10. DATABASE CASCADE & FOREIGN KEY RISK

**Current FK Constraints:**

### ON DELETE CASCADE (Auto-Deletes)
- `profiles` ??`auth.users`
- `orders` ??`auth.users`
- `purchases` ??`auth.users`
- `entitlements` ??`auth.users`
- `paid_reports` ??`auth.users`
- `free_analysis_results` ??`auth.users`
- `guest_free_analyses` ??`transferred_user_id` (optional)
- `active_profiles` ??`auth.users`
- `toss_payment_records` ??`orders` (which cascades)

### ON DELETE RESTRICT (Blocks Deletion)
- `account_lifecycles` ??`auth.users` (RESTRICT)
- `refund_workflows` ??`auth.users` (RESTRICT)
- `refund_workflows` ??`orders` (RESTRICT)
- `refund_workflows` ??`payment_record_id` (RESTRICT)
- `profiles` ??`active_profiles` (via `profile_id`)
- `purchases` ??`profiles` (RESTRICT)
- `paid_reports` ??`profiles` (RESTRICT)
- `orders` ??`profiles` (RESTRICT)

### ON DELETE SET NULL (Orphans)
- `entitlements.purchase_id` ??`purchases` (SET NULL)
- `paid_reports.purchase_id` ??`purchases` (SET NULL)

**Risk Assessment:**

**If auth.users was deleted today:**

1. **Financial Audit Loss:** HIGH
   - Orders, purchases, payment records would be cascade-deleted
   - No way to reconstruct payment truth
   - Toss reconciliation history lost
   - Refund workflows block deletion (RESTRICT)

2. **Orphaned Data:** MEDIUM
   - Entitlements/paid_reports would lose their purchase_id (SET NULL)
   - Profile-scoped access impossible to trace to original purchase
   - Orphaned refund workflows (prevent deletion anyway)

3. **Cascade Timing:** HIGH RISK
   - All CASCADE operations happen atomically
   - No backup extraction before deletion
   - No retention preservation step

**Current Blocker:** ON DELETE RESTRICT prevents deletion if refund workflows exist

---

## 11. FINANCIAL RECORD RETENTION DEPENDENCY

**Reconstruction Requirements:**

To reconstruct financial truth, these records must survive:

1. **Orders** (CREATE INTENT)
   - Fields: `user_id`, `profile_id`, `product_id`, `amount`, `status`, `payment_provider`, `transaction_id`, `created_at`, `paid_at`
   - Must persist: YES (currently CASCADE risk)
   - Can anonymize: `user_id` (but breaks provenance)

2. **Purchases** (CONFIRM PURCHASE)
   - Fields: `user_id`, `profile_id`, `product_id`, `order_id`, `purchased_at`
   - Must persist: YES (currently CASCADE risk)
   - Can anonymize: `user_id` (but breaks provenance)

3. **Toss Payment Records** (PAYMENT EVIDENCE)
   - Fields: `order_id`, `payment_key`, `provider_order_id`, `expected_amount`, `confirmed_amount`, `provider_status`, `confirmation_started_at`, `confirmed_at`, `reconciliation_status`, `last_reconciliation_result`, `last_reconciled_at`
   - Must persist: YES (critical audit trail)
   - Can anonymize: Payment key/provider IDs must stay for Toss matching
   - Currently: CASCADE deleted with order

4. **Refund Workflows** (REFUND AUTOMATION)
   - Fields: `order_id`, `payment_record_id`, `user_id`, `profile_id`, `product_id`, `requested_amount`, `status`, `provider_status`, `provider_cancellation_reference`, `retry_count`, `last_provider_error_message`, `completed_at`, `entitlement_revoked_at`
   - Must persist: YES (critical financial audit)
   - Can anonymize: `user_id` (breaks audit only)
   - Currently: RESTRICT prevents user deletion

5. **Entitlements** (ACCESS RIGHTS)
   - Fields: `user_id`, `profile_id`, `resource_id`, `purchase_id`, `is_active`, `revoked_at`, `revocation_reason`
   - Must persist: YES (for historical right trace)
   - Can anonymize: `user_id` (less important)
   - Currently: CASCADE deleted

6. **Paid Reports** (GENERATED CONTENT)
   - Fields: `user_id`, `profile_id`, `product_id`, `purchase_id`, `status`, `content` (JSONB), `completed_at`
   - Must persist: CONDITIONAL
     - If anonymizing with data: NO (delete content)
     - If retaining audit: YES (delete JSONB content only, keep metadata)
   - Currently: CASCADE deleted

### Anonymization Strategy (Deferred)

**What Can Be Anonymized Later:**

- `orders.user_id` ??NULL (break user link, preserve order truth)
- `purchases.user_id` ??NULL (break user link, preserve purchase truth)
- `refund_workflows.user_id` ??NULL (break user link, preserve refund truth)
- `entitlements.user_id` ??NULL (break user link, preserve entitlement history)
- `paid_reports.content` ??NULL (delete generated analysis, keep metadata)
- `paid_reports.user_id` ??NULL (break user link)

**What CANNOT Be Anonymized:**

- `toss_payment_records` fields (Toss requires exact match for reconciliation)
- `orders.profile_id` (need to trace order to analyzed birth chart)
- `purchases.profile_id` (need to trace purchase to analyzed birth chart)
- `refund_workflows.profile_id` (need to trace refund to analyzed profile)

**Current Implementation:** NO anonymization yet (deferred policy)

---

## 12. PROFILE DELETION

**Current Implementation:** IMPLEMENTED with guards

**Profile Delete Guard Logic:**

File: `app/lib/profiles/server.ts`

Function: `listProfileDeleteBlockers(userId)` checks each user's profiles against:

1. **PROFILE_HAS_PURCHASE**
   - Checks: `orders`, `purchases`, `entitlements`, `paid_reports`
   - Blocks if: Any purchase-related row references the profile
   - Reason: Cannot delete profile linked to financial purchase

2. **PROFILE_IS_ACTIVE**
   - Checks: `active_profiles` table for selected profile
   - Blocks if: Profile is currently selected as analysis subject
   - User can resolve by: Selecting different profile or clearing selection

3. **PROFILE_HAS_TRANSFER_HISTORY**
   - Checks: `guest_free_analyses.resolved_profile_id`
   - Blocks if: Guest analysis was transferred to this profile
   - Reason: Preserve transfer history evidence

4. **PROFILE_IN_USE**
   - Fallback catch for foreign key constraints
   - Blocks if: Postgres rejects deletion with constraint violation
   - Covers: Any constraint not explicitly modeled above

### Delete Flow

1. **Preflight Check** (My Page)
   - Calls `listProfileDeleteBlockers(userId)`
   - Returns map of blocked profiles with reasons
   - Displays reason to user

2. **Delete Request** (Profile detail page)
   - User clicks delete
   - API calls `getProfileDeletability(profileId, userId)`
   - Returns `{ deletable: true }` or `{ deletable: false, reason }`
   - Shows user appropriate message from `profileDeleteBlockMessages`

3. **Actual Deletion** (API endpoint)
   - Calls `deleteUserProfile(profileId, userId)`
   - Executes: `DELETE FROM profiles WHERE id = profileId AND user_id = userId`
   - On FK violation: Catches 23503 error, raises `ProfileInUseError`
   - Returns: Boolean success

### Profile Deletion Summary

| Aspect | Status |
|--------|--------|
| Profile deletion UI | IMPLEMENTED |
| Delete guard logic | IMPLEMENTED |
| Guard: Has purchase | CHECKS orders, purchases, entitlements, paid_reports |
| Guard: Is active | CHECKS active_profiles |
| Guard: Transfer history | CHECKS guest_free_analyses |
| FK constraint fallback | IMPLEMENTED |
| User can delete self-profile | YES (if no blockers) |
| Unique self-profile constraint | YES (enforced; one self per user) |
| Self-profile with blockers | Blocked (same as other profiles) |

---

## 13. AGE / BIRTH DATA COLLECTION

**Account Holder Age/Birth Data:** NONE COLLECTED

**ACCOUNT HOLDER BIRTH DATA:** NONE

No birth date, birth time, age, or personal identity data collected at account signup or profile.

### Saju Profile Birth Data

**SAJU PROFILE AGE DATA:** COLLECTED (for birth chart analysis only)

**Table:** `public.profiles`

**Collected Fields:**

- `birth_date` (DATE, required)
- `birth_time` (TIME, required)
- `gender` (enum: male/female, required)
- `calendar_type` (enum: solar/lunar, required)
- `is_leap_month` (boolean, required)

**NOT Collected:**

- Birth location
- Longitude/latitude
- Time zone
- Sex (cultural concept; only biological gender collected)
- Resident registration number
- CI/DI (Korea identity verification)
- Legal name
- Phone number
- Parental consent info

**Distinction:** Saju Profile Birth Data ??Account Holder Data

The profile birth date belongs to the **subject being analyzed** (spouse, child, parent, sibling, other), NOT necessarily the account holder:

```typescript
type ProfileRelationshipType =
  | "self"        // Account holder (can be one self per user)
  | "spouse"      // Profile of spouse
  | "child"       // Profile of child
  | "parent"      // Profile of parent
  | "sibling"     // Profile of sibling
  | "other"       // Profile of other person
```

**Account Holder:** Must have email (from auth.users.email), no birth data collected

**Subjects (Profiles):** Birth data collected for Saju analysis

### Birth Data Linkage

| Data | Table | Purpose | Linkage |
|------|-------|---------|---------|
| Account email | auth.users.email | Authentication | Account |
| Profile birth data | profiles | Saju analysis | Profile (may be spouse/child/etc.) |
| Account eligibility | account_lifecycles | Purchase gate | Account |

**Security:** Profile birth data is NOT used for account eligibility determination

---

## 14. IDENTITY VERIFICATION

**Keywords Searched:**
- 蹂몄씤?몄쬆 (identity verification)
- 蹂몄씤 ?뺤씤 (identity confirmation)
- ?깆씤 ?몄쬆 (adult verification)
- NICE, PASS, KYC, CI, DI
- identity verification, age verification, adult verification

**Identity Verification Providers:** NOT FOUND

### Current Implementation

**IDENTITY VERIFICATION: NOT IMPLEMENTED**

No integration with:
- NICE (Korean identity verification service)
- PASS (Korean security provider)
- KYC (know-your-customer) flows
- CI/DI (Korea identity hashing)
- Any other identity verification provider

### Account Page Disclaimer

Located on `/account`:

**Korean:** "?깆씤 蹂몄씤?뺤씤? 蹂꾨룄 ?몃? ?몄쬆 ?곕룞 ?댄썑 ?쒓났?⑸땲?? ?꾨줈?꾩쓽 異쒖깮 ?뺣낫??怨꾩젙 ?먭꺽????좏븯吏 ?딆뒿?덈떎."

**English Translation:** "Adult identity verification will be provided after external auth integration. Profile birth data does not substitute for account eligibility."

**Meaning:**
- Explicit acknowledgment that verification is planned but not implemented
- Clear statement that profile birth data is not account eligibility
- Provider integration is prerequisite to implementation

### Identity Verification Status

| Component | Status |
|-----------|--------|
| NICE integration | NOT FOUND |
| PASS integration | NOT FOUND |
| KYC flow | NOT FOUND |
| CI/DI hashing | NOT FOUND |
| Any identity provider | NOT FOUND |
| UI for verification | NOT FOUND |
| Server endpoint for verification | NOT FOUND |
| Account field for verified identity | NOT FOUND |
| Dependency on identity in code | NOT FOUND |

---

## 15. AGE VERIFICATION

**Keywords Searched:**
- ?깆씤 ?몄쬆 (adult verification)
- 誘몄꽦??(minor)
- age verification, age gate
- Minor policy, guardian consent

**Age Verification Implementation:** NOT FOUND

### Current Implementation

**AGE VERIFICATION: NOT IMPLEMENTED**

- No age calculation from profile birth dates
- No minimum age check at signup
- No minimum age check at profile creation
- No minimum age check at purchase
- No age-based content blocking
- No minor-specific UI
- No guardian consent flow

### Profile Birth Data Usage

**How Profile Birth Date IS Used:**

- Displayed in profile management UI
- Used for Saju (Korean birth chart) calculation
- Part of analysis subject data
- Shown in My Page profile list

**How Profile Birth Date IS NOT Used:**

- NOT used to calculate account holder age
- NOT used to gate paid purchase
- NOT used to block any functionality
- NOT used to determine minor status
- NOT used to require guardian consent

### Age Policy Status

| Policy | Current | Implemented |
|--------|---------|-------------|
| Minimum signup age | UNDEFINED | NO |
| Minimum paid purchase age | UNDEFINED | NO |
| Minor definition | UNDEFINED | NO |
| Guardian consent required | UNDEFINED | NO |
| Age calculation from birth date | NOT FOUND | NO |

---

## 16. MINOR / AGE POLICY

**Keywords Searched:**
- 誘몄꽦??(minor)
- 誘몄꽦?꾩옄 (minor person)
- 蹂댄샇??(guardian)
- 遺紐??숈쓽 (parental consent)
- 留?14??(under 14)
- 留?19??(under 19)

**MINOR POLICY: NOT DEFINED**

No explicit minor policy found in code, migrations, docs, or comments.

### Current State

**No age-based restrictions exist:**

- Any user can sign up with email + password (no age assertion)
- Any user can create profiles (no age assertion)
- Any user can create profiles for self/spouse/child/parent/sibling/other
- Any user can purchase paid analysis (no age gate, only active account)
- A child can own a profile representing themselves
- A child can purchase analysis for themselves (account status only)
- No parental consent requirement
- No guardian approval workflow

### Deferred Items (From Implementation Report)

- Guardian consent threshold
- Minor-specific UI
- Child profile legal consent
- Account holder birth date collection
- Age verification provider selection

---

## 17. TERMS / PRIVACY CONSENT AT SIGNUP

**Keywords Searched:**
- Terms of Service acceptance
- Privacy Policy acceptance
- Marketing consent
- Age confirmation checkbox
- Guardian consent
- Consent versioning

**Signup Consent Model:** NOT FOUND

### Current Signup Flow

**File:** `app/auth/signup/page.tsx`

**Current Signup Fields:**

1. Email (required)
2. Password (required, min 8 chars)
3. Confirm password (required)
4. Submit button

**No Terms/Privacy/Marketing:**

- No checkbox for Terms of Service
- No checkbox for Privacy Policy
- No checkbox for marketing/email consent
- No checkbox for age confirmation
- No checkbox for guardian consent
- No consent versioning field
- No consent timestamp tracking

**Consent Handling:**

Consent is NOT persisted at signup in this application. Supabase Auth may have global platform terms, but application-level consent/versioning is not implemented.

---

## 18. ACCOUNT CS / SELF-SERVICE FEATURES

### Customer-Facing Self-Service

**Implemented Self-Service:**

1. **Signup** ??
   - Email + password signup
   - Email confirmation required
   - Self-service, fully automated

2. **Login** ??
   - Email + password login
   - Self-service, fully automated

3. **Forgot Password** ??
   - Request recovery email
   - Reset password in email link
   - Global sign-out required
   - Self-service, fully automated

4. **Change Password (Logged-In)** ??
   - Not implemented
   - User must use forgot password flow
   - Deferred

5. **Change Login Email** ??
   - Not implemented
   - Deferred

6. **Resend Email Verification** ??
   - Not implemented
   - Possible via Supabase (deferred UI)

7. **Account Withdrawal** ??
   - No self-service
   - No UI to request deletion
   - Deferred

8. **View Account Status** ??
   - `/account` page shows:
     - Login email
     - Email verification status
     - Account status
     - Paid eligibility status
   - Read-only display

9. **Manage Profiles** ??
   - Create profiles
   - Edit profiles
   - Delete profiles (if no blockers)
   - Full self-service via My Page

10. **View Purchases** ??
    - Purchase history in My Page
    - View paid reports
    - Self-service

11. **Request Refund** ??
    - Not found in current code
    - Refund workflow exists but no customer entry point
    - Likely deferred to operator/CS workflow

### CS Self-Service Summary

| Feature | Status | Fully Self-Service |
|---------|--------|-------------------|
| Signup | IMPLEMENTED | YES |
| Login | IMPLEMENTED | YES |
| Logout | PARTIAL | Can sign out but no dedicated UI |
| Forgot Password | IMPLEMENTED | YES |
| Change Password | NOT IMPLEMENTED | NO |
| Change Email | NOT IMPLEMENTED | NO |
| Resend Verification | NOT IMPLEMENTED | NO |
| View Account Status | IMPLEMENTED | YES (read-only) |
| Manage Profiles | IMPLEMENTED | YES |
| View Purchases | IMPLEMENTED | YES |
| Request Account Deletion | NOT IMPLEMENTED | NO |
| Request Refund | NOT IMPLEMENTED | NO |
| Identity Verification | NOT IMPLEMENTED | NO |
| Age Verification | NOT IMPLEMENTED | NO |

---

## 19. OWNER / ADMIN ACCOUNT SUPPORT

**Keywords Searched:**
- Admin route
- Admin tools
- Operator support
- Manual SQL
- User search
- Account lookup
- Disable account action
- Financial record inspection
- Exceptional handling

**Admin Tooling:** NOT FOUND

### Current State

**No operator/owner admin routes found**

No implementation of:

- User search endpoint
- Account inspection endpoint
- Account status modification endpoint
- Email verification override
- Paid eligibility override
- Refund approval workflow
- Account disable/restore endpoint
- Financial record viewing endpoint
- Exception handling UI

### Financial Closure Blocker Helper

One read-only helper exists for future use:

**Function:** `getAccountClosureFinancialBlockers(userId)`

**Purpose:** Detect if account can be closed

**Returns:** List of blockers (refunds, payment reconciliation)

**Use Case:** When/if operator handles account closure, check for financial dependencies

**Current Status:** Read-only helper only; no operator UI calls it

### Operator Support Gap

**Owner/CS must currently:**

- Access database directly to inspect account state
- Use manual SQL for exceptional cases
- No audit trail for manual operations
- No rollback mechanism

**Deferred Items:**

- Operator admin UI
- User search endpoint
- Account inspection tools
- Refund approval workflow
- Exception handling workflow
- Audit logging for manual operations

---

## 20. SECURITY INVENTORY

### Account-Sensitive Endpoints

**Verified Security Checks:**

1. **Authentication Required** ??
   - All `/account` routes require `getCurrentUser()`
   - All `/api/profiles` routes require `requireVerifiedEmailAccount()` or similar
   - All `/api/orders` routes require `getCurrentUser()`
   - No public access to account/profile/order data

2. **User Cannot Read Other's Account** ??
   - `/account` page requires own user_id from session
   - Account lifecycle RLS: `SELECT only own row`
   - `auth.getUser()` returns authenticated user only
   - No user ID parameter in URL to supply

3. **User Cannot Modify Other's Profile** ??
   - Profile API checks `eq("user_id", user.id)` in all queries
   - Ownership checked server-side, never trusts client
   - DELETE endpoint verifies profile ownership before deleting

4. **Password Actions Use Secure Supabase Flow** ??
   - `resetPasswordForEmail()` sends email with recovery token
   - `updateUser({ password })` requires active recovery session
   - No plaintext password in request URLs
   - No password parameter in logs (use auth.onAuthStateChange instead)

5. **Account APIs Don't Trust Client user_id** ??
   - `getCurrentUser()` always derives user_id from server session
   - No route parameter for user_id (implicit from auth)
   - No request body field for user_id
   - Service-role writes only

6. **Paid Eligibility Cannot Be Self-Asserted** ??
   - `paid_eligibility_status` is server-only column in database
   - No API endpoint to set eligibility
   - RLS: authenticated users cannot insert/update/delete
   - Only service_role can write

7. **Identity/Age Status Cannot Be Self-Asserted** ??
   - No identity/age fields in account_lifecycles for user-writable data
   - Method/provider fields are read-only to users
   - No client-side form to submit identity data

### Security Gaps (Findings)

1. **Email Verification NOT Enforced at Purchase** ?좑툘
   - `/api/orders` does NOT check email verification
   - Only checks active account status
   - Unverified users CAN create orders and proceed to payment
   - **Risk:** Payment proceed with unconfirmed email
   - **Severity:** MEDIUM (email confirmation required for valid account at signup anyway)

2. **No Password Policy Details** ?좑툘
   - 8-character minimum enforced client-side
   - No server-side validation of password complexity
   - No rate limiting documentation
   - Supabase defaults may not be visible

3. **No Rate Limiting on Auth Endpoints** ?좑툘
   - No rate limit on signup attempts
   - No rate limit on login attempts
   - No rate limit on password recovery requests
   - Supabase may provide defaults (not verified)
   - **Risk:** Brute force attack, email spam

4. **No CSRF Protection Visible** ?좑툘
   - No explicit CSRF token in forms
   - Next.js/Supabase may provide framework-level protection
   - Not explicitly verified in code

5. **Paid Eligibility Enforcement Not Wired** ?좑툘
   - `requirePaidEligibleAccount()` exists but is not called
   - Feature gate `PAID_ELIGIBILITY_ENFORCEMENT_ENABLED` defaults false
   - If enabled, no code path uses it
   - Order creation only checks active account, not eligibility
   - **Risk:** If gate is enabled without integration, payments proceed unchecked

### Security Summary

| Check | Status | Verified |
|-------|--------|----------|
| Auth required | PASS | YES |
| Own data only | PASS | YES |
| No client user_id | PASS | YES |
| Secure password flow | PASS | YES |
| Eligibility server-only | PASS | YES |
| Identity server-only | PASS | YES |
| Email verification at purchase | FAIL | Unverified users CAN purchase |
| Password policy complexity | GAP | 8-char min only |
| Rate limiting | GAP | Not documented/verified |
| Paid eligibility wired | FAIL | Not used despite existing |

---

## 21. CURRENT USER JOURNEYS

### Journey A: New Signup ??Email Verification ??Login

**Actual Flow:**

1. User visits `/result` or `/auth/signup`
2. Clicks "?뚯썝媛?? (Sign Up) link
3. Enters email, password, confirm password
4. Clicks submit
5. Client calls `supabase.auth.signUp({ email, password, emailRedirectTo: ... })`
6. Supabase creates auth user, sends confirmation email
7. Page shows "?대찓?쇱쓣 ?뺤씤??二쇱꽭?? (Check your email)
8. User checks inbox for email
9. User clicks email link (contains recovery code)
10. Redirects to `/auth/callback?code=...`
11. `callback/route.ts` calls `exchangeCodeForSession(code)`
12. On success: redirects to `returnTo` (e.g., `/result`)
13. User is now logged in with confirmed email
14. If `returnTo=/checkout?...`: can proceed to purchase
15. `account_lifecycles` row created lazily on first purchase attempt

**Where Flow Can Stop:**

- Email not received: No way to resend (NOT IMPLEMENTED)
- Recovery code expires: Cannot sign up, must restart
- Invalid code: Redirects to login with error

---

### Journey B: Forgot Password ??Reset Password

**Actual Flow:**

1. User visits `/auth/login`
2. Clicks "鍮꾨?踰덊샇 ?ъ꽕?? (Password Reset) link
3. Lands on `/auth/forgot-password`
4. Enters email address
5. Clicks "?ъ꽕???대찓??蹂대궡湲? (Send Reset Email)
6. Client calls `resetPasswordForEmail(email, { redirectTo: ... })`
7. Supabase sends recovery email
8. Page shows "?낅젰???대찓??二쇱냼媛 留욌떎硫?鍮꾨?踰덊샇 ?ъ꽕???덈궡瑜?蹂대깉?듬땲??" (If correct, we sent instructions)
9. User checks email
10. Clicks recovery link (contains recovery code)
11. Redirects to `/auth/reset-password?code=...`
12. Client detects `PASSWORD_RECOVERY` session state
13. Page becomes "ready" to accept new password
14. User enters new password (2x)
15. Clicks submit
16. Client calls `auth.updateUser({ password })`
17. On success: calls `auth.signOut({ scope: 'global' })`
18. Redirects to `/auth/login?returnTo={safeReturnTo}`
19. User must log in with new password

**Where Flow Can Stop:**

- Email not received: No resend (NOT IMPLEMENTED)
- Recovery code expires: Shows "?ъ꽕??留곹겕媛 留뚮즺?섏뿀嫄곕굹 ?좏슚?섏? ?딆뒿?덈떎." (Link expired)
- Password too short: Client validation prevents submission
- Global sign-out fails: User stuck (unlikely)

---

### Journey C: Logged-In User ??Account Page

**Actual Flow:**

1. User navigates to `/account`
2. Server checks `getCurrentUser()` - if none, redirects to login
3. Server calls `ensureAccountLifecycle(user.id)` - creates row if new user
4. Server calls `auth.getUser()` to get `email_confirmed_at`
5. Page renders with:
   - Login email
   - Email verification status
   - Account status (from `account_lifecycles.status`)
   - Paid eligibility (from `account_lifecycles.paid_eligibility_status`)
   - Password reset link
   - My Page back link

**Account Status Values:**

- `ACTIVE` ??"?ъ슜 以?
- `DELETION_REQUESTED` ??"?덊눜 泥섎━ 以?
- `CLOSED` ??"醫낅즺??

**Eligibility Status Values:**

- `UNVERIFIED` ??"?뺤씤 ??
- `VERIFIED_ADULT` ??"?좊즺 ?댁슜 媛??
- `REVOKED` ??"?뺤씤 留뚮즺"

**Where Flow Can Stop:**

- Not logged in: Redirected to login
- Auth service down: 500 error
- Account lifecycle lookup fails: 500 error

---

### Journey D: User Wants to Change Email

**CURRENT STATE:** NOT IMPLEMENTED

Users cannot change login email. Must:
1. Delete account (not implemented)
2. Create new account with new email
3. Lose all purchase history

---

### Journey E: User Wants to Delete Account

**CURRENT STATE:** NOT IMPLEMENTED

No UI, no API, no workflow exists.

User cannot self-service delete. Must contact operator (not yet documented).

---

### Journey F: User is Not Eligible for Paid Purchase

**Current Behavior (Enforcement Disabled):**

1. User visits `/checkout/[productId]?profileId=[profileId]`
2. If `PAID_ELIGIBILITY_ENFORCEMENT_ENABLED === false` (default):
   - User can proceed to payment regardless of eligibility status
3. If enabled in future:
   - `requirePaidEligibleAccount()` guard would need to be called
   - Currently NO code path calls it
   - Order creation would need to check eligibility

**Current Reality:**

- All users default to `UNVERIFIED`
- All users can purchase (if ACTIVE account)
- No provider integration to become `VERIFIED_ADULT`
- Enforcement is deferred pending provider integration

---

### Journey G: User is a Minor / Age Unknown

**CURRENT STATE:** FULLY PERMITTED

No minimum age enforcement exists:

1. User signs up (no age assertion)
2. User creates profile for themselves (if `self` type) with birth date
3. User can immediately purchase paid analysis
4. No guardian consent required
5. No age-based blocking

**Current Reality:**

- Birth date is collected for Saju analysis subject (profiles)
- Profile birth date is NOT used to gate access
- No age calculation from birth date
- No minor-specific restrictions

---

## 22. GAP CLASSIFICATION

**Status Format:** IMPLEMENTED | PARTIAL | NOT IMPLEMENTED | POLICY NOT DEFINED

| Item | Status | Notes |
|------|--------|-------|
| A. Signup | IMPLEMENTED | Email + password, requires verification |
| B. Login | IMPLEMENTED | Email + password, Supabase Auth |
| C. Logout | PARTIAL | Only via reset-password flow, no dedicated logout |
| D. Email Verification | IMPLEMENTED | Required at signup, enforced for profiles |
| E. Resend Verification | NOT IMPLEMENTED | Supabase can send, UI not built |
| F. Forgot Password | IMPLEMENTED | Self-service email recovery |
| G. Password Reset Completion | IMPLEMENTED | Recovery session, new password, global sign-out |
| H. Logged-In Password Change | NOT IMPLEMENTED | Deferred; can use forgot password instead |
| I. Login Email Change | NOT IMPLEMENTED | Deferred |
| J. Account Status | IMPLEMENTED | Read-only display on `/account` |
| K. Account Deletion | NOT IMPLEMENTED | No UI, API, or workflow |
| L. Personal-Data Deletion | NOT IMPLEMENTED | No anonymization/purge logic |
| M. Financial-Record Retention | NOT IMPLEMENTED | No retention policy defined |
| N. Paid Eligibility | IMPLEMENTED | Foundation exists, enforcement disabled |
| O. Identity Verification | NOT IMPLEMENTED | No provider integration |
| P. Age Verification | NOT IMPLEMENTED | No age calculation or gating |
| Q. Minor/Guardian Flow | NOT IMPLEMENTED | No guardian consent, no minor restrictions |
| R. Account CS Self-Service | PARTIAL | Signup/login/password recovery; deletion deferred |
| S. Owner Exception Handling | NOT IMPLEMENTED | No admin UI or tools |

---

## 23. FILES / ROUTES INSPECTED

### Auth Routes
- `app/auth/signup/page.tsx` - Signup flow
- `app/auth/login/page.tsx` - Login flow
- `app/auth/forgot-password/page.tsx` - Password recovery request
- `app/auth/reset-password/page.tsx` - Password reset completion
- `app/auth/callback/route.ts` - Email verification callback

### Account Routes
- `app/account/page.tsx` - Account status page
- `app/api/account/status/route.ts` - Account status API

### Profile Routes
- `app/api/profiles/route.ts` - Profile CRUD
- `app/api/profiles/[profileId]/route.ts` - Profile detail CRUD
- `app/api/profiles/active/route.ts` - Active profile selection

### Order/Payment Routes
- `app/api/orders/route.ts` - Order creation
- `app/checkout/[productId]/page.tsx` - Checkout page
- `app/checkout/[productId]/CheckoutAccessPanel.tsx` - Checkout UI

### Middleware / Core Auth
- `middleware.ts` - Session refresh, cache headers
- `app/lib/supabase/auth.ts` - Server auth helpers
- `app/lib/supabase/server.ts` - Server Supabase client
- `app/lib/supabase/client.ts` - Browser Supabase client
- `app/lib/accounts/server.ts` - Account lifecycle logic

### Library / Types
- `app/lib/auth.ts` - Auth type definitions
- `app/lib/userAccess.ts` - Access level permissions
- `app/lib/profiles/types.ts` - Profile types
- `app/lib/profiles/server.ts` - Profile server logic
- `app/lib/purchases/server.ts` - Purchase server logic

---

## 24. MIGRATIONS INSPECTED

All 24 migrations reviewed:

| # | File | Purpose |
|---|------|---------|
| 001 | phase3b_purchase_persistence.sql | Orders, purchases, entitlements |
| 002 | profiles.sql | Profile storage (birth charts) |
| 003 | profile_scoped_purchase.sql | Add profile_id to orders/purchases/entitlements |
| 004 | paid_reports.sql | Generated report storage |
| 005 | paid_reports_service_role_grant.sql | Service role permissions |
| 006 | active_profiles.sql | Active profile selection state |
| 007 | active_profiles_service_role_grant.sql | Service role permissions |
| 008 | free_analysis_results.sql | Free analysis result storage |
| 009 | free_analysis_results_service_role_grant.sql | Service role permissions |
| 010 | guest_free_analyses.sql | Guest analysis (pre-auth) |
| 011 | guest_free_analyses_service_role_grant.sql | Service role permissions |
| 012 | guest_transfer_rpc_fingerprint_signature.sql | Guest-to-auth transfer |
| 013 | paid_generation_attempts.sql | Paid report generation retry tracking |
| 014 | profiles_service_role_select_grant.sql | Service role SELECT |
| 015 | profiles_service_role_write_grant.sql | Service role INSERT/UPDATE/DELETE |
| 016 | toss_payment_reconciliation.sql | Toss payment evidence + reconciliation |
| 017 | payment_service_role_write_grant.sql | Service role permissions |
| 018 | toss_reconciliation_retry_budget.sql | Retry budget tracking |
| 019 | toss_confirmation_failure_observability.sql | Confirmation failure logging |
| 020 | toss_refund_workflows.sql | Refund automation state |
| 021 | refund_reconciliation_claim_lease.sql | Refund processing lease |
| 022 | fix_refund_claim_concurrency.sql | Concurrency fix |
| 023 | refund_claim_fenced_entitlement_revoke.sql | Entitlement revocation on refund |
| 024 | account_lifecycle_paid_eligibility.sql | **Account lifecycle foundation** |

**Key Migrations:**

- **001:** Financial foundation (orders, purchases, entitlements)
- **002:** Profile data model for Saju subjects
- **003:** Profile scoping for purchases
- **004:** Paid report storage
- **008:** Free analysis result storage
- **010:** Guest (pre-auth) analysis transfer
- **016:** Toss payment evidence and reconciliation state
- **020:** Refund automation state and workflow
- **024:** Account lifecycle and paid eligibility (STEP 57D-46C-1)

---

## 25. PRODUCTION FILES CHANGED

**PRODUCTION FILES CHANGED:** NO

Read-only inventory only. No files edited, created, or deleted.

---

## 26. DATABASE / MIGRATION CHANGED

**DATABASE/MIGRATION CHANGED:** NO

No migrations executed. No schema changes applied.

Migrations exist in repository but are not run in this inventory phase.

---

## 27. COMMIT

**COMMIT:** NO

No git operations performed.

---

## 28. PUSH

**PUSH:** NO

No git push performed.

---

## FINAL REPORT SUMMARY

### STEP 57D-46 PHASE 1 INVENTORY: COMPLETE ??

---

## AUTH PROVIDER

**Supabase Auth**

- Email/password signup and login
- Email verification required
- Password recovery via email
- Session management via middleware
- Server-side auth helpers with guards
- No OAuth, magic link, or OTP

---

## SIGNUP

**IMPLEMENTED**

- Email + password required
- 8+ character password minimum (client-side)
- Email verification sent automatically
- Confirmation email link required to activate
- `account_lifecycles` row created lazily on first use

---

## LOGIN

**IMPLEMENTED**

- Email + password
- Session created via Supabase Auth
- `returnTo` parameter for post-login redirect
- Session managed by middleware with token refresh

---

## LOGOUT

**PARTIAL**

- Sign-out mechanism exists (`auth.signOut()`)
- Only used in password recovery flow
- No dedicated logout page/link
- Manual navigation required for normal logout

---

## EMAIL VERIFICATION

**IMPLEMENTED**

- Required at signup
- Confirmation email sent by Supabase
- Email link contains recovery code
- Code exchanged for session at `/auth/callback`
- `email_confirmed_at` persisted in auth.users
- Enforced for profile creation/editing
- NOT enforced for order/payment creation

---

## RESEND VERIFICATION

**NOT IMPLEMENTED**

- No UI to resend verification email
- Supabase can provide email resend capability
- Deferred

---

## PASSWORD RESET REQUEST

**IMPLEMENTED**

- `/auth/forgot-password` form
- User enters email address
- `resetPasswordForEmail()` sends recovery email
- Generic message (doesn't reveal account existence)
- Self-service, fully automated

---

## PASSWORD RESET COMPLETION

**IMPLEMENTED**

- `/auth/reset-password` page
- Detects `PASSWORD_RECOVERY` session state
- User enters new password (2x)
- `auth.updateUser({ password })` updates password
- Global sign-out after update
- Handles expired/invalid recovery links
- Self-service, fully automated

---

## LOGGED-IN PASSWORD CHANGE

**NOT IMPLEMENTED**

- No dedicated logged-in password change UI
- Users must use forgot password flow
- Deferred

---

## LOGIN EMAIL CHANGE

**NOT IMPLEMENTED**

- No email change capability
- Deferred
- Would require email verification flow

---

## ACCOUNT PAGE

**IMPLEMENTED**

- Displays login email
- Shows email verification status
- Shows account status (ACTIVE/DELETION_REQUESTED/CLOSED)
- Shows paid eligibility (UNVERIFIED/VERIFIED_ADULT/REVOKED)
- Password reset link
- Server-derived, read-only display
- Mobile-first layout

---

## ACCOUNT STATUS MODEL

**IMPLEMENTED**

- `public.account_lifecycles` table
- Status enum: ACTIVE, DELETION_REQUESTED, CLOSED
- Enforced for order creation and payment confirmation
- Lazy account row creation on first access
- Generation field for future lifecycle versioning
- RLS: Authenticated users can SELECT own row

---

## PAID ELIGIBILITY MODEL

**IMPLEMENTED (Foundation)**

- Status enum: UNVERIFIED, VERIFIED_ADULT, REVOKED
- Account-level (not profile-level)
- Provider-neutral method/provider fields
- Enforcement feature-gated (disabled by default)
- No external provider integrated yet
- Default: All users UNVERIFIED
- Not currently enforced at purchase
- Deferred: Provider integration and enforcement

---

## PAID ELIGIBILITY CURRENT MEANING

**UNVERIFIED:** Account holder has not been verified as eligible/adult (provider not yet integrated)

**VERIFIED_ADULT:** Account holder verified as eligible for paid purchases (no verification method yet available)

**REVOKED:** Previously verified, now revoked/expired (no revocation reason field yet)

---

## PAID ELIGIBILITY ENFORCED AT CHECKOUT

**ENFORCED: NO (PARTIAL Feature-Gate)**

- Foundation exists: `requirePaidEligibleAccount()` guard function
- Feature flag exists: `PAID_ELIGIBILITY_ENFORCEMENT_ENABLED` environment variable
- Current status: Defaults to `false` (disabled)
- If enabled: No production code path calls the guard
- Order creation checks only account active status, not eligibility
- Deferred: Wire enforcement after provider integration

---

## ACCOUNT DELETION

**NOT IMPLEMENTED**

- No customer-facing UI
- No API endpoint
- No workflow
- Read-only financial blocker detector exists for future use
- Deferred: Policy/legal approval, provider integration, retention definition

---

## PROFILE DELETION

**IMPLEMENTED with Guards**

- My Page profile management UI
- Preflight blocker check shows reasons
- Cannot delete if:
  - Profile has purchase history
  - Profile is currently active (selected)
  - Profile has guest transfer history
- User can resolve active blocker by selecting different profile
- Delete request confirmed before action
- FK constraint fallback for unexpected constraints

---

## FINANCIAL HISTORY DELETION RISK

**DELETION RISK: HIGH**

- Orders CASCADE deleted with auth.users
- Purchases CASCADE deleted
- Toss payment records CASCADE deleted with orders
- Refund workflows RESTRICT (prevent deletion) but orphan on cascade
- Entitlements CASCADE deleted
- No backup extraction before deletion
- No retention preservation step
- Financial audit history permanently lost
- Recommendation: Implement ON DELETE SET NULL with anonymized user_id preservation for orders/purchases/refunds

---

## AUTH.USERS DELETE CASCADE RISK

**RESTRICT BLOCKERS (Prevent Deletion):**
- `account_lifecycles.user_id REFERENCES auth.users(id) ON DELETE RESTRICT`
- `refund_workflows.user_id REFERENCES auth.users(id) ON DELETE RESTRICT`

**CASCADE (Auto-Deletes):**
- `profiles` (CASCADE)
- `orders` (CASCADE ??toss_payment_records)
- `purchases` (CASCADE)
- `entitlements` (CASCADE)
- `paid_reports` (CASCADE)
- `free_analysis_results` (CASCADE)

**If auth.users deleted:**
1. Fails if `account_lifecycles` row exists (RESTRICT)
2. Fails if non-terminal `refund_workflows` exist (RESTRICT)
3. If no restrictors: ALL financial history deleted automatically

---

## ACCOUNT HOLDER AGE DATA

**ACCOUNT HOLDER AGE DATA: NONE COLLECTED**

- No birth date at signup
- No birth date in account_lifecycles
- No age calculation
- No age-based gating
- No identity/legal name collection

---

## SAJU PROFILE AGE DATA

**SAJU PROFILE AGE DATA: COLLECTED (for analysis only)**

- Birth date (required)
- Birth time (required)
- Gender (required)
- Calendar type (required, solar/lunar)
- Is leap month (boolean)

**Important:** Profile birth data belongs to **analysis subject** (self/spouse/child/parent/sibling/other), not necessarily account holder.

**NOT used for:** Account eligibility, age gates, guardian determination

---

## IDENTITY VERIFICATION

**IDENTITY VERIFICATION: NOT IMPLEMENTED**

- No NICE integration
- No PASS integration
- No KYC flow
- No CI/DI collection or hashing
- Account page explicitly states verification is planned for future

---

## AGE VERIFICATION

**AGE VERIFICATION: NOT IMPLEMENTED**

- No age calculation from profile birth dates
- No age gates at signup/profile/purchase
- No minor-specific UI or restrictions
- No age-based content blocking

---

## MINOR POLICY

**MINOR POLICY: NOT DEFINED**

- No minimum signup age defined
- No minimum purchase age defined
- No guardian consent requirement
- No parental consent workflow
- Profile system supports child profiles but doesn't restrict them
- A child can own and purchase for themselves

---

## GUARDIAN CONSENT

**GUARDIAN CONSENT: NOT IMPLEMENTED**

- No consent model
- No consent form
- No guardian approval workflow
- No legal document handling

---

## RESIDENT REGISTRATION NUMBER COLLECTED

**RESIDENT REGISTRATION NUMBER COLLECTED: NO**

- Profile system does NOT collect resident registration number
- Account system does NOT collect resident registration number
- Birth data limited to date/time, gender, calendar type

---

## TOSS PAYMENT USED AS IDENTITY VERIFICATION

**TOSS PAYMENT USED AS IDENTITY VERIFICATION: NO**

- Toss payment records are stored for reconciliation
- Payment evidence is NOT treated as identity verification
- No link between payment status and account eligibility
- Eligibility remains independent of payment provider

---

## SIGNUP CONSENT MODEL

**SIGNUP CONSENT MODEL: NOT IMPLEMENTED**

- No Terms of Service checkbox
- No Privacy Policy checkbox
- No Marketing consent checkbox
- No Age confirmation checkbox
- No Guardian consent checkbox
- No consent version tracking
- No consent timestamp storage
- Supabase platform may have global terms, but app-level consent is not persisted

---

## ACCOUNT SELF-SERVICE CAPABILITIES

**Summary:** PARTIAL

**Implemented:**
- Signup (email + password)
- Login (email + password)
- Password recovery (email-based)
- View account status
- Manage profiles (create, edit, delete)
- View purchase history

**Not Implemented:**
- Change email
- Change password (logged-in)
- Resend verification email
- Request account deletion
- Request refund

---

## OWNER ACCOUNT SUPPORT CAPABILITIES

**Summary:** NOT IMPLEMENTED

- No user search endpoint
- No account inspection endpoint
- No account status modification endpoint
- No override capabilities
- No admin UI
- No operator tools

**Existing Helper (read-only):**
- `getAccountClosureFinancialBlockers()` - Check if account can close (not yet called by any operator workflow)

---

## SECURITY GAPS

1. **Email Verification NOT Enforced at Purchase**
   - Unverified users can create orders and proceed to Toss payment
   - Only verified at profile creation/editing
   - Severity: MEDIUM

2. **Paid Eligibility Guard Exists But Not Used**
   - `requirePaidEligibleAccount()` defined but never called
   - If feature flag enabled without wiring, enforcement doesn't happen
   - Severity: MEDIUM

3. **No Rate Limiting Visible**
   - No rate limit on signup attempts
   - No rate limit on login attempts
   - No rate limit on password recovery email requests
   - Severity: MEDIUM

4. **No CSRF Protection Documented**
   - Framework may provide automatic protection
   - Not explicitly verified in code

5. **Password Complexity Policy Not Documented**
   - Only 8-character minimum enforced
   - No complexity requirements visible
   - Supabase defaults not reviewed

---

## CURRENT JOURNEY BLOCKERS

1. **Unverified Email**
   - Blocks: Profile creation/editing
   - Cannot be resolved by user within app
   - Workaround: Create new account with correct email

2. **Email Verification Not Resendable**
   - If signup email not received
   - No UI to request resend
   - User must create new account
   - Blocks: Account activation

3. **No Logged-In Password Change**
   - If user wants to change password
   - Must use forgot-password recovery flow
   - Requires email access
   - Deferred functionality

4. **No Account Deletion Workflow**
   - If user wants to delete account
   - No self-service option
   - Must contact operator (not yet available)
   - Blocks: Full account removal

5. **No Email Change Capability**
   - If user's email address changes
   - No way to update login email
   - Must create new account
   - Deferred functionality

6. **Paid Eligibility Stuck in UNVERIFIED**
   - All users default UNVERIFIED
   - No way to become VERIFIED_ADULT
   - External provider not integrated yet
   - Future gate is disabled anyway

---

## GAP CLASSIFICATION SUMMARY

**A. Signup:** IMPLEMENTED
**B. Login:** IMPLEMENTED
**C. Logout:** PARTIAL
**D. Email Verification:** IMPLEMENTED
**E. Resend Verification:** NOT IMPLEMENTED
**F. Forgot Password:** IMPLEMENTED
**G. Password Reset Completion:** IMPLEMENTED
**H. Logged-In Password Change:** NOT IMPLEMENTED
**I. Login Email Change:** NOT IMPLEMENTED
**J. Account Status:** IMPLEMENTED
**K. Account Deletion:** NOT IMPLEMENTED
**L. Personal-Data Deletion:** NOT IMPLEMENTED
**M. Financial-Record Retention:** NOT IMPLEMENTED (policy undefined)
**N. Paid Eligibility:** IMPLEMENTED (foundation), enforcement disabled
**O. Identity Verification:** NOT IMPLEMENTED
**P. Age Verification:** NOT IMPLEMENTED
**Q. Minor/Guardian Flow:** NOT IMPLEMENTED
**R. Account CS Self-Service:** PARTIAL
**S. Owner Exception Handling:** NOT IMPLEMENTED

---

## DEFERRED ITEMS (NOT ADDRESSED IN THIS PHASE)

1. Resend email verification UI
2. Logged-in password change UI
3. Login email change capability
4. Account deletion workflow and UI
5. Personal data deletion/anonymization
6. Financial record retention policy
7. Paid eligibility provider integration
8. Paid eligibility enforcement wiring
9. Identity verification provider integration
10. Age verification and calculation
11. Minor policy definition and enforcement
12. Guardian consent model and workflow
13. Account ownership guardian approval
14. Same-email re-registration workflow
15. Account merge functionality
16. Owner/operator admin UI and tools
17. Refund request self-service
18. Terms/Privacy/Marketing consent model
19. Account deletion exception handling
20. Account-closure entitlement revocation
21. Logout button/page on normal flow
22. Rate limiting on auth endpoints

---

## NEXT STEPS FOR PHASE 2 (PENDING HUMAN REVIEW)

After human review of this Phase 1 inventory, Phase 2 should address policy definition:

**Legal/Policy Required:**
1. Minimum signup age (or allow unrestricted)
2. Minimum purchase age
3. Guardian consent threshold
4. Account holder data collection policy
5. Resident registration number collection policy (likely: NO)
6. Data retention period
7. Anonymization period
8. Account closure workflow
9. Financial record archival policy

**Technical Required:**
1. External identity provider selection (NICE/PASS/KYC)
2. Provider contract and merchant configuration
3. Integration point (signup? checkout? account page?)
4. CI/DI hashing and storage (if required by provider)
5. Legal name and phone collection (if required)
6. Parental consent workflow (if minors supported)
7. Toss age verification correlation (if applicable)
8. Account deletion cascade strategy (preserve anonymized financial records)
9. Audit logging for manual operations (when admin UI implemented)

---

**END OF PHASE 1 INVENTORY REPORT**

Status: **COMPLETE - READ-ONLY**
No production code changed.
No database executed.
No commits made.
No push performed.

Awaiting human review before proceeding to Phase 2.
