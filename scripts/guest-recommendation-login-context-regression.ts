import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getSafeReturnTo } from "../app/lib/auth";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`✓ ${message}`);
}

const result = read("app/result/page.tsx");
const login = read("app/auth/login/page.tsx");
const signup = read("app/auth/signup/page.tsx");
const completeGuestAnalysis = read("app/auth/complete-guest-analysis/page.tsx");
const shell = read("app/components/AppShell.tsx");
const myPage = read("app/mypage/page.tsx");

assert(result.includes("providedResult ? \"/auth/login?returnTo=/recommendations&origin=guest-result\""), "Guest recommendation CTA preserves its established Guest origin and member destination");
assert(result.includes("더 깊이 보고 싶은 흐름을 살펴보세요") && result.includes("무료 결과는 로그인 없이 계속 확인할 수 있어요.") && result.includes("로그인하면 분석을 저장하고 이어서 관리할 수 있습니다."), "Guest result exposes the final concise continuation copy");
assert(result.includes("로그인 / 회원가입") && result.includes("providedResult ?"), "Guest result exposes one restrained account continuation action");
assert(login.includes('searchParams.get("origin") === "guest-result"') && login.includes('backHref = isGuestResultOrigin || isGuestResultNavigationOrigin ? "/guest-result" : isGuestNavigationOrigin ? "/guest-saju" : getSafeReturnTo(returnTo, "/")'), "login back destination is Guest-aware and falls back to home instead of /result");
assert(login.includes("isGuestResultOrigin || isGuestResultNavigationOrigin || isGuestNavigationOrigin"), "all valid Guest-result login contexts use Guest-specific copy");
assert(login.includes("추천 심층 분석을 확인하려면 로그인해 주세요."), "Guest-origin login uses recommendation context copy");
assert(login.includes('postLoginReturnTo = isGuestRecommendationContinuation') && login.includes('"/auth/complete-guest-analysis?next=recommendations"') && login.includes("router.push(postLoginReturnTo)"), "Guest recommendation login transfers the Guest result before opening member recommendations");
assert(login.includes("origin=${encodeURIComponent(origin)}"), "login preserves Guest origin when handing off to signup");
assert(signup.includes('origin === "guest-result" || origin === "guest-result-navigation" ? "/guest-result" : origin === "guest-navigation" ? "/guest-saju" : getSafeReturnTo(returnTo, "/")'), "signup preserves Guest-origin back behavior and falls back to home instead of /result");
assert(signup.includes('postSignupReturnTo = isGuestRecommendationContinuation') && signup.includes('returnTo: postSignupReturnTo') && signup.includes("router.push(postSignupReturnTo)"), "Guest recommendation signup preserves transfer continuation through email confirmation and immediate completion");
assert(signup.includes("origin=${encodeURIComponent(origin)}"), "signup preserves Guest origin when returning to login");
assert(completeGuestAnalysis.includes('searchParams.get("next")') && completeGuestAnalysis.includes('next === "recommendations"') && completeGuestAnalysis.includes('`/recommendations?profileId=${body.resolvedProfileId}`'), "Guest transfer can continue directly to recommendations for the transferred profile");
assert(completeGuestAnalysis.includes('body.transferStatus === "pending_existing_result"') && completeGuestAnalysis.includes('router.replace("/saju")'), "Guest transfer still avoids empty recommendations while an existing member result is generating");
assert(shell.includes("hasGuestResult") && shell.includes('item.href === "/saju"') && shell.includes('hasGuestResult ? "/guest-result" : "/guest-saju"'), "Guest 내 분석 selects result when available and Guest entry otherwise");
assert(shell.includes('item.href === "/deep-analysis"') && shell.includes('return "/deep-analysis"'), "Guest deep-analysis navigation remains public");
assert(shell.includes('item.activeHref !== "/saju"') && shell.includes('item.activeHref !== "/deep-analysis"'), "Guest lock treatment excludes public Guest analysis destinations");
assert(shell.includes('origin=${guestOrigin}') && shell.includes('item.href)}&origin'), "confirmed Guest member-only navigation uses safe login boundaries");
assert(shell.includes('guestOrigin = guestContext ? "guest-result-navigation" : "guest-navigation"'), "valid Guest-result navigation uses a result-preserving origin");
assert(shell.includes('useState<boolean | null>(pathname === "/mypage" ? false : null)') && shell.includes("My Page mounts AppShell only after its authenticated account-status gate succeeds"), "authenticated My Page navigation keeps its known member state");
assert(shell.includes("response.status === 401") && shell.includes("A transient server failure is not proof that the browser session is signed out"), "only an authoritative 401 response downgrades shared navigation to Guest");
assert(shell.includes("Keep auth unresolved on network errors") && shell.includes("setIsGuest(null)"), "network and transient account-status failures do not manufacture a signed-out state");
assert(shell.includes('const recommendationHref = isGuest === true') && shell.includes(': "/recommendations";'), "unresolved recommendation navigation uses the canonical protected route instead of a login URL");
assert(shell.includes('if (isGuest === true)') && shell.includes("While auth is unresolved, use canonical destinations instead of manufacturing a login URL"), "only confirmed Guests receive Guest login destinations");
assert(shell.includes('fetch("/api/account/status")') && shell.includes('fetch("/api/guest-free-analysis")'), "navigation derives confirmed Guest state from existing server-backed endpoints");
assert(myPage.includes('fetch("/api/account/status")') && myPage.includes('router.replace("/auth/login?returnTo=/mypage&origin=guest-navigation")') && myPage.includes("!isAuthChecked"), "direct Guest My Page access has a deterministic login gate");
assert(getSafeReturnTo("/recommendations") === "/recommendations" && getSafeReturnTo("/guest-result") === "/guest-result", "context destinations remain safe internal paths");

console.log("guest-recommendation-login-context-regression passed ✓");
