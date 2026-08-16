import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveProfileFreeAnalysisStatus,
  getProfileFingerprint,
  type FreeAnalysisResultSummary,
} from "../app/lib/freeAnalysisResults/server";
import type { ProfileDto } from "../app/lib/profiles/types";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const profileOne: ProfileDto = {
  id: "d9d75775-b327-4e5b-8461-dee08045fd77",
  label: "본인",
  relationshipType: "self",
  birthDate: "1990-01-01",
  birthTime: "12:00",
  gender: "남성",
  calendarType: "양력",
  isLeapMonth: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const profileTwo: ProfileDto = {
  ...profileOne,
  id: "2f2f5b6a-9f3f-4c1e-9d2a-1c7b0c5a8e11",
  label: "배우자",
  relationshipType: "spouse",
  birthDate: "1992-05-05",
};

function summary(
  profile: ProfileDto,
  status: FreeAnalysisResultSummary["status"],
  fingerprint = getProfileFingerprint(profile),
): FreeAnalysisResultSummary {
  return { profileId: profile.id, status, profileFingerprint: fingerprint };
}

assert(resolveProfileFreeAnalysisStatus(profileOne, []) === "none", "a profile without a stored row must be none");
assert(resolveProfileFreeAnalysisStatus(profileOne, [summary(profileOne, "generating")]) === "generating", "generating rows must stay generating");
assert(resolveProfileFreeAnalysisStatus(profileOne, [summary(profileOne, "failed")]) === "failed", "failed rows must stay failed");
assert(resolveProfileFreeAnalysisStatus(profileOne, [summary(profileOne, "completed")]) === "completed", "completed rows matching the current fingerprint must be completed");
console.log("1. none / generating / failed / completed statuses resolve correctly ✓");

const storedFingerprint = getProfileFingerprint(profileOne);
for (const changed of [
  { ...profileOne, birthDate: "1990-01-02" },
  { ...profileOne, birthTime: "12:30" },
  { ...profileOne, gender: "여성" as const },
  { ...profileOne, calendarType: "음력" as const },
  { ...profileOne, isLeapMonth: true },
]) {
  const status = resolveProfileFreeAnalysisStatus(changed, [summary(profileOne, "completed", storedFingerprint)]);
  assert(status === "stale", "changed birth inputs must resolve to stale, never completed");
}
console.log("2. birth-input changes resolve to stale instead of completed ✓");

for (const renamed of [
  { ...profileOne, label: "이름 수정" },
  { ...profileOne, relationshipType: "other" as const },
]) {
  const status = resolveProfileFreeAnalysisStatus(renamed, [summary(profileOne, "completed", storedFingerprint)]);
  assert(status === "completed", "label and relationship changes must not mark a result stale");
}
console.log("3. label / relationship changes never create a stale status ✓");

const mixed = [summary(profileOne, "completed"), summary(profileTwo, "failed")];
assert(resolveProfileFreeAnalysisStatus(profileOne, mixed) === "completed", "profile 1 must read its own row");
assert(resolveProfileFreeAnalysisStatus(profileTwo, mixed) === "failed", "profile 2 must read its own row");
assert(resolveProfileFreeAnalysisStatus(profileTwo, [summary(profileOne, "completed")]) === "none", "another profile's row must not leak into this profile's status");
console.log("4. per-profile statuses stay isolated by profile id ✓");

const summaryRoute = read("app/api/mypage/summary/route.ts");
assert(summaryRoute.includes("listUserProfiles(user.id)") && summaryRoute.includes("listUserFreeAnalysisResults(user.id)"), "summary must load both profiles and results scoped to the session user");
assert(summaryRoute.includes("resolveProfileFreeAnalysisStatus(profile, summaries)"), "summary status must be resolved on the server");

const myPage = read("app/mypage/page.tsx");
assert(myPage.includes('stale: "재분석 필요"'), "mypage must label a stale result as requiring re-analysis");
assert(!myPage.includes("getProfileFingerprint"), "mypage must not recompute fingerprints in the browser");
assert(myPage.includes('freeAnalysisStatusById[activeProfileId] === "completed"'), "only a completed status may open the stored result");
console.log("5. status is server-resolved and stale never renders as completed ✓");

const readRoute = read("app/api/free-analysis/[profileId]/route.ts");
assert(readRoute.includes("cached.profileFingerprint !== getProfileFingerprint(profile)") && readRoute.includes("{ status: 404 }"), "the existing fingerprint-mismatch 404 read policy must stay unchanged");
const repository = read("app/lib/freeAnalysisResults/server.ts");
assert(repository.includes("export function resolveProfileFreeAnalysisStatus"), "the mypage status resolver must stay a pure synchronous function");
assert(!summaryRoute.includes("delete(") && !summaryRoute.includes("update("), "the mypage summary must never mutate stored free analysis rows");
console.log("6. read-route 404 policy and row immutability are unchanged ✓");

console.log("\nmypage-free-analysis-fingerprint-status-regression passed ✓");
