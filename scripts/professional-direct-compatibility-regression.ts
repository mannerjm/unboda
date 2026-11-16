import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shell = readFileSync("app/components/AppShell.tsx", "utf8");
const entry = readFileSync("app/special-analysis/page.tsx", "utf8");
const catalog = readFileSync("app/special-analysis/compatibility/page.tsx", "utf8");
const family = readFileSync("app/special-analysis/compatibility/family/parent-child/page.tsx", "utf8");

// Parent keeps its stable nav identifier so active styles and submenu still work.
assert(shell.includes('{ href: "/special-analysis", label: "전문 분석"'));
assert(shell.includes('{ href: "/special-analysis", label: "전문 분석", shortLabel: "전문"'));
assert.equal(
  shell.split('if (item.href === "/special-analysis") return "/special-analysis/compatibility";').length - 1,
  2,
  "Desktop/mobile and guest/signed-in links must open the same public catalog directly",
);
assert(shell.includes('activeHref: item.href'), "Keep original nav key for active state");
assert(shell.includes('href="/special-analysis/compatibility"') && shell.includes('aria-label="전문 분석 하위 메뉴"'));
assert(shell.includes('pathname.startsWith("/special-analysis/compatibility") ? "page"'),
  "Opening parent must activate 궁합 submenu");

// Preserve direct URLs to the old intro screen without showing a second purchase hub.
assert(entry.includes('redirect("/special-analysis/compatibility")'));
assert(!entry.includes("<AppShell") && !entry.includes("궁합 유형 선택하기"),
  "Intermediate hub must no longer be rendered");

// Actual five-card public listing, login boundary, family selector and price remain.
assert(catalog.includes("compatibilityCards.map"));
assert(catalog.includes("PREMIUM_PRODUCT_PHOTOS"));
assert(catalog.includes("로그인 없이 둘러보기 가능"));
for (const href of [
  "/special-analysis/compatibility/romantic",
  "/special-analysis/compatibility/family/parent-child#family-relationship-selector",
  "/special-analysis/compatibility/workplace",
  "/special-analysis/compatibility/friend",
  "/special-analysis/compatibility/business",
]) assert(catalog.includes(href), "Existing compatibility product destination changed: " + href);
assert(catalog.includes('product.amount.toLocaleString("ko-KR")'));
assert(family.includes("FamilyCompatibilityAnalysisClient"));
console.log("professional-direct-compatibility-regression: PASS");
