import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

const layout = read("app/layout.tsx");
const shell = read("app/components/AppShell.tsx");
const guestSaju = read("app/guest-saju/page.tsx");
const guestLoading = read("app/guest-loading/page.tsx");
const memberLoading = read("app/loading/page.tsx");
const loadingVisual = read("app/components/MysticLoadingScreen.tsx");
const memberSaju = read("app/saju/page.tsx");
const result = read("app/result/page.tsx");
const recommendations = read("app/recommendations/page.tsx");
const deep = read("app/deep-analysis/page.tsx");
const login = read("app/auth/login/page.tsx");
const signup = read("app/auth/signup/page.tsx");
const compatibility = read("app/special-analysis/compatibility/page.tsx");
const paidDetail = read("app/paid-analysis/[productId]/page.tsx");
const checkout = read("app/checkout/[productId]/page.tsx");

assert(layout.includes('bg-[#f5f7fc]'), "root canvas must use the cool visual-system background");
assert(!layout.includes("#f7f3ea"), "root layout must not restore the legacy beige canvas");

for (const [name, source] of [
  ["AppShell", shell],
  ["guest free-saju", guestSaju],
  ["member free-saju", memberSaju],
  ["free result", result],
  ["recommendations", recommendations],
  ["deep analysis", deep],
  ["login", login],
  ["signup", signup],
  ["compatibility catalog", compatibility],
  ["paid detail", paidDetail],
  ["checkout", checkout],
] as const) {
  assert(!source.includes("#f7f3ea"), `${name} must not use the legacy beige page canvas`);
}

assert(shell.includes("linear-gradient(180deg,#091127_0%,#0d1530_58%,#15143a_100%)"), "desktop shell must use the Modern Mystic navy navigation");
assert(shell.includes('bg-[#6f5ce7]'), "mobile active navigation must use the violet brand accent");
assert(shell.includes('bg-[#f5f7fc]'), "shell content canvas must use cool white");

assert(guestSaju.includes("먼저, 나의 흐름부터"), "guest free-saju must use the renewed entry narrative");
assert(guestSaju.includes("무료로 내 흐름 보기"), "guest free-saju must keep the renewed primary CTA");
assert(guestSaju.includes('fetch("/api/guest-free-analysis/start"'), "guest free-saju runtime must remain unchanged");
assert(guestSaju.includes('router.push("/guest-loading")'), "guest free-saju must still enter the generation route");

assert(guestLoading.includes("MysticLoadingScreen"), "guest loading must use shared Modern Mystic loading");
assert(memberLoading.includes("MysticLoadingScreen"), "member loading must use shared Modern Mystic loading");
assert(loadingVisual.includes("당신의 흐름을 읽고 있어요."), "shared loading visual must explain the analysis state");
assert(loadingVisual.includes("사주 구조 확인") && loadingVisual.includes("현재 흐름 계산") && loadingVisual.includes("다음 질문 찾기"), "loading visual must show the three analysis stages");

assert(result.includes('bg-[#f5f7fc]'), "free result must use cool reading canvas");
assert(!result.includes("#f6f4ef"), "free result must not use the warm phase-3 canvas");
assert(result.includes("restoreStoredResult") && result.includes("calculateWeightedElements") && result.includes("calculateSeun"), "free-result calculation/restoration contracts must remain present");

assert(recommendations.includes('bg-[#f5f7fc]'), "recommendation page must use cool reading canvas");
assert(deep.includes('bg-[#f5f7fc]'), "deep-analysis discovery must use cool reading canvas");

assert(login.includes('bg-[#f5f7fc]') && signup.includes('bg-[#f5f7fc]'), "auth entry screens must use cool canvas");
assert(login.includes("signInWithPassword"), "login auth behavior must remain intact");
assert(signup.includes('fetch("/api/auth/signup"'), "signup behavior must remain intact");

assert(!compatibility.includes("#fbf6ed") && !compatibility.includes("#dfd3c1"), "compatibility catalog must not restore the old warm card palette");
assert(paidDetail.includes('bg-[#f5f7fc]'), "paid product detail must use cool canvas");
assert(checkout.includes('bg-[#f5f7fc]'), "checkout must use cool canvas");
assert(checkout.includes("js.tosspayments.com/v2/standard"), "Toss checkout integration must remain intact");

console.log("Visual system phase 3.5 regression passed ✓");
