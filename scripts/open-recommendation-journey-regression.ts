import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const shell = read("app/components/AppShell.tsx");
const recommendations = read("app/recommendations/page.tsx");
const recommendationCards = read("app/components/RecommendationTop3.tsx");
const result = read("app/result/page.tsx");
const guestResult = read("app/guest-result/page.tsx");
const completeGuest = read("app/auth/complete-guest-analysis/page.tsx");

assert(shell.includes('if (item.href === "/recommendations") return "/recommendations";'), "Guest recommendation nav must be public");
assert(shell.includes('item.activeHref !== "/recommendations"'), "Guest recommendation nav must not render a lock icon");
assert(!shell.includes('/auth/login?returnTo=/recommendations${guestContext'), "shell must not force login before recommendation discovery");

assert(!recommendations.includes('if (!user) redirect("/auth/login?returnTo=/recommendations")'), "recommendation page must not be auth-gated at entry");
assert(recommendations.includes("GUEST_ANALYSIS_COOKIE_NAME") && recommendations.includes("getGuestFreeAnalysis"), "Guest recommendation page must restore the server-backed Guest result");
assert(recommendations.includes('mode="guest"') && recommendations.includes("무료 사주를 먼저 보면 내 추천 분석이 열립니다"), "Guest without a free result must see the free-saju prerequisite state");
assert(recommendations.includes("getProfileFreeAnalysisFoundationStatus") && recommendations.includes("isFreeAnalysisFoundationReady"), "member recommendation readiness must follow current profile free-analysis state");
assert(recommendations.includes('"member-stale"') && recommendations.includes("출생 정보가 바뀌어 추천 기준을 다시 확인해야 합니다"), "changed birth data must require a fresh free-saju recommendation basis");
assert(recommendations.includes("guestMode") && recommendations.includes("paidSummaries={[]}"), "Guest with a valid result must receive the same recommendation presentation without member purchase state");

assert(recommendationCards.includes('fetch("/api/guest-free-analysis/intent"'), "Guest recommendation product selection must persist the exact selected product");
assert(recommendationCards.includes('/auth/login?returnTo=/auth/complete-guest-analysis&origin=guest-result'), "login boundary must occur only after Guest selects a paid analysis");
assert(completeGuest.includes('/checkout/${body.selectedProductId}?profileId=${body.resolvedProfileId}'), "Guest auth transfer must continue to checkout for the selected paid analysis");

assert(result.includes('providedResult ? "/recommendations"'), "Guest free result must open recommendations without login");
assert(!guestResult.includes('a[href="/auth/login?returnTo=/recommendations&origin=guest-result"]'), "obsolete hidden login-gated recommendation link styling must be removed");

console.log("open recommendation journey regression passed");
