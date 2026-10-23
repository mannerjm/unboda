import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("app/components/AppShell.tsx", "utf8");
const analysis = source.slice(source.indexOf("const analysisNavItems:"), source.indexOf("const managementNavItems:"));
const management = source.slice(source.indexOf("const managementNavItems:"), source.indexOf("const mobileNavItems:"));
const mobile = source.slice(source.indexOf("const mobileNavItems:"), source.indexOf("function isActivePath("));
const sidebar = source.slice(source.indexOf('<nav aria-label="메인 네비게이션">'), source.indexOf('<nav\n        aria-label="모바일 네비게이션"'));

const routes = [
  ["/today", "오늘의 운보다"],
  ["/saju", "내 분석"],
  ["/recommendations", "추천 분석"],
  ["/deep-analysis", "심층 분석"],
  ["/special-analysis", "전문 분석"],
  ["/interests", "관심 분석"],
  ["/purchased-analyses", "구매한 분석"],
  ["/ai-consulting", "AI 상담"],
];
let cursor = -1;
for (const [href, label] of routes) {
  const line = `href: "${href}", label: "${label}"`;
  const position = analysis.indexOf(line);
  assert(position > cursor, `analysis route must keep its original destination in the new order: ${line}`);
  cursor = position;
}
assert.equal((analysis.match(/href:/g) ?? []).length, 8, "exactly eight existing analysis routes, no duplicate compatibility menu");
assert.equal((management.match(/href:/g) ?? []).length, 2, "exactly two existing management routes");
for (const [href, label] of [["/mypage", "마이페이지"], ["/support", "고객지원 센터"]]) {
  assert(management.includes(`href: "${href}", label: "${label}"`));
}
for (const heading of ["매일 이용", "사주 · 분석", "나의 분석 · 상담", "계정 · 고객지원"]) {
  assert(sidebar.includes(heading), `sidebar group missing: ${heading}`);
}
assert(sidebar.includes('item.activeHref === "/saju" || item.activeHref === "/interests"'),
  "groups must start before discovery and interests rather than adding new routes");
assert(sidebar.includes('item.activeHref === "/ai-consulting"') && sidebar.includes("이어가기"),
  "existing AI consultation highlight and continue badge must remain");
assert(sidebar.includes('pathname === "/mypage" && isGuest === false && profileId') && sidebar.includes("AI 질문권"),
  "mypage AI credit balance must remain visible");
assert(source.includes("overflow-y-auto"), "longer grouped sidebar must remain scrollable on smaller desktop heights");
assert((mobile.match(/shortLabel:/g) ?? []).length === 7 &&
  source.includes("resolvedMobileNavItems.map((item)") && source.includes("grid-cols-7"),
  "existing seven-item mobile navigation must remain unchanged");
assert(source.includes('if (item.href === "/saju") return hasGuestResult ? "/guest-result" : "/guest-saju";') &&
  source.includes('return `/auth/login?returnTo=${encodeURIComponent(item.href)}&origin=${guestOrigin}`;'),
  "guest routing and authentication gates must remain unchanged");
assert(!analysis.includes('href: "/compatibility"'), "two-person compatibility stays inside existing professional analysis");
// The main landing and every app navigation surface share one exact mark.
const home = readFileSync("app/components/HomeExperience.tsx", "utf8");
const mark = readFileSync("app/components/BrandMark.tsx", "utf8");
assert(home.includes('import BrandMark from "./BrandMark";') && home.includes("<BrandMark />운보다"),
  "homepage must render the shared official logo");
assert(source.includes('import BrandMark from "@/app/components/BrandMark";'),
  "sidebar must import the same homepage logo");
assert.equal((source.match(/<BrandMark \/>운보다/g) ?? []).length, 2,
  "desktop sidebar and mobile header must both render the official logo");
assert(!source.includes("bg-[linear-gradient(135deg,#ff7f9f,#7b61ff)]"),
  "legacy sidebar-only circular placeholder must not return");
for (const part of [
  "bg-[linear-gradient(135deg,#ff6f61,#8a6dff)]",
  "border border-white/75",
  "translate-x-[7px] -translate-y-[7px]",
  "shadow-[0_0_10px_white]",
]) {
  assert(mark.includes(part), "official home mark must preserve its original geometry: " + part);
}
assert(!home.includes("function BrandMark()"),
  "homepage must not create a diverging brand mark");
console.log("sidebar-navigation-groups-regression: OK");
