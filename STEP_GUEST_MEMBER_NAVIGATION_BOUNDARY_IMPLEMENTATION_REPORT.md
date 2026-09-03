# Guest/Member Navigation Boundary Implementation Report

## 1. Final Access Matrix

| Item | Guest | Authenticated member |
|---|---|---|
| 내 분석 | `/guest-result` when `/api/guest-free-analysis` confirms a valid result; otherwise `/guest-saju` | `/saju` |
| 추천 분석 | `/auth/login?returnTo=/recommendations&origin=guest-result` when Guest result exists; otherwise `origin=guest-navigation` | `/recommendations` with existing profile-qualified behavior |
| 심층 분석 | Public `/deep-analysis`; catalog browsing remains available | `/deep-analysis` with existing optional profile context |
| 관심 분석 | `/auth/login?returnTo=/interests&origin=guest-navigation` | `/interests` |
| 구매한 분석 | `/auth/login?returnTo=/purchased-analyses&origin=guest-navigation` | `/purchased-analyses` |
| 마이페이지 | `/auth/login?returnTo=/mypage&origin=guest-navigation` | `/mypage` |

## 2. Exact Files Changed

- `app/components/AppShell.tsx`
- `app/auth/login/page.tsx`
- `app/auth/signup/page.tsx`
- `app/mypage/page.tsx`
- `scripts/guest-recommendation-login-context-regression.ts`
- `STEP_GUEST_MEMBER_NAVIGATION_BOUNDARY_IMPLEMENTATION_REPORT.md`

No Guest analysis, transfer, retention, recommendation algorithm, payment, eligibility, database, migration, or account-closure logic changed.

## 3. Guest/Sidebar Visual Treatment

`AppShell` keeps all six navigation concepts visible for Guests rather than hiding locked destinations. Member-only items receive one restrained lock icon convention and remain clickable. `내 분석` and `심층 분석` do not receive the lock indicator because they are Guest-accessible in the approved matrix.

The shell keeps the existing authenticated desktop/mobile member navigation architecture. Guest-aware href rewriting occurs only after the existing server-backed status/result probes settle.

## 4. Exact Guest Routes

`AppShell.tsx` now maps:

- `내 분석`: `/guest-result` if `/api/guest-free-analysis` is available; `/guest-saju` otherwise.
- `추천 분석`: `/auth/login?returnTo=/recommendations` plus `origin=guest-result` when a valid Guest result exists, or `origin=guest-navigation` otherwise.
- `심층 분석`: `/deep-analysis`.
- `관심 분석`: `/auth/login?returnTo=/interests&origin=guest-navigation`.
- `구매한 분석`: `/auth/login?returnTo=/purchased-analyses&origin=guest-navigation`.
- `마이페이지`: `/auth/login?returnTo=/mypage&origin=guest-navigation`.

The Guest result availability check uses the existing server-backed `/api/guest-free-analysis` endpoint and does not expose or copy the HttpOnly credential.

## 5. Exact Member Routes

When the status probe confirms an authenticated user, the existing member destinations remain:

- `/saju`
- `/recommendations` or `/recommendations?profileId=...`
- `/deep-analysis` or `/deep-analysis?profileId=...`
- `/interests`
- `/purchased-analyses`
- `/mypage`

The existing `activeProfileId` and profile-qualified recommendation/deep-analysis href behavior remains intact.

## 6. Guest-Result Fallback Behavior

A valid Guest result is not converted into a member profile. `내 분석` points to `/guest-result` only when the existing Guest endpoint reports availability. Without a valid result, the safest existing Guest entry route is `/guest-saju`, never `/saju` or direct member `/result`.

The Guest free result remains available before signup, and the existing Guest transfer route is unchanged.

## 7. Login Context Handling

`app/auth/login/page.tsx` now distinguishes:

- `origin=guest-result`: Back -> `/guest-result`; recommendation copy -> `추천 심층 분석을 확인하려면 로그인해 주세요.`
- `origin=guest-navigation`: Back -> `/guest-saju`; copy is selected from the safe destination:
  - `/recommendations`: `추천 심층 분석을 확인하려면 로그인해 주세요.`
  - `/interests`: `관심 분석을 저장하고 관리하려면 로그인해 주세요.`
  - `/purchased-analyses`: `구매한 분석을 확인하려면 로그인해 주세요.`
  - `/mypage`: `마이페이지를 이용하려면 로그인해 주세요.`
- no origin: existing direct-login behavior and purchase-related copy remain unchanged.

The login page forwards the validated origin to signup. Signup back/cancel and signup-to-login handoff preserve `guest-result` and `guest-navigation` contexts.

## 8. Safe returnTo Handling

All generated destinations are bounded known internal paths. Existing `getSafeReturnTo()` remains the authority for user-provided return paths (`app/lib/auth.ts`). The implementation adds only fixed route strings and fixed origin values; no arbitrary URL is accepted or constructed.

## 9. Guest Result CTA Contract

The existing result CTA remains unchanged:

- `나에게 추천된 심층 분석 보기`: member-only recommendation path; Guest-result context preserves `/auth/login?returnTo=/recommendations&origin=guest-result`.
- `원하는 심층 분석 직접 찾기`: existing `/deep-analysis?profileId=...` path and public catalog behavior remain unchanged.

The Guest result remains full and readable before either action.

## 10. Regression Results

- `scripts/guest-recommendation-login-context-regression.ts` — PASS.
- `scripts/auth-phase3a-regression.ts` — PASS.
- `scripts/navigation-contract-regression.ts` — PASS.
- `scripts/guest-free-analysis-server-regression.ts` — PASS.
- `scripts/guest-free-analysis-transfer-regression.ts` — PASS.
- `scripts/guest-free-analysis-revisit-regression.ts` — PASS.
- `scripts/account-lifecycle-foundation-regression.ts` — PASS.
- `scripts/paid-purchase-eligibility-boundary-regression.ts` — PASS.
- TypeScript — PASS.
- Production build — PASS after stopping workspace Next processes and removing only `.next`.
- `git diff --check` — PASS.

Known unrelated status:

- `scripts/guest-ui-integration-regression.ts` remains a stale regression with its known root-page expectation; it was not changed.
- Repository lint remains informationally affected by unrelated baseline/generated-content issues.

## 11. Live Verification

A live Guest shell check at `/deep-analysis` settled to:

- `내 분석` -> `/guest-saju` when no valid Guest result was present.
- `추천` -> `/auth/login?returnTo=/recommendations&origin=guest-navigation`.
- `심층` -> `/deep-analysis`.
- `관심` -> `/auth/login?returnTo=%2Finterests&origin=guest-navigation`.
- `구매` -> `/auth/login?returnTo=%2Fpurchased-analyses&origin=guest-navigation`.
- `내 정보` -> `/auth/login?returnTo=%2Fmypage&origin=guest-navigation`.

Direct `/mypage` verification showed an auth-check state first, then redirected to `/auth/login?returnTo=/mypage&origin=guest-navigation` with `마이페이지를 이용하려면 로그인해 주세요.` The member My Page content was not rendered for the Guest.

## 12. Working-Tree Inventory

`git status --short` shows the intended modified navigation/auth/page files plus pre-existing untracked reports, logs, and artifacts from prior steps. No files were staged. No commit or push occurred.

## 13. PASS / NEEDS WORK Recommendation

**PASS — Guest/member navigation boundary implementation complete.** The current route matrix is enforced at the shared navigation boundary, Guest result availability is respected, deep-analysis remains public, member-only destinations use deterministic login boundaries, and the existing Guest-origin recommendation flow remains intact.

## 14. Explicit Non-Goals Preserved

- No Guest result gating.
- No Guest profile fabrication.
- No Guest transfer changes.
- No recommendation algorithm changes.
- No payment or `VERIFIED_ADULT` changes.
- No database or migration changes.
- No global AppShell removal or authenticated member IA redesign.

**END REPORT**

## Final Guest-Result Context Correction

The valid Guest-result case now uses `origin=guest-result-navigation` for every locked member destination, not only recommendations. This fixes the previous My Page/back-chain regression:

- valid Guest result -> `/auth/login?returnTo=/mypage&origin=guest-result-navigation` -> `/guest-result` on Back;
- valid Guest result -> `/auth/login?returnTo=/interests&origin=guest-result-navigation` -> `/guest-result` on Back;
- valid Guest result -> `/auth/login?returnTo=/purchased-analyses&origin=guest-result-navigation` -> `/guest-result` on Back;
- valid Guest result -> `/auth/login?returnTo=/recommendations&origin=guest-result-navigation` for shared navigation, while the existing Guest-result recommendation CTA retains its exact `origin=guest-result` contract;
- no valid Guest result -> `origin=guest-navigation` -> `/guest-saju` fallback.

`app/auth/login/page.tsx` recognizes both result-origin values for Guest-specific copy/back behavior. `app/auth/signup/page.tsx` preserves both through signup and maps them back to `/guest-result`. The AppShell search field `원하는 분석을 찾아보세요` was removed without changing the `현재 분석 서비스` status element.

Fresh final validation: focused Guest/member regression PASS, Auth PASS, navigation contract PASS, Guest server/transfer/revisit PASS, account lifecycle PASS, paid eligibility PASS, TypeScript PASS, production build PASS, and `git diff --check` PASS. No commit, push, or staging occurred.

## Guest Re-analysis Routing Correction

The shared `ResultPageContent` re-analysis control previously always called `router.push("/saju")`. Because `app/guest-result/page.tsx` supplies `ResultViewerContext`, this sent Guest users into the member profile-dependent screen. The control now calls `router.push(providedResult ? "/guest-saju" : "/saju")` (`app/result/page.tsx`). Guest revisit, Guest server, and transfer regressions pass; authenticated member re-analysis remains `/saju`.

## Final UX Correction

The first valid-result context fix used `origin=guest-navigation` for the generic locked-item path, which correctly fell back to `/guest-saju` but lost a valid Guest-result context for My Page and the other locked items. The current implementation uses `origin=guest-result-navigation` whenever the existing Guest-result probe succeeds. Login and signup preserve that origin and return to `/guest-result`; no-result Guests continue to use `origin=guest-navigation` and `/guest-saju`.

The AppShell desktop utility header containing `원하는 분석을 찾아보세요` and `현재 분석 서비스` was removed. The sidebar, mobile navigation, locked-item indicators, real member destinations, Guest free-result behavior, and all product logic remain unchanged.

Live checks confirmed no-result Guest navigation: `내 분석` -> `/guest-saju`, `심층` -> `/deep-analysis`, and locked destinations -> safe login boundaries. Direct Guest `/mypage` checks auth before rendering member content. Fresh focused navigation, Auth, navigation contract, Guest, account, paid, TypeScript, production build, and `git diff --check` validations pass.

## Current Implementation Delta

The implementation was subsequently corrected for valid Guest-result context and the AppShell search-field removal:

- `app/components/AppShell.tsx`: valid Guest-result navigation now uses `origin=guest-result-navigation`; no-result Guest navigation uses `origin=guest-navigation`. The desktop `원하는 분석을 찾아보세요` search field was removed; `현재 분석 서비스` remains.
- `app/auth/login/page.tsx`: `guest-result-navigation` returns Back to `/guest-result`; `guest-navigation` falls back to `/guest-saju`; direct login remains `/result`.
- `app/auth/signup/page.tsx`: preserves both Guest origin variants through signup and returns valid-result context to `/guest-result`.
- `scripts/guest-recommendation-login-context-regression.ts`: covers the new valid-result origin and lock treatment.
- `app/mypage/page.tsx`: direct Guest entry performs an auth check before rendering member content and redirects to `/auth/login?returnTo=/mypage&origin=guest-navigation`.

The current live Guest shell after the status/result probes confirms:

- no valid Guest result: `내 분석` -> `/guest-saju`;
- valid Guest result: `내 분석` -> `/guest-result` and locked member items use `origin=guest-result-navigation`;
- `심층` -> `/deep-analysis` without login;
- member-only items use bounded login destinations;
- the desktop AppShell search field is absent while the current-service status remains.

Fresh validation after this delta: focused Guest/member navigation regression PASS, Auth PASS, navigation contract PASS, Guest server/transfer/revisit PASS, account lifecycle PASS, paid eligibility PASS, TypeScript PASS, production build PASS, and `git diff --check` PASS. No commit, push, or staging occurred.
