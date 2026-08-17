import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const summaryRoute = read("app/api/mypage/summary/route.ts");
const repository = read("app/lib/freeAnalysisResults/server.ts");
const myPage = read("app/mypage/page.tsx");

assert(summaryRoute.includes("getCurrentUser") && summaryRoute.includes('{ status: 401 }'), "summary route must require an authenticated session");
assert(summaryRoute.includes("listUserFreeAnalysisResults(user.id)"), "summary route must scope results to the current user only");
assert(!summaryRoute.includes("profileId") || summaryRoute.includes("user.id"), "summary route must not accept a client-supplied user scope");
console.log("1. mypage summary route enforces server-side user ownership ✓");

assert(repository.includes("export async function listUserFreeAnalysisResults") && repository.includes('.eq("user_id", userId)'), "free analysis summary lookup must filter by user_id in Postgres, not in the client");
const listBody = repository.slice(
  repository.indexOf("export async function listUserFreeAnalysisResults"),
  repository.indexOf("export type ProfileFreeAnalysisStatus"),
);
assert(listBody.includes("profile_id, status, profile_fingerprint"), "free analysis summary lookup must keep selecting the profile/status/fingerprint columns");
assert((listBody.match(/\.from\(/g) ?? []).length === 1, "free analysis summary lookup must stay a single query");
assert(!/\.(insert|update|delete|upsert)\(/.test(listBody), "free analysis summary lookup must stay read-only");
console.log("2. listUserFreeAnalysisResults is a scoped, read-only server function ✓");

assert(myPage.includes('fetch("/api/mypage/summary")'), "mypage must fetch the new read-only summary endpoint");
assert(myPage.includes('fetch("/api/profiles")') && myPage.includes('fetch("/api/profiles/active")'), "mypage must keep using the existing profiles and active-profile endpoints unchanged");
assert(myPage.includes("무료 분석 완료") && myPage.includes("분석 생성 중") && myPage.includes("분석 실패") && myPage.includes("무료 분석 없음"), "mypage must render all four free analysis status labels");
assert(!myPage.includes("router.push(`/result?profileId=${profile.id}`)"), "the per-card free analysis result button must be removed in favor of the single bottom CTA");
assert(myPage.includes('freeAnalysisStatusById[activeProfileId] === "completed"') && myPage.includes("router.push(`/result?profileId=${activeProfileId}`)"), "the bottom CTA must be the sole navigation to the completed free analysis result");
assert(myPage.includes('onClick={() => void activate(profile.id)}'), "profile activation must remain unchanged");
console.log("3. mypage renders free analysis status and the completed-result CTA without disturbing profile selection ✓");

console.log("\nmypage-free-analysis-summary-regression passed ✓");
