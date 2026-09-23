import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateSaju } from "@fullstackfamily/manseryeok";
import { buildTodayReading, getTodayBranchRelation, getTodayDayPillar } from "../app/lib/dailyUnboda";
import { getTenGod } from "../app/lib/tenGod";
import { getKoreaEvaluationDate } from "../app/lib/evaluationContext";

const date = "2026-09-23";
const pillar = getTodayDayPillar(date);
assert.match(pillar, /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
assert.equal(pillar, calculateSaju(2026, 9, 23, 12, 0).dayPillarHanja);
assert.equal(getTodayDayPillar(date), pillar, "same date must have the same day pillar");
assert.notEqual(getTodayDayPillar("2026-09-24"), pillar, "new date must have a new day pillar");
for (const invalid of ["2026-02-30", "2026-13-01", "2026-9-3", "yesterday"]) {
  assert.throws(() => getTodayDayPillar(invalid), "invalid date must fail closed");
}

const stems = [..."甲乙丙丁戊己庚辛壬癸"];
const signatures = new Set<string>();
for (const stem of stems) {
  const reading = buildTodayReading({ date, personDayStem: stem, dayPillarHanja: pillar });
  assert.deepEqual(reading, buildTodayReading({ date, personDayStem: stem, dayPillarHanja: pillar }));
  assert.equal(reading.tenGod, getTenGod(stem, pillar[0]));
  assert(reading.flow.length > 30 && reading.topic.length > 2 && reading.action.length > 12);
  signatures.add(reading.tenGod);
}
assert.equal(signatures.size, 10, "different personal day stems must produce ten distinct relationships");

// Different birth-day branches must refine the same daily ten-god result
// using the existing (unmodified) fortuneRelations rule tables.
assert.equal(getTodayBranchRelation("子", "午"), "충");
assert.equal(getTodayBranchRelation("子", "丑"), "합");
assert.equal(getTodayBranchRelation("寅", "卯"), "같은 오행");
assert.equal(getTodayBranchRelation("子", "寅"), null);
assert.throws(() => getTodayBranchRelation("X", "午"));
const base = { date, personDayStem: "甲" };
const clash = buildTodayReading({ ...base, personDayBranch: "子", dayPillarHanja: "甲午" });
const combination = buildTodayReading({ ...base, personDayBranch: "子", dayPillarHanja: "甲丑" });
const same = buildTodayReading({ ...base, personDayBranch: "寅", dayPillarHanja: "甲卯" });
const neutral = buildTodayReading({ ...base, personDayBranch: "子", dayPillarHanja: "甲寅" });
assert.equal(clash.branchRelation, "충");
assert.equal(combination.branchRelation, "합");
assert.equal(same.branchRelation, "같은 오행");
assert.equal(neutral.branchRelation, null);
assert.notEqual(clash.flow, combination.flow);
assert.notEqual(clash.flow, neutral.flow);
assert.equal(neutral.topic, clash.topic, "branch relation must refine, not change, the ten-god theme");
assert.deepEqual(clash, buildTodayReading({ ...base, personDayBranch: "子", dayPillarHanja: "甲午" }));
for (const personDayBranch of "子丑寅卯辰巳午未申酉戌亥") {
  for (const todayDayBranch of "子丑寅卯辰巳午未申酉戌亥") {
    const reading = buildTodayReading({ ...base, personDayBranch, dayPillarHanja: `甲${todayDayBranch}` });
    assert(reading.flow.length >= neutral.flow.length);
    assert.equal(reading.tenGod, neutral.tenGod);
  }
}
assert.throws(() => buildTodayReading({ date, personDayStem: "X", dayPillarHanja: pillar }));
assert.equal(getKoreaEvaluationDate(new Date("2026-09-22T15:00:00.000Z")), date, "KST midnight must select the new civil date");
assert.equal(getKoreaEvaluationDate(new Date("2026-09-22T14:59:59.000Z")), "2026-09-22");

const page = readFileSync("app/today/page.tsx", "utf8");
const home = readFileSync("app/components/HomeExperience.tsx", "utf8");
const shell = readFileSync("app/components/AppShell.tsx", "utf8");
const daily = readFileSync("app/lib/dailyUnboda.ts", "utf8");
const server = readFileSync("app/lib/dailyUnboda/server.ts", "utf8");
assert(page.includes('if (!user) redirect("/auth/login?returnTo=/today")'));
// The member explicitly selects the profile in mypage: today's reading must
// follow that selection, including a spouse, never force relationshipType=self.
assert(page.includes('import { getActiveProfile } from "@/app/lib/profiles/activeServer";'));
assert(page.includes("const activeProfile = await getActiveProfile(user.id)"));
assert(page.includes("if (!activeProfile)"));
assert(page.includes("getCachedTodayReading(user.id, activeProfile, date)"));
// Daily must not display paid-like/personal content for a profile with only
// birth details: require the SAME profile's saved free-saju foundation first.
assert(page.includes("getProfileFreeAnalysisFoundationStatus(user.id, activeProfile)"));
assert(page.includes("if (!isFreeAnalysisFoundationReady(freeAnalysisStatus))"));
assert(page.includes('freeAnalysisStatus === "stale"') && page.includes('freeAnalysisStatus === "generating"'));
assert(page.includes("무료 사주 먼저 조회하기") && page.includes('"/saju"'));
assert(page.includes("`/loading?profileId=${encodeURIComponent(activeProfile.id)}`"));
assert(page.indexOf("if (!isFreeAnalysisFoundationReady(freeAnalysisStatus))") < page.indexOf("getCachedTodayReading(user.id, activeProfile, date)"), "free-saju guard must run before daily calculation/cache");
assert(!page.includes("startAnalysis("), "daily must not automatically trigger a free analysis (including AI calls)");
const foundation = readFileSync("app/lib/freeAnalysisEligibility.ts", "utf8");
assert(foundation.includes("resolveProfileFreeAnalysisStatus(profile, summaries)"), "gate must use the existing profile+birth fingerprint eligibility, not a new analysis engine");
assert(foundation.includes('status === "completed" || status === "needs_retry"'), "a completed free analysis with only AI-summary retry pending still has valid free-saju foundations");
assert(page.includes("{activeProfile.label}님의 오늘"));
assert(!page.includes("selfProfile") && !page.includes("listUserProfiles"));
const activeProfileSource = readFileSync("app/lib/profiles/activeServer.ts", "utf8");
assert(activeProfileSource.includes('.eq("user_id", userId)'));
assert(activeProfileSource.includes("getUserProfile(data.profile_id, userId)"), "active profile must be owned by the current user");
const aProfileReading = buildTodayReading({ date, personDayStem: "甲", personDayBranch: "子", dayPillarHanja: "甲午" });
const bProfileReading = buildTodayReading({ date, personDayStem: "乙", personDayBranch: "丑", dayPillarHanja: "甲午" });
assert.notDeepEqual(aProfileReading, bProfileReading, "distinct natal pillars must remain independently calculated");
assert.deepEqual(aProfileReading, buildTodayReading({ date, personDayStem: "甲", personDayBranch: "子", dayPillarHanja: "甲午" }), "returning to A must reuse A's deterministic reading");
assert(server.includes("getSaju(") && server.includes("getTodayDayPillar(date)"));
assert(server.includes("personDayBranch: saju.dayBranch"));
for (const scope of ["DAILY_COPY_VERSION", "userId", "profile.id", "fingerprint", "date"]) {
  assert(server.includes(scope), `missing cache identity scope: ${scope}`);
}
assert(server.includes("revalidate: 86400"));
assert(!server.includes("listUserProfiles(") && !server.includes("getCurrentUser("), "auth and profile checks must remain outside cache");
assert(home.includes("<DailyVisitEntry state={state}/>") && home.includes("매일 무료"));
const homeDailyEntry = home.slice(home.indexOf("function DailyVisitEntry("), home.indexOf("function QuickRoutes("));
const homeQuickRoutes = home.slice(home.indexOf("function QuickRoutes("), home.indexOf("function CardScene("));
assert(homeDailyEntry.includes("선택한 분석 대상의 사주를 바탕으로"), "home daily copy must match the currently selected profile");
assert(homeQuickRoutes.includes('className="mx-auto mt-5 grid w-full max-w-6xl'), "home shortcut cards need a visible 20px gap below the daily card");
const todayTopic = page.indexOf('id="today-topic"');
const todayFlow = page.indexOf("{reading.flow}");
const todayAction = page.indexOf("{reading.action}");
assert(todayTopic > 0 && todayFlow > todayTopic && todayAction > todayFlow, "daily result must show the topic first, then short flow, then one practical suggestion");
assert(page.includes('aria-labelledby="today-action"') && page.includes("오늘의 한 가지 제안"), "daily suggestion remains in a readable, accessible separate card");
assert(page.includes("선택한 분석 대상의 사주와 오늘의 일진을 참고한 내용입니다."), "daily result must explain its basis in plain Korean");
assert(shell.includes('{ href: "/today", label: "오늘의 운보다"'));
assert(!page.includes("buildFreeAnalysisResponse") && !page.includes("/api/analyze"));
for (const source of [page, daily, server]) {
  for (const forbidden of ["from \"openai\"", "new OpenAI(", "generateMainAnalysis(", "generatePaidReport(", "requestPayment(", "grantEntitlement(", "debitCredit(", "/checkout/"]) {
    assert(!source.toLowerCase().includes(forbidden.toLowerCase()), `daily source must not include ${forbidden}`);
  }
}
assert(!page.includes("/deep-analysis") && !page.includes("/ai-consulting"), "daily content must not sell reports or consulting");
assert(!server.includes("createAdminClient") && !server.includes("supabase.from("), "daily must not alter existing database state");
console.log("daily-unboda-regression: OK");
