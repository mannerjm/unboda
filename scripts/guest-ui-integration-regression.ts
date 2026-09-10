import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const rootPage = read("app/page.tsx");
const guestSaju = read("app/guest-saju/page.tsx");
const guestResult = read("app/guest-result/page.tsx");
const completePage = read("app/auth/complete-guest-analysis/page.tsx");
const transferRoute = read("app/api/guest-free-analysis/transfer/route.ts");
const sajuPage = read("app/saju/page.tsx");
const resultPage = read("app/result/page.tsx");
const checkoutPage = read("app/checkout/[productId]/page.tsx");

assert(rootPage.includes("getCurrentUser") && rootPage.includes('href="/guest-saju"'), "root must use server session state and route guests to guest-saju");
assert(rootPage.includes("무료 사주 시작하기") && rootPage.includes("로그인") && rootPage.includes("회원가입"), "guest root must expose free, login, and signup CTAs");
assert(rootPage.includes("내 프로필로 사주 조회하기") && rootPage.includes('href="/mypage"'), "authenticated root must expose Profile and mypage CTAs");
assert(rootPage.includes("/auth/login?returnTo=/") && rootPage.includes("/auth/signup?returnTo=/"), "root auth CTAs must use safe root returnTo");
console.log("1. root guest and authenticated CTAs present ✓");

assert(guestSaju.includes("POST") && guestSaju.includes('fetch("/api/guest-free-analysis/start"'), "guest form must submit only to the guest server API");
assert(guestSaju.includes("label") && guestSaju.includes("relationshipType") && guestSaju.includes("birthDate") && guestSaju.includes("birthTime") && guestSaju.includes("calendarType") && guestSaju.includes("isLeapMonth"), "guest form must collect the complete Profile input contract");
assert(!guestSaju.includes("/api/profiles") && !guestSaju.includes("/api/analyze"), "guest form must not use authenticated Profile or analyze APIs");
assert(!guestSaju.includes("localStorage") && !guestSaju.includes("sessionStorage"), "guest form must not persist birth input in browser storage");
assert(guestSaju.includes("GUEST_BIRTH_DATE_MIN") && guestSaju.includes("getGuestBirthDateMax"), "guest form must constrain birth year with canonical date bounds");
assert(guestSaju.includes('fetch("/api/guest-free-analysis/start"') && guestSaju.includes('router.push("/guest-loading")'), "guest form must start a server-backed analysis before entering guest loading");
console.log("2. guest free-analysis submit stays server-backed ✓");

assert(guestResult.includes('fetch("/api/guest-free-analysis")'), "guest result must restore only through the guest server API");
assert(guestResult.includes("ResultPageContent") && guestResult.includes("ResultViewerContext.Provider"), "guest result must reuse the exact authenticated result renderer");
assert(guestResult.includes('fetch("/api/guest-free-analysis/intent"') && guestResult.includes("onProductSelected"), "guest paid selection must save intent through the guest API from the shared recommendation cards");
assert(guestResult.includes("/auth/login?returnTo=/auth/complete-guest-analysis") && guestResult.includes("/auth/signup?returnTo=/auth/complete-guest-analysis"), "guest auth CTAs must return to transfer completion without product or birth query data");
assert(!guestResult.includes("ProfileSelector") && !guestResult.includes("localStorage") && !guestResult.includes("sessionStorage"), "guest result must not use ProfileSelector or browser analysis storage");
console.log("3. guest result restore, paid intent, and auth return flow present ✓");

assert(completePage.includes('fetch("/api/guest-free-analysis/transfer"') && completePage.includes("router.replace"), "auth completion must call server transfer then navigate");
assert(completePage.includes("/checkout/${body.selectedProductId}?profileId=${body.resolvedProfileId}") && completePage.includes("/result?profileId=${body.resolvedProfileId}"), "transfer completion must route to checkout or resolved Profile result");
assert(completePage.includes("pending_existing_result") && completePage.includes('"/saju"'), "pending existing results must respect authenticated generation without new guest AI work");
assert(completePage.includes("SELF_PROFILE_CONFLICT") && completePage.includes("등록된 본인 정보와 입력한 정보가 다릅니다."), "self Profile mismatch must stay user-visible without automatic overwrite");
assert(completePage.includes("마이페이지에서 기존 정보를 확인한 후 직접 변경해 주세요.") && completePage.includes('href="/mypage"'), "self Profile mismatch must guide correction through My Page");
assert(!completePage.includes("guest 관계 변경 API") && !completePage.includes('["배우자", "자녀", "부모", "형제자매", "기타"]'), "developer-only relationship-change placeholder must not be shown to users");
assert(completePage.includes("PROFILE_LIMIT_REACHED") && completePage.includes("프로필은 계정당 최대 10명까지 관리할 수 있습니다."), "guest transfer must explain the account Profile limit");
assert(transferRoute.includes("PROFILE_LIMIT_REACHED") && transferRoute.includes("transferErrorCode"), "transfer route must preserve typed Profile-limit blockers");
console.log("4. auth completion transfer, checkout, pending, and safe Profile blocker guidance present ✓");

assert(!sajuPage.includes("guest-free-analysis") && !resultPage.includes("guest-free-analysis") && !checkoutPage.includes("guest-free-analysis"), "authenticated saju, result, and checkout flows must stay independent from guest APIs");
console.log("5. existing authenticated Profile flow remains separated ✓");

console.log("\nguest-ui-integration-regression passed ✓");
