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
const shell = read("app/components/AppShell.tsx");
const myPage = read("app/mypage/page.tsx");

assert(result.includes("providedResult ? \"/auth/login?returnTo=/recommendations&origin=guest-result\""), "Guest recommendation CTA preserves its established Guest origin and member destination");
assert(result.includes("더 깊이 보고 싶은 흐름을 살펴보세요") && result.includes("무료 결과는 로그인 없이 계속 확인할 수 있어요.") && result.includes("로그인하면 분석을 저장하고 이어서 관리할 수 있습니다."), "Guest result exposes the final concise continuation copy");
assert(result.includes("로그인 / 회원가입") && result.includes("providedResult ?"), "Guest result exposes one restrained account continuation action");
assert(login.includes('searchParams.get("origin") === "guest-result"') && login.includes('backHref = isGuestResultOrigin || isGuestResultNavigationOrigin ? "/guest-result" : isGuestNavigationOrigin ? "/guest-saju" : "/result"'), "login back destination is Guest-aware without changing direct login");
assert(login.includes("isGuestResultOrigin || isGuestResultNavigationOrigin || isGuestNavigationOrigin"), "all valid Guest-result login contexts use Guest-specific copy");
assert(login.includes("추천 심층 분석을 확인하려면 로그인해 주세요."), "Guest-origin login uses recommendation context copy");
assert(login.includes("origin=${encodeURIComponent(origin)}"), "login preserves Guest origin when handing off to signup");
assert(signup.includes('origin === "guest-result" || origin === "guest-result-navigation" ? "/guest-result" : origin === "guest-navigation" ? "/guest-saju" : "/result"'), "signup preserves Guest-origin back behavior");
assert(signup.includes("origin=${encodeURIComponent(origin)}"), "signup preserves Guest origin when returning to login");
assert(shell.includes("hasGuestResult") && shell.includes('item.href === "/saju"') && shell.includes('hasGuestResult ? "/guest-result" : "/guest-saju"'), "Guest 내 분석 selects result when available and Guest entry otherwise");
assert(shell.includes('item.href === "/deep-analysis"') && shell.includes('return "/deep-analysis"'), "Guest deep-analysis navigation remains public");
assert(shell.includes('item.activeHref !== "/saju"') && shell.includes('item.activeHref !== "/deep-analysis"'), "Guest lock treatment excludes public Guest analysis destinations");
assert(shell.includes('origin=${guestOrigin}') && shell.includes('item.href)}&origin'), "Guest member-only navigation uses safe login boundaries");
assert(shell.includes('guestOrigin = guestContext ? "guest-result-navigation" : "guest-navigation"'), "valid Guest-result navigation uses a result-preserving origin");
assert(shell.includes("isGuest !== false") && shell.includes("isGuest === false"), "unresolved navigation state fails closed to Guest-safe destinations");
assert(shell.includes('fetch("/api/account/status")') && shell.includes('fetch("/api/guest-free-analysis")'), "navigation derives Guest state from existing server-backed endpoints");
assert(myPage.includes('fetch("/api/account/status")') && myPage.includes('router.replace("/auth/login?returnTo=/mypage&origin=guest-navigation")') && myPage.includes("!isAuthChecked"), "direct Guest My Page access has a deterministic login gate");
assert(getSafeReturnTo("/recommendations") === "/recommendations" && getSafeReturnTo("/guest-result") === "/guest-result", "context destinations remain safe internal paths");

console.log("guest-recommendation-login-context-regression passed ✓");