import { readFileSync } from "node:fs";
import { join } from "node:path";
import { profileDeleteBlockMessages } from "../app/lib/profiles/types";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const itemRoute = read("app/api/profiles/[profileId]/route.ts");
const activeRoute = read("app/api/profiles/active/route.ts");
const summaryRoute = read("app/api/mypage/summary/route.ts");
const profileServer = read("app/lib/profiles/server.ts");
const activeServer = read("app/lib/profiles/activeServer.ts");
const myPage = read("app/mypage/page.tsx");
const freeAnalysisMigration = read("supabase/migrations/008_free_analysis_results.sql");

const deleteHandler = itemRoute.slice(itemRoute.indexOf("export async function DELETE"));
assert(deleteHandler.length > 0, "DELETE handler must exist");

assert(deleteHandler.includes("getCurrentUser()") && deleteHandler.includes("status: 401"), "DELETE must require an authenticated session");
assert(deleteHandler.includes("isProfileId(profileId)") && deleteHandler.includes('code: "INVALID_PROFILE_ID"') && deleteHandler.includes("status: 400"), "DELETE must reject a malformed profileId with 400 INVALID_PROFILE_ID");
assert(deleteHandler.includes("getUserProfile(profileId, user.id)") && deleteHandler.includes("status: 404"), "DELETE must resolve ownership first and answer 404 for missing or foreign profiles");
assert(deleteHandler.includes("deleteUserProfile(profileId, user.id)"), "DELETE must scope the deletion by owner");
assert(profileServer.includes('.eq("id", profileId)') && profileServer.includes('.eq("user_id", userId)'), "the delete query must keep the id + user_id ownership pair");
assert(!itemRoute.includes("body.userId") && !itemRoute.includes("searchParams"), "the route must never accept a client-supplied user scope");
console.log("1. auth, uuid validation, ownership scope and 404 non-disclosure present ✓");

for (const table of ["orders", "purchases", "entitlements", "paid_reports"]) {
  assert(profileServer.includes(`"${table}"`), `deletability must inspect ${table}`);
}
assert(profileServer.includes('const PURCHASE_SCOPED_TABLES = ["orders", "purchases", "entitlements", "paid_reports"]'), "all four purchase-scoped tables must map to one reason");
assert(profileServer.includes('block(row.profile_id, "PROFILE_HAS_PURCHASE")'), "purchase-scoped rows must block with PROFILE_HAS_PURCHASE");
assert(profileServer.includes('block(row.resolved_profile_id, "PROFILE_HAS_TRANSFER_HISTORY")'), "guest transfer history must block with PROFILE_HAS_TRANSFER_HISTORY");
assert(profileServer.includes('block(active?.profile_id ?? null, "PROFILE_IS_ACTIVE")'), "the active selection must block with PROFILE_IS_ACTIVE");
assert(deleteHandler.includes("getProfileDeletability(profileId, user.id)") && deleteHandler.includes("status: 409"), "DELETE must run the preflight and answer 409 with the blocking reason");
assert(deleteHandler.includes("code: deletability.reason"), "the 409 body must carry the machine-readable reason");
console.log("2. orders / purchases / entitlements / paid_reports / active / transfer history all block deletion ✓");

assert(profileServer.includes('.eq("user_id", userId)') && profileServer.includes('.eq("transferred_user_id", userId)'), "every blocker query must be scoped to the session user");
assert(!profileServer.includes("listProfileDeleteBlockers()"), "blocker lookup must always take a userId");
assert(profileServer.includes("if (profileId && !blockers.has(profileId))"), "per-profile reasons must be recorded independently, never merged across profiles");
console.log("3. blocker lookups stay scoped per user and per profile ✓");

assert(profileServer.includes("export class ProfileInUseError") && profileServer.includes('error.code === "23503"'), "an unexpected foreign key violation must become a typed error");
assert(deleteHandler.includes("error instanceof ProfileInUseError") && deleteHandler.includes('code: "PROFILE_IN_USE"'), "a 23503 must be reported as 409 PROFILE_IN_USE, never 500");
console.log("4. FK 23503 is translated into 409 PROFILE_IN_USE ✓");

assert(!deleteHandler.includes("clearActiveProfile") && !deleteHandler.includes("setActiveProfile"), "DELETE must not clear the active selection on the user's behalf");
assert(!/DELETE[\s\S]*from\("(orders|purchases|entitlements|paid_reports|guest_free_analyses|free_analysis_results)"\)/.test(deleteHandler), "DELETE must not remove related rows automatically");
assert(deleteHandler.split("deleteUserProfile(").length === 2, "profile removal must stay a single mutation");
console.log("5. profile deletion stays a single mutation with no cascading app-level cleanup ✓");

assert(freeAnalysisMigration.includes("profile_id uuid not null references public.profiles (id) on delete cascade"), "free_analysis_results must keep its ON DELETE CASCADE");
assert(myPage.includes("프로필을 삭제하면 저장된 무료 분석 결과도 함께 삭제되며 복구할 수 없습니다."), "the confirmation step must warn that free analysis results are deleted irreversibly");
assert(myPage.includes("setPendingDeleteProfileId(profile.id)") && myPage.includes("삭제 확인"), "deletion must go through an explicit confirmation step");
assert(!myPage.includes("window.confirm") && !myPage.includes("confirm("), "the confirmation must reuse the existing inline panel pattern, not a browser dialog");
console.log("6. free analysis CASCADE is unchanged and the UI warns before deleting ✓");

const activeDeleteHandler = activeRoute.slice(activeRoute.indexOf("export async function DELETE"));
assert(activeDeleteHandler.includes("clearActiveProfile(user.id)") && activeDeleteHandler.includes("status: 204"), "clearing the active selection must be user-scoped and answer 204");
assert(activeServer.includes('.from("active_profiles").delete().eq("user_id", userId)'), "clearing must delete only this user's active_profiles row");
assert(!activeServer.includes('.from("profiles").delete()'), "clearing the selection must never delete a profile");
assert(activeRoute.includes("export async function GET") && activeRoute.includes("export async function PUT") && activeRoute.includes("setActiveProfile(user.id, body.profileId)"), "existing active GET/PUT behaviour must stay unchanged");
assert(myPage.includes('fetch("/api/profiles/active", { method: "DELETE" })') && myPage.includes("분석 대상 선택 해제"), "mypage must expose the deselect action");
console.log("7. active selection can be cleared without touching profiles, GET/PUT unchanged ✓");

assert(!profileServer.includes("PROFILE_IS_LAST") && !itemRoute.includes("PROFILE_IS_LAST"), "deleting the last profile must not be blocked");
assert(!deleteHandler.includes("profiles.length") && !deleteHandler.includes("MAX_PROFILES_PER_USER"), "no profile-count rule may gate deletion");
console.log("8. the last profile stays deletable once its selection is cleared ✓");

assert(summaryRoute.includes("listProfileDeleteBlockers(user.id)") && summaryRoute.includes("profileDeletability"), "summary must expose the deletability hint");
assert(summaryRoute.includes("resolveProfileFreeAnalysisStatus(profile, summaries)") && summaryRoute.includes("freeAnalysisResults"), "summary must keep the existing free analysis status contract");
assert(!summaryRoute.includes("delete(") && !summaryRoute.includes("update("), "summary must stay read-only");
const freeAnalysisServer = read("app/lib/freeAnalysisResults/server.ts");
assert(freeAnalysisServer.includes("export function resolveProfileFreeAnalysisStatus") && freeAnalysisServer.includes("summary.profileFingerprint === getProfileFingerprint(profile)"), "the P0-3 stale rule must be untouched");
const readRoute = read("app/api/free-analysis/[profileId]/route.ts");
assert(readRoute.includes("cached.profileFingerprint !== getProfileFingerprint(profile)") && readRoute.includes("{ status: 404 }"), "the fingerprint-mismatch 404 read policy must stay unchanged");
console.log("9. summary extension preserves the P0-3 free analysis and fingerprint contracts ✓");

for (const reason of ["PROFILE_HAS_PURCHASE", "PROFILE_IS_ACTIVE", "PROFILE_HAS_TRANSFER_HISTORY", "PROFILE_IN_USE"] as const) {
  assert(profileDeleteBlockMessages[reason].length > 0, `${reason} must have a user-facing message`);
}
assert(myPage.includes("profileDeleteBlockMessages"), "mypage must reuse the shared block messages instead of duplicating copy");
console.log("10. every blocking reason has one shared user-facing message ✓");

console.log("\nprofile-delete-policy-regression passed ✓");
