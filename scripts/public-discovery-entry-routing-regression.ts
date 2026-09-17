import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const home = readFileSync("app/components/HomeExperience.tsx", "utf8");
const compatibility = readFileSync("app/special-analysis/compatibility/page.tsx", "utf8");
const romantic = readFileSync("app/special-analysis/compatibility/romantic/page.tsx", "utf8");
const family = readFileSync("app/special-analysis/compatibility/family/parent-child/page.tsx", "utf8");

const expectedHomeRoutes = [
  "/deep-analysis?category=relationship",
  "/deep-analysis?category=career",
  "/deep-analysis?category=money",
  "/deep-analysis?category=growth",
  "/deep-analysis?category=social",
  "/deep-analysis?mode=period",
];

for (const route of expectedHomeRoutes) {
  assert(home.includes(`href:"${route}"`), `home curiosity card must route into phase 2 discovery: ${route}`);
}

assert(home.includes("href={item.href}"), "home curiosity cards must use explicit discovery routes");
assert(!home.includes('item.label === "관계" ? "/special-analysis/compatibility"'), "general relationship question must not be hard-wired to compatibility");

assert(compatibility.includes("const activeProfile = user ? await getActiveProfile(user.id) : null;"), "compatibility catalog must support guest browsing");
assert(!compatibility.includes('redirect("/auth/login?returnTo=/special-analysis/compatibility")'), "compatibility catalog must not force login before browsing");
assert(compatibility.includes("로그인 없이 둘러보기 가능"), "compatibility catalog must explain public browsing");
assert(compatibility.includes("실제 분석을 시작할 때 로그인과 내 프로필이 필요합니다."), "compatibility catalog must explain the deferred login gate");
assert(compatibility.includes("activeProfile?.id"), "compatibility catalog must keep signed-in profile context optional");
assert(compatibility.includes("/special-analysis/compatibility/romantic"), "compatibility catalog must keep romantic product entry");
assert(compatibility.includes("/special-analysis/compatibility/family/parent-child#family-relationship-selector"), "compatibility catalog must keep family product entry");

assert(romantic.includes('redirect("/auth/login?returnTo=/special-analysis/compatibility/romantic")'), "romantic analysis start must still require login");
assert(family.includes('redirect("/auth/login?returnTo=/special-analysis/compatibility/family/parent-child")'), "family analysis start must still require login");

console.log("Public discovery entry routing regression passed ✓");
