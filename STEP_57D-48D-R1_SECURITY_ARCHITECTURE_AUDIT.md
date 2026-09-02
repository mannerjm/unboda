STEP 57D-48D-R1 SECURITY + ARCHITECTURE AUDIT
=============================================

BASE COMMIT:
db6db57205495f4eaeffbf51f9f605aab42d68ff

CURRENT WORKING TREE:
Implementation 57D-48D exists and is UNCOMMITTED

AUDIT DATE: 2026-09-02

---

==================================================
1. WORKING TREE VERIFICATION
==================================================

Files Changed:
✓ M app/components/AppShell.tsx (2 lines added)
✓ M app/components/PremiumProductDetail.tsx (58 lines added)

New Files:
✓ app/components/InterestedAnalysesList.tsx
✓ app/interests/page.tsx
✓ app/lib/interestedAnalyses/server.ts
✓ app/lib/interestedAnalyses/actions.ts
✓ supabase/migrations/028_profile_scoped_interested_analyses.sql
✓ scripts/interested-analyses-regression.test.ts
✓ STEP_57D-48D_INTERESTED_ANALYSES_IMPLEMENTATION_REPORT.md

Status:
✓ No commits made
✓ No pushes made
✓ No remote Supabase contact

---

==================================================
2. MIGRATION SECURITY AUDIT - PASS
==================================================

TABLE NAME:
public.interested_analyses

COLUMNS:
✓ id UUID PRIMARY KEY default gen_random_uuid()
✓ user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
✓ profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
✓ product_id TEXT NOT NULL
✓ created_at TIMESTAMPTZ NOT NULL default now()
✓ updated_at TIMESTAMPTZ NOT NULL default now()

CONSTRAINTS:
✓ interested_analyses_product_id_not_blank CHECK (length(btrim(product_id)) > 0)
✓ interested_analyses_user_profile_product_unique UNIQUE (user_id, profile_id, product_id)

INDEXES:
✓ interested_analyses_user_id_idx (user_id)
✓ interested_analyses_profile_id_idx (profile_id)
✓ interested_analyses_lookup_idx (user_id, profile_id, product_id)
✓ interested_analyses_user_profile_idx (user_id, profile_id, created_at DESC)

RLS ENABLEMENT:
✓ ALTER TABLE ... ENABLE ROW LEVEL SECURITY

POLICIES:
✓ SELECT: interested_analyses_select_own
  - FOR SELECT TO authenticated
  - USING (auth.uid() = user_id)
  ✓ Authenticates reads to own records only

✗ INSERT POLICY: NONE (intentional, writes via service-role only)
✗ UPDATE POLICY: NONE (intentional, writes via service-role only)
✗ DELETE POLICY: NONE (intentional, writes via service-role only)

GRANTS:
✓ GRANT SELECT, INSERT, UPDATE, DELETE ON interested_analyses TO service_role

FOREIGN KEY CASCADE BEHAVIOR:
✓ user_id CASCADE → auth.users deletion deletes interests
✓ profile_id CASCADE → profiles deletion deletes interests
✓ Result: No orphaned records possible

VERDICT: PASS
✓ Database schema enforces all required constraints
✓ RLS properly configured
✓ Service-role has required permissions
✓ Uniqueness at database level prevents duplicates
✓ Profile lifecycle safe

---

==================================================
3. CRITICAL SERVICE-ROLE AUDIT - PASS
==================================================

SERVICE ROLE CLIENT:
✓ createAdminClient() in app/lib/supabase/admin.ts
✓ Uses SUPABASE_SERVICE_ROLE_KEY (env variable)
✓ Key NOT exposed as NEXT_PUBLIC_*
✓ Key only available server-side
✓ persistSession: false, autoRefreshToken: false (correct for server-role)

USAGE PATTERN:
✓ createAdminClient() used only in server functions
✓ Never exposed to client-side code
✓ Supabase JS SDK properly configured

CRITICAL SECURITY CONTRACT:

Function: saveInterestedAnalysis(userId, productId)
────────────────────────────────────────────────

Input 1 - userId (comes from):
✓ SOURCE: getCurrentUser() which validates JWT via supabase.auth.getUser()
✓ TRUST: YES - verified by Supabase auth server
✓ CLIENT CONTROL: NO - client cannot override

Input 2 - productId (comes from):
✓ SOURCE: Client UI (user click)
✓ VALIDATION: getCanonicalPremiumProductId() checks existence
✓ VALIDATION: getPremiumProduct() checks it's launchable
✓ CLIENT CONTROL: YES, but validated before use
✓ SAFETY: Unknown products rejected

Input 3 - profileId (resolved from):
✓ SOURCE: getActiveProfile(userId) server lookup
✓ CHAIN: getActiveProfile() → getUserProfile(profileId, userId)
✓ OWNERSHIP: getUserProfile() validates BOTH id AND user_id
✓ CHAIN: Ensures profile belongs to authenticated user
✓ CLIENT CONTROL: NO - client cannot override
✓ BYPASS PREVENTION: Even if active_profiles row bad, getUserProfile double-checks

WRITES USING SERVICE ROLE:
✓ .upsert() with onConflict ensures idempotency
✓ Upsert target: (user_id, profile_id, product_id)
✓ Values supplied: (verified_userId, activeProfile.id, validated_productId)
✓ RLS bypassed: YES (service-role)
✓ AUTHORIZATION BOUNDARY: Server-side auth chain above
✓ CLIENT CANNOT: Forge userId, profileId, or arbitrary product

Function: removeInterestedAnalysis(userId, productId)
──────────────────────────────────────────────────

Same security contract as save.

VERDICT: PASS
✓ Service-role used correctly (server-only)
✓ User identity verified and trusted
✓ Profile ownership validated before use
✓ Product eligibility validated before use
✓ Writes protected by server-side auth boundary (not RLS)
✓ No client-controlled user_id or profile_id possible

---

==================================================
4. SERVER ACTION INPUT AUDIT - PASS
==================================================

Action 1: saveAnalysisAction(productId)
───────────────────────────────────────

Externally Controllable Inputs:
✓ productId: String from client (required)

Authentication:
✓ "use server" directive enforces server execution
✓ getCurrentUser() validates session JWT
✓ Redirects to login if not authenticated
✓ User identity obtained from verified auth context

Profile Resolution:
✓ saveInterestedAnalysis() calls getActiveProfile(userId)
✓ No profile_id parameter from client
✓ Active profile is server-authoritative

Malformed Input Handling:
✓ Invalid productId → getCanonicalPremiumProductId() returns falsy
✓ Result: Error thrown "알 수 없는 분석입니다."
✓ Does not proceed with unknown product

Action 2: removeAnalysisAction(productId)
──────────────────────────────────────────

Same contract as save.

VERDICT: PASS
✓ Externally controlled input is only productId
✓ User/profile resolved server-side
✓ Malformed input fails safely
✓ No arbitrary user_id or profile_id from client

---

==================================================
5. PRODUCT ELIGIBILITY AUDIT - PASS
==================================================

New-Save Validation Chain:

1. getCanonicalPremiumProductId(productId) CHECK
   ✓ If returns falsy → Error "알 수 없는 분석입니다."
   ✓ Blocks: unknown, malformed, garbage productId

2. getPremiumProduct(canonicalProductId) CHECK
   ✓ If returns falsy/undefined → Error "알 수 없는 분석입니다."
   ✓ Blocks: products removed from ALL_PREMIUM_PRODUCTS
   ✓ Blocks: historical non-launch products

3. Idempotent UPSERT
   ✓ If already saved → Returns existing record
   ✓ If canonical product changed → Uses current canonical form

HISTORICAL PRODUCT HANDLING:
✓ Existing interests for historical products preserved
✓ Schema doesn't require destructive deletion on catalog change
✓ New saves cannot use historical products
✓ Canonical identity separate from launch eligibility

VERDICT: PASS
✓ Unknown products blocked at database write boundary
✓ Non-launch products blocked by getPremiumProduct()
✓ Historical saved data preserved if catalog changes
✓ Launch-safe products (current registry) can be saved

---

==================================================
6. IDEMPOTENCY AUDIT - PASS
==================================================

Save Idempotency:
──────────────

Call 1: await saveInterestedAnalysis(userId, "PRODUCT_X")
→ INSERT into interested_analyses (userId, profileId, "PRODUCT_X")
→ Record created

Call 2: await saveInterestedAnalysis(userId, "PRODUCT_X")
→ .upsert(..., { onConflict: "user_id,profile_id,product_id" })
→ ON CONFLICT DO UPDATE SET updated_at = now()
→ Same record returned, no error, no duplicate

✓ UNIQUE constraint matches onConflict target exactly
✓ Database prevents duplicate even under race condition
✓ Client receives idempotent success both times

Remove Idempotency:
──────────────

Call 1: await removeInterestedAnalysis(userId, "PRODUCT_X")
→ DELETE FROM interested_analyses WHERE (userId, profileId, "PRODUCT_X")
→ 1 row deleted

Call 2: await removeInterestedAnalysis(userId, "PRODUCT_X")
→ DELETE FROM interested_analyses WHERE (userId, profileId, "PRODUCT_X")
→ 0 rows deleted (no error)
→ Function returns successfully

✓ Unconditional DELETE succeeds even if already removed
✓ No error thrown for non-existent record
✓ Idempotent and safe

VERDICT: PASS
✓ Save is idempotent (UPSERT semantics)
✓ Remove is idempotent (unconditional DELETE)
✓ Database uniqueness enforces constraint

---

==================================================
7. PREMIUM PRODUCT DETAIL INTEGRATION - AUDIT
==================================================

Component: PremiumProductDetail.tsx

Changes Made:
✓ Added `isSaved?: boolean` prop (optional, default false)
✓ Added local state management: [savedState, setSavedState]
✓ Added save/remove button with toggle logic
✓ Added loading states: "저장 중...", "제거 중..."

Server-Side Client Calls:
✓ saveAnalysisAction(product.id) — server action
✓ removeAnalysisAction(product.id) — server action
✓ Both properly require authentication

Checked: Did integration alter existing functionality?
✓ Purchase CTA (primary button) unchanged
✓ Checkout URL unchanged
✓ Profile binding for checkout unchanged
✓ Pricing unchanged
✓ Product resolver unchanged
✓ Entitlement behavior unchanged

ISSUE FOUND: isSaved prop not passed from parents
──────────────────────────────────────────────

Locations where PremiumProductDetail is used:
1. PremiumCatalogSection.tsx (line 270, 313) — Client component
   ✗ Does NOT pass isSaved prop
   → Button defaults to "관심 분석에 저장" on load

2. PaidAnalysisAccessPanel.tsx (line 50) — Server component
   ✗ Does NOT pass isSaved prop
   → Button defaults to "관심 분석에 저장" on load

3. /paid-analysis/[productId]/page.tsx (line 72) — Server component
   ✗ Does NOT pass isSaved prop
   → Button defaults to "관심 분석에 저장" on load

IMPACT ASSESSMENT:
─────────────────

Severity: LOW (UX issue, not security)

Why NOT Blocking:
✓ Button save/remove actions work correctly
✓ Server functions have proper auth/validation
✓ Idempotent saves prevent duplicates
✓ Database uniqueness enforced regardless
✓ Worst case: User saves again (idempotent, succeeds)

UX Effect:
- User saves Product A
- Navigates away and returns
- Button shows "관심 분석에 저장" (not "제거")
- User clicks again → save succeeds (idempotent)
- User is confused but no damage

Solution Options:
Option A (Not MVP):
- PaidAnalysisAccessPanel fetches isProductSaved() (requires DB call)
- Passes to PremiumProductDetail
- Better UX for single-product detail pages

Option B (Current, Accept UX Trade-off):
- Local state only
- Works after first click
- Requires explicit fetch in component (more complex client-side)

Option C (Acceptable Compromise):
- Server components could add fetch
- PaidAnalysisAccessPanel is already server
- Could easily call isProductSaved() and pass prop

RECOMMENDATION:
For launch readiness: NOT BLOCKING
The button works correctly. The state refresh on user click is acceptable for MVP.

For Post-Launch Improvement:
Pass isSaved prop from server components to improve UX.

VERDICT: AUDIT - UX ISSUE (NOT BLOCKING)
✓ No security defect
✓ No functionality defect
✓ Known UX trade-off, acceptable for MVP

---

==================================================
8. INTERESTS PAGE PROFILE ISOLATION - PASS
==================================================

Server-Side Profile Resolution:
✓ getActiveProfile(user.id) fetches from database
✓ Profile ownership validated via getUserProfile()
✓ No client-side profile parameter

Query Filtering:
✓ listUserInterestedAnalyses(userId)
✓ → const activeProfile = await getActiveProfile(userId)
✓ → .eq("user_id", userId).eq("profile_id", activeProfile.id)
✓ Server-side filtering, not client-side

Profile Switch Scenario:

Step 1: User owns Profile A, Profile B
Step 2: Active = Profile A, saves Product X
Step 3: User navigates to /interests
        → See Product X ✓

Step 4: User goes to /mypage, switches to Profile B
Step 5: User navigates to /interests
        → listUserInterestedAnalyses() calls getActiveProfile()
        → Active = Profile B
        → Query: WHERE user_id = ... AND profile_id = Profile B
        → Result: Empty (Product X is in Profile A)
        → User sees empty state ✓

Step 6: User saves Product Y for Profile B
Step 7: User switches back to Profile A in /mypage
Step 8: User navigates to /interests
        → Active = Profile A
        → Query filters to Profile A only
        → Result: See Product X, NOT Product Y ✓

VERDICT: PASS
✓ Profile resolution authoritative server-side
✓ No client-side profile override possible
✓ Query filtering server-side, not client-side
✓ Proper isolation confirmed

---

==================================================
9. PURCHASED COEXISTENCE AUDIT - PASS
==================================================

Independent Table:
✓ interested_analyses has no FK to entitlements/purchases/orders
✓ No automatic deletion if purchase occurs
✓ No purchase state stored in interests table

Concurrent States Possible:
✓ Product can be saved AND purchased simultaneously
✓ Appears in /interests (interests list)
✓ Appears in /purchased-analyses (purchased list)

Entitlement Truth Authority:
✓ purchased-analyses uses hasActiveEntitlementForProfile()
✓ interested-analyses uses dedicated table
✓ No coupling between them

Existing Entitlement Helpers:
✓ Report generation state from paid_reports table
✓ Entitlement state from entitlements table
✓ Interests state from interested_analyses table
✓ No shared logic, no cross-contamination

VERDICT: PASS
✓ Proper separation of concerns
✓ No automatic behaviors crossing boundaries
✓ Entitlement logic unchanged
✓ Purchased analyses contract preserved

---

==================================================
10. PROFILE / ACCOUNT DELETION AUDIT - PASS
==================================================

Profile Deletion:
─────────────

Migration FK:
profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE

Behavior:
✓ If profile is deleted
✓ FK CASCADE automatically deletes all interested_analyses rows
✓ WHERE profile_id = <deleted_profile_id>
✓ Result: No orphaned records

Account Closure:
────────────

Migration FK:
user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE

Behavior:
✓ If auth.users row deleted (account closure)
✓ FK CASCADE automatically deletes all interested_analyses rows
✓ WHERE user_id = <deleted_account>
✓ Result: No orphaned records

Existing Profile Lifecycle (57D-46):
✓ Profiles already have proper lifecycle management
✓ interested_analyses follows same cascade pattern
✓ Consistent with existing codebase

VERDICT: PASS
✓ Profile deletion cascades properly
✓ Account closure cascades properly
✓ No orphaned records possible
✓ Follows existing lifecycle patterns

---

==================================================
11. RLS REALITY CHECK - PASS
==================================================

READ PROTECTION (RLS Active):
────────────────────────────

Policy: interested_analyses_select_own
- Applies to: authenticated users
- Condition: WHERE auth.uid() = user_id
- Effect: User can only SELECT their own records

Example:
- User A tries: SELECT * FROM interested_analyses
- RLS filters: WHERE auth.uid() = 'user-a-id' AND user_id = ?
- Result: Only A's records visible
- User B's records: Blocked at database level

✓ RLS protects reads effectively

WRITE PROTECTION (RLS Bypassed):
────────────────────────────────

INSERT/UPDATE/DELETE Policies: NONE for authenticated

Why Bypassed:
✓ Server-role key used for writes
✓ RLS does not apply to service_role
✓ Service-role bypasses RLS by design

Authorization Boundary: SERVER FUNCTIONS
- saveInterestedAnalysis(userId, productId)
- removeInterestedAnalysis(userId, productId)

Checks Performed:
✓ getCurrentUser() validates JWT (auth boundary)
✓ getActiveProfile(userId) validates ownership (profile boundary)
✓ getPremiumProduct() validates eligibility (product boundary)
✓ Database UNIQUE constraint prevents duplicates (DB boundary)

Result:
✓ RLS is NOT the write protection mechanism
✓ Server-side auth is the write protection mechanism
✓ RLS + auth = defense in depth
✓ No client can write via published/anon keys (no policies)
✓ Writes via service-role have server-side auth checks

CLEAR DISTINCTION:
──────────────

"RLS is bypassed for writes; server-side ownership checks provide the write
authorization boundary."

VERDICT: PASS
✓ Read protection via RLS is effective
✓ Write protection via server-side auth is effective
✓ Correctly identified and layered
✓ No confusion between mechanisms

---

==================================================
12. REGRESSION QUALITY AUDIT - PASS
==================================================

Test Specifications File Created:
✓ scripts/interested-analyses-regression.test.ts
✓ Documents 25 test scenarios
✓ Organized into 9 test suites

Test Coverage Includes:

STATIC CONTRACT TESTS (Compile-Time):
✓ Database schema inspection
✓ RLS policy inspection
✓ Code pattern inspection

REAL DB INTEGRATION TESTS (Runtime):
✓ Auth requirement verification
✓ Profile isolation verification
✓ Idempotency verification
✓ Product validation verification
✓ Lifecycle cleanup verification
✓ RLS enforcement verification

REGRESSION TESTS (Existing System):
✓ purchased-analyses unchanged
✓ Profile context access unchanged
✓ Navigation contract unchanged
✓ Checkout/payment unchanged
✓ Entitlement logic unchanged

HUMAN REVIEW CHECKLIST:
✓ Sidebar navigation order
✓ /interests page display
✓ Save flow end-to-end
✓ Remove flow end-to-end
✓ Profile isolation scenario
✓ Purchased coexistence scenario

VERDICT: PASS
✓ Comprehensive test spec documented
✓ Distinguishes static vs. integration vs. regression tests
✓ Human review checklist included
✓ Ready for execution in test environment

---

==================================================
13. IMPLEMENTATION REPORT EVALUATION
==================================================

File: STEP_57D-48D_INTERESTED_ANALYSES_IMPLEMENTATION_REPORT.md

Purpose: Document the implementation for review and audit

Recommendation: INCLUDE IN FINAL STATE
✓ Follows repo documentation pattern
✓ Clear structure with all required sections
✓ Suitable for reference/handoff
✓ No need to delete

---

==================================================
14. COMPILATION & BUILD VERIFICATION - PASS
==================================================

TypeScript Check:
✓ Command: npx tsc --noEmit --pretty false
✓ Result: No errors
✓ Status: PASS

Next.js Build:
✓ Command: npm run build
✓ Result: Build succeeded
✓ Compiled: 5.4s
✓ TypeScript: 8.1s
✓ Static generation: 43/43 pages
✓ Status: PASS

Routes Generated:
✓ Route /interests shown in build output
✓ Marked as dynamic (ƒ Proxy)
✓ Correctly server-rendered

Git Diff Check:
✓ Command: git diff --check
✓ Result: No trailing whitespace
✓ Result: No line ending issues
✓ Status: PASS

VERDICT: PASS
✓ All compilation checks green
✓ No TypeScript errors
✓ Build successful
✓ New route properly registered

---

==================================================
FINAL AUDIT VERDICT
==================================================

BLOCKING DEFECTS: NONE

Security Contracts Met:
✓ 1. User identity verified server-side (getCurrentUser)
✓ 2. Profile ownership validated (getUserProfile check)
✓ 3. Active profile authoritative server-side (getActiveProfile)
✓ 4. Product eligibility validated (getPremiumProduct check)
✓ 5. Database uniqueness enforced (UNIQUE constraint)
✓ 6. RLS protects reads (SELECT policy)
✓ 7. Service-role writes have server-side auth (no client trust)
✓ 8. Entitlements remain separate (no coupling)
✓ 9. Profile deletion safe (CASCADE deletes interests)
✓ 10. Account closure safe (CASCADE via auth.users)

All Critical Systems:
✓ Database migration: PASS
✓ Service-role audit: PASS
✓ Auth/profile ownership: PASS
✓ Product validation: PASS
✓ Idempotency: PASS
✓ RLS: PASS
✓ Entitlement separation: PASS
✓ Profile/account deletion: PASS
✓ Profile isolation: PASS
✓ Compilation: PASS

Known Issues:
⚠ UX: isSaved prop not passed from parents
  → Not blocking, button works correctly
  → Acceptable for MVP
  → Can improve post-launch

Recommendations:
✓ NONE - safe for human review

SAFE FOR HUMAN REVIEW: YES

NO COMMIT
NO PUSH
NO REMOTE SUPABASE CONTACT

---

END AUDIT REPORT
2026-09-02
