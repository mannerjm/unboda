import { readFileSync } from "fs";
import { join } from "path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf-8");
}

const migration = read("supabase/migrations/006_active_profiles.sql");
const activeRoute = read("app/api/profiles/active/route.ts");
const activeServer = read("app/lib/profiles/activeServer.ts");
const myPage = read("app/mypage/page.tsx");
const sajuPage = read("app/saju/page.tsx");
const loadingPage = read("app/loading/page.tsx");
const analyzeRoute = read("app/api/analyze/route.ts");
const resultPage = read("app/result/page.tsx");
const paidPage = read("app/paid-analysis/[productId]/page.tsx");
const checkoutPage = read("app/checkout/[productId]/page.tsx");

assert(migration.includes("create table if not exists public.active_profiles"), "active profile migration must create server-backed selection table");
assert(migration.includes("user_id uuid primary key") && migration.includes("profile_id uuid not null"), "active profile must be one verified target per user");
assert(activeServer.includes("getUserProfile(profileId, userId)"), "active profile change must verify ownership");
assert(activeRoute.includes("getCurrentUser") && activeRoute.includes("setActiveProfile"), "active profile API must be authenticated and server-backed");
assert(myPage.includes('fetch("/api/profiles/active")') && myPage.includes('method: "PUT"'), "mypage must be the active profile switcher");
console.log("1. active Profile is server-backed and changed from mypage ✓");

assert(sajuPage.includes('fetch("/api/profiles/active")'), "saju page must start from active Profile");
assert(sajuPage.includes("/api/free-analysis/${activeProfile.id}"), "saju must check the server-backed free result before generation");
assert(sajuPage.includes("/result?profileId=${activeProfile.id}") && sajuPage.includes("/loading?profileId=${activeProfile.id}"), "saju must route cache hits to result and cache misses to loading with the active Profile");
assert(!sajuPage.includes('type="time"') && !sajuPage.includes('type="text"\n  value={birthDate}'), "saju must not accept alternate birth input during active profile flow");
assert(loadingPage.includes("JSON.stringify({ profileId })"), "loading must request analysis by profileId only");
assert(analyzeRoute.includes("getUserProfile(body.profileId, user.id)"), "analyze API must verify Profile ownership");
assert(analyzeRoute.includes("birthDate = profile.birthDate") && analyzeRoute.includes("birthTime = profile.birthTime"), "analyze API must derive birth data from Profile");
assert(!analyzeRoute.includes("if (body.profileId !== undefined)"), "analyze API must not retain a client birth-data fallback");
console.log("2. free analysis derives birth data from the active verified Profile ✓");

assert(resultPage.includes("currentProfileId = searchParams.get(\"profileId\")"), "result must retain active profileId context");
assert(resultPage.includes("setProfileSelectionProductId(productId)"), "result must use active context without direct profile-less paid navigation");
assert(!paidPage.includes("ProfileSelector") && !checkoutPage.includes("ProfileSelector"), "paid-analysis and checkout must not expose intermediate profile selectors");
assert(!paidPage.includes("ProfileTargetControl") && !checkoutPage.includes("ProfileTargetControl"), "paid-analysis and checkout must not expose target-change controls");
assert(paidPage.includes("getUserProfile(profileId, user.id)") && checkoutPage.includes("getUserProfile(profileId, user.id)"), "paid-analysis and checkout must preserve server ownership checks");
console.log("3. result to paid flow preserves active profile context without mid-flow switching ✓");

console.log("\nactive-profile-flow-regression passed ✓");
