import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getProfileFingerprint } from "../app/lib/freeAnalysisResults/server";
import type { ProfileDto } from "../app/lib/profiles/types";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const migration = read("supabase/migrations/008_free_analysis_results.sql");
const grantMigration = read("supabase/migrations/009_free_analysis_results_service_role_grant.sql");
const repository = read("app/lib/freeAnalysisResults/server.ts");
const analyzeRoute = read("app/api/analyze/route.ts");
const readRoute = read("app/api/free-analysis/[profileId]/route.ts");
const loadingPage = read("app/loading/page.tsx");

const baseProfile: ProfileDto = {
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

const baseFingerprint = getProfileFingerprint(baseProfile);
assert(baseFingerprint === getProfileFingerprint({ ...baseProfile, label: "이름 수정" }), "label changes must not invalidate a free result");
assert(baseFingerprint !== getProfileFingerprint({ ...baseProfile, birthDate: "1990-01-02" }), "birth date changes must invalidate a free result");
assert(baseFingerprint !== getProfileFingerprint({ ...baseProfile, birthTime: "12:30" }), "birth time changes must invalidate a free result");
assert(baseFingerprint !== getProfileFingerprint({ ...baseProfile, gender: "여성" }), "gender changes must invalidate a free result");
assert(baseFingerprint !== getProfileFingerprint({ ...baseProfile, calendarType: "음력" }), "calendar type changes must invalidate a free result");
assert(baseFingerprint !== getProfileFingerprint({ ...baseProfile, isLeapMonth: true }), "leap-month changes must invalidate a free result");

assert(migration.includes("free_analysis_results_user_profile_unique unique (user_id, profile_id)"), "free result identity must be user_id + profile_id");
assert(migration.includes("profile_fingerprint text not null") && migration.includes("profile_snapshot jsonb not null"), "free results must store Profile change-detection data");
assert(migration.includes("alter table public.free_analysis_results enable row level security") && migration.includes("revoke insert, update, delete"), "free result writes must remain server-only");
assert(grantMigration.includes("to service_role"), "service_role must receive required table ACLs");

assert(repository.includes("claimFreeAnalysisResult") && repository.includes('ignoreDuplicates: true'), "free generation must use a duplicate-safe claim");
assert(repository.includes("completeFreeAnalysisResult") && repository.includes("failFreeAnalysisResult"), "free generation must persist completed and failed lifecycle states");
assert(analyzeRoute.includes("claimFreeAnalysisResult") && analyzeRoute.includes("completeFreeAnalysisResult"), "analyze API must reuse or persist free results");
assert(analyzeRoute.includes('{ status: "generating" }, { status: 202 }'), "concurrent analysis requests must return a generating state");
assert(readRoute.includes("getUserProfile(profileId, user.id)") && readRoute.includes("getProfileFingerprint(profile)"), "free result reads must verify ownership and fingerprint");
assert(loadingPage.includes("waitForFreeAnalysis") && loadingPage.includes("response.status === 202"), "loading must wait for an in-progress shared generation");

console.log("free result identity user + Profile: true");
console.log("birth-input fingerprint invalidation: true");
console.log("server-only claim and persistence lifecycle: true");
console.log("A/B server read isolation and concurrent generation wait: true");