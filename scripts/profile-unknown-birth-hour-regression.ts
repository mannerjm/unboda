import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getSaju } from "../app/lib/manse";
import { buildFreeAnalysis } from "../app/lib/buildFreeAnalysis";
import { buildSajuResponse } from "../app/lib/buildSajuResponse";
import { calculateWeightedElements } from "../app/lib/elements";
import { validateProfileInput, type ProfileDto } from "../app/lib/profiles/types";
import { canonicalAnalysisInputMatches, hasCanonicalAnalysisInputChanged } from "../app/lib/analysisInputIdentity";
import { buildAnalysisInputSnapshot, parseAnalysisInputSnapshot, resolveAnalysisInputProfileVersion } from "../app/lib/analysisInputSnapshot";
import { buildProfileCompatibilitySnapshot } from "../app/lib/compatibilityCustomerInput";

const path = (p: string) => readFileSync(p, "utf8");
const profileInput = {
  label: "테스트 대상", relationshipType: "self" as const, birthDate: "1990-05-15",
  birthTime: "12:00", birthTimeKnown: false, gender: "여성" as const,
  calendarType: "양력" as const, isLeapMonth: false,
};
const unknown = validateProfileInput(profileInput);
assert(unknown.valid);
const known = validateProfileInput({ ...profileInput, birthTimeKnown: true });
assert(known.valid);
assert(!validateProfileInput({ ...profileInput, birthTime: "09:30" }).valid, "unknown time must never be silently inferred from a made-up clock time");
assert(!validateProfileInput({ ...profileInput, birthTimeKnown: "false" }).valid);
const hourUnknown = getSaju("1990-05-15", "12:00", "양력", "평달", "여성", "2026-09-24", false);
const hourKnown = getSaju("1990-05-15", "12:00", "양력", "평달", "여성", "2026-09-24", true);
assert(hourKnown.hourPillarHanja && hourKnown.hourStem && hourKnown.hourBranch, "a real noon birth must retain its actual hour pillar");
for (const key of ["hourPillar", "hourPillarHanja", "hourStem", "hourBranch", "hourTenGod", "hourBranchTenGod", "hourStage", "hourSpirit"] as const) {
  assert(!hourUnknown[key], `unknown time must not display or export a fabricated ${key}`);
}
assert.deepEqual(hourUnknown.hourHiddenStems, []);
assert.equal(hourUnknown.daeunAnalysis, null, "decade-cycle start age must not be invented when birth time is unknown");
assert(!hourUnknown.currentDaeun && !hourUnknown.fortuneFlowAnalysis);
assert.equal(hourUnknown.dayPillarHanja, hourKnown.dayPillarHanja, "date-noon chart is a provisional day reference");
const expectedElements = calculateWeightedElements(
  [hourUnknown.yearStem, hourUnknown.monthStem, hourUnknown.dayStem],
  [hourUnknown.yearBranch, hourUnknown.monthBranch, hourUnknown.dayBranch],
);
assert.deepEqual(hourUnknown.elementAnalysis, expectedElements, "unknown birth time must use three-pillar rather than imaginary hour weighting");
const free = buildFreeAnalysis(hourUnknown);
const response = buildSajuResponse(hourUnknown);
assert.equal(free.hourPillarHanja, "");
assert.equal(response.hourPillarHanja, "");
assert(!free.currentDaeun && free.daeunAnalysis === null);
const dto: ProfileDto = { ...profileInput, id: "00000000-0000-4000-8000-000000000000", createdAt: "", updatedAt: "" };
assert(hasCanonicalAnalysisInputChanged({ ...dto, birthTimeKnown: true }, dto));
assert(!canonicalAnalysisInputMatches({ ...dto, birthTimeKnown: null }, { ...dto, birthTimeKnown: false }));
const snapshot = buildAnalysisInputSnapshot(dto);
assert.equal(parseAnalysisInputSnapshot(JSON.parse(JSON.stringify(snapshot))).birthData.birthTimeKnown, false);
assert.equal(resolveAnalysisInputProfileVersion(snapshot, dto), "current");
assert.equal(resolveAnalysisInputProfileVersion(snapshot, { ...dto, birthTimeKnown: true }), "previous");
const legacySnapshot = buildAnalysisInputSnapshot({ ...dto, birthTimeKnown: null });
assert.equal(resolveAnalysisInputProfileVersion(legacySnapshot, { ...dto, birthTimeKnown: null }), "current");
assert.equal(resolveAnalysisInputProfileVersion(legacySnapshot, dto), "previous");
// Existing compatibility unknown-time resolver may fail closed if an actual
// birth date straddles the 23:00 pillar convention; it may NEVER fabricate
// an hour or decade in the successful case.
let resolved = false;
for (const birthday of ["1990-05-15", "1985-02-14", "2000-12-01", "1996-04-19"]) {
  try {
    const candidate = buildProfileCompatibilitySnapshot({ ...dto, birthDate: birthday }, "2026-09-24");
    assert.equal(candidate.birthTimeKnown, false);
    assert.equal(candidate.person.pillars.hour, null);
    assert.equal(candidate.timing.daeunGanji, null);
    resolved = true;
    break;
  } catch (error) {
    assert(String(error).includes("출생시간"), "only known unknown-hour ambiguity may block compatibility");
  }
}
assert(resolved, "at least one non-boundary calendar sample must resolve unknown-hour compatibility");
const guest = path("app/guest-saju/page.tsx");
const mypage = path("app/mypage/page.tsx");
const result = path("app/result/page.tsx");
const pipeline = path("app/lib/freeAnalysisPipeline/server.ts");
const profiles = path("app/lib/profiles/server.ts");
const transferMigration = path("supabase/migrations/20260924010000_profiles_birth_time_known.sql");
for (const [label, ui] of [["guest", guest], ["mypage", mypage]] as const) {
  assert(ui.includes("출생 시간 모름") && ui.includes("birthTimeKnown") && ui.includes('type="checkbox"'), `${label} must offer a real, controlled unknown-time checkbox`);
  assert(ui.includes('birthTime: event.target.checked ? "12:00" : ""'), `${label} checkbox must only use a noon sentinel when time is unknown`);
}
assert(result.includes('profile?.birthTimeKnown === false ? "출생 시간 모름"'));
assert(result.includes('label: "시주"') && result.includes('pillar.label === "시주" && profile?.birthTimeKnown === false'), "unknown hour must use a dedicated compact empty state while keeping the normal hour label");
assert(result.includes("출생 시간 미상") && result.includes("시주 정보 없음"), "show concise status once instead of two empty stem/branch slots");
assert(!result.includes('label: profile?.birthTimeKnown === false ? "시주 · 시간 미상"'), "avoid lengthy hour-column title");
assert(result.includes('profile?.birthTimeKnown === false ? "" : freeAnalysis?.hourStem'));
assert(result.includes('profile?.birthTimeKnown === false ? "" : freeAnalysis?.hourBranch'));
assert(result.includes("자시(23시 전후)") || result.includes("자시") || result.includes("일주") , "unknown time should not be misrepresented as a confirmed four-pillar chart");
assert(pipeline.includes("input.profile.birthTimeKnown") && pipeline.includes("content.profile.birthTimeKnown"), "free generation/retry must propagate time certainty");
assert(profiles.includes("birth_time_known: input.birthTimeKnown ?? null") && profiles.includes("birthTimeKnown: row.birth_time_known ?? null"));
assert(transferMigration.includes("p.birth_time_known is not distinct from v_birth_time_known") && transferMigration.includes("'birthTimeKnown', v_profile.birth_time_known") && transferMigration.includes("profile_input = null"), "guest transfer must keep account ownership, certainty, and guest PII minimization");
assert(path("app/lib/paidAnalysisProfileInput.ts").includes("profile.birthTimeKnown") && path("app/lib/analysisEditionForOrder.ts").includes("profile.birthTimeKnown"), "paid generation and edition must consume same verified profile");
assert(path("app/lib/freeAnalysisResults/server.ts").includes("snapshot.birthTimeKnown"), "free profile identity must capture explicit unknown-time value");
assert(path("app/lib/compatibilityCustomerInput.ts").includes("if (profile.birthTimeKnown === false)"), "compatibility self cannot fabricate a known time");
assert(path("app/lib/dailyUnboda/server.ts").includes("profile.birthTimeKnown"), "daily reading must use the same three-pillar chart for unknown hour");
console.log("profile-unknown-birth-hour-regression: PASS", JSON.stringify({hourUnknown: [hourUnknown.hourPillarHanja, hourUnknown.hourStem, hourUnknown.hourBranch], daeun: hourUnknown.daeunAnalysis, knownNoonHour: hourKnown.hourPillarHanja, compatibleUnknownResolved: resolved}));
