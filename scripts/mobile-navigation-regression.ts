import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const shell = readFileSync("app/components/AppShell.tsx", "utf8");
const accountPage = readFileSync("app/account/page.tsx", "utf8");
const loginPage = readFileSync("app/auth/login/page.tsx", "utf8");
const mobileNavItems = shell.slice(
  shell.indexOf("const mobileNavItems"),
  shell.indexOf("function isActivePath"),
);
const mobileNavigation = shell.split('aria-label="모바일 네비게이션"')[1] ?? "";

for (const [label, href] of [
  ["내 분석", 'href: "/saju"'],
  ["추천", 'href: "/recommendations"'],
  ["심층", 'href: "/deep-analysis"'],
  ["관심", 'href: "/interests"'],
  ["구매", 'href: "/purchased-analyses"'],
  ["내 정보", 'href: "/mypage"'],
] as const) {
  assert(mobileNavItems.includes(href) && mobileNavItems.includes(`shortLabel: "${label}"`), `mobile navigation must expose ${label}`);
}

assert((mobileNavItems.match(/shortLabel:/g) ?? []).length === 6, "mobile navigation must contain exactly six direct destinations");
assert(mobileNavigation.includes("grid-cols-6") && !mobileNavigation.includes("grid-cols-5"), "mobile navigation must use one six-column row rather than a wrapping five-column grid");
assert(!mobileNavigation.includes("더보기") && !mobileNavigation.includes("More"), "mobile navigation must not hide destinations behind a More menu");
assert(shell.includes("min-h-[56px]"), "each mobile navigation item must retain a usable minimum touch height");
assert(shell.includes("env(safe-area-inset-bottom)") && shell.includes("pb-[calc(5.5rem+env(safe-area-inset-bottom))]"), "fixed navigation safe area and one-row content clearance must remain aligned");
assert(shell.includes('href === "/purchased-analyses" && pathname.startsWith("/paid-analysis/")'), "paid report routes must activate the purchased-analysis navigation item");
assert(shell.includes('href === "/mypage" && pathname.startsWith("/account")'), "account routes must activate the My Page navigation item");
assert(shell.includes("activeHref: item.href") && (shell.match(/isActivePath\(pathname, item\.activeHref\)/g) ?? []).length === 2, "navigation active state must use each item's original route rather than a profile-dependent fallback href");
assert(!shell.includes('href === "/checkout"'), "checkout must not receive a false primary mobile navigation active state");
assert(accountPage.includes('import AppShell from "@/app/components/AppShell";'), "/account must import the shared application shell");
assert((accountPage.match(/<AccountPageFrame>/g) ?? []).length === 3, "/account loading, error, and authenticated branches must render in the shared shell");
assert(accountPage.includes("function AccountPageFrame") && accountPage.includes("<AppShell>"), "/account must centralize its shell wrapper without a profile dependency");
assert(accountPage.includes('fetch("/api/account/status")') && accountPage.includes('router.push("/auth/login?returnTo=/account")'), "/account status fetch and authentication redirect must remain intact");
assert(!loginPage.includes("AppShell"), "/auth/login must remain a standalone authentication flow");

console.log("mobile-navigation-regression passed ✓");