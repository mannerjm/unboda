import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Pure structural smoke check: keep security and purchase invariants identical
// while running unrelated read-only queries concurrently.
const home = readFileSync("app/page.tsx", "utf8");
const library = readFileSync("app/purchased-analyses/page.tsx", "utf8");
const middleware = readFileSync("middleware.ts", "utf8");

assert(home.includes("const user = await getCurrentUser();"), "home still verifies logged-in user");
assert(home.includes("if (!user) return { kind: \"guest\" }"), "anonymous home unchanged");
assert(home.includes("Promise.all([\n    listUserProfiles(user.id),\n    getActiveProfile(user.id).then("), "independent home reads parallel");
assert(home.includes('if (profiles.length === 0) return { kind: "no_profiles" }'), "no-profile gate retained");
assert(home.includes("if (!activeProfileResult.ok) throw activeProfileResult.error"), "active-profile error still propagates for account holders");
assert(home.includes('if (!activeProfile) return { kind: "needs_profile_selection" }'), "active selection gate retained");
assert(home.includes("resolveProfileFreeAnalysisStatus(activeProfile, summaries, createEvaluationContext())"), "free result freshness rules unchanged");
assert(home.includes("resolveCustomerStage(user.id, activeProfile.id)"), "paid and consulting stage logic preserved");

assert(library.includes("const user = await getCurrentUser();"), "library still authenticates");
assert(library.includes('redirect("/auth/login?returnTo=/purchased-analyses")'), "library login redirect retained");
assert(library.includes("if (!activeProfile)"), "active profile required");
assert(library.includes("const [paidSummaries, expiredReportsResult] = await Promise.all(["), "purchase and expiry reads parallel");
assert(library.includes('listUserPaidAnalysisSummaries(user.id)'), "purchase history still user scoped");
assert(library.includes('.eq("user_id", user.id).eq("profile_id", activeProfile.id)'), "expired entitlements still tenant/profile scoped");
assert(library.includes('.eq("resource_type", "paid_analysis").eq("is_active", true)'), "entitlement type/activity unchanged");
assert(library.includes('if (expiredReportsError) throw new Error("EXPIRED_REPORT_LIBRARY_READ_FAILED")'), "expired report failure unchanged");
assert(library.includes('const groups = groupPurchasedAnalysesByProduct(analyses)'), "grouping retained");

assert(middleware.includes("await supabase.auth.getClaims()"), "auth session refresh preserved");
for (const source of [home, library]) {
  assert(!source.includes("unstable_cache("), "personal pages must not gain shared caches");
  assert(!source.includes("revalidateTag("), "personal pages must not change cache invalidation");
}
console.log("navigation read-only performance regression: PASS");
