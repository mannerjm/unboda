import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateSaju } from "@fullstackfamily/manseryeok";
import { buildTodayReading, getTodayBranchRelation, getTodayDayPillar, DAILY_COPY_VERSION } from "../app/lib/dailyUnboda";

const date = "2026-09-24";
assert.equal(DAILY_COPY_VERSION, "daily-v6", "new customer-facing copy must not reuse cached daily-v5 copy");
assert.equal(getTodayBranchRelation("子", "午"), "충");
assert.equal(getTodayBranchRelation("子", "丑"), "합");
assert.equal(getTodayBranchRelation("子", "卯"), "형");
assert.equal(getTodayBranchRelation("子", "酉"), "파");
assert.equal(getTodayBranchRelation("子", "未"), "해");
assert.equal(getTodayBranchRelation("子", "子"), "같은 오행");
assert.equal(getTodayBranchRelation("寅", "亥"), "합", "an overlapping pair must have a single, stable presentation label");

const natalA = { personDayStem: "甲", personDayBranch: "子", personYearPillarHanja: "庚午", personMonthPillarHanja: "丙寅" };
const natalB = { ...natalA, personYearPillarHanja: "癸丑", personMonthPillarHanja: "丁酉" };
const todaysPillar = "庚午";
const readingA = buildTodayReading({ date, ...natalA, dayPillarHanja: todaysPillar });
const readingB = buildTodayReading({ date, ...natalB, dayPillarHanja: todaysPillar });
assert.equal(readingA.tenGod, readingB.tenGod);
assert.equal(readingA.branchRelation, readingB.branchRelation);
const changedStemsOnly = buildTodayReading({ date, ...natalA, personYearPillarHanja: "壬午", personMonthPillarHanja: "戊寅", dayPillarHanja: todaysPillar });
assert.equal(changedStemsOnly.focusRelation, readingA.focusRelation);
assert.notEqual(changedStemsOnly.flow, readingA.flow, "month/year heavenly stems must contribute beyond their branch and the base ten-god");
assert.notEqual(readingA.flow, readingB.flow, "different natal month/year must meaningfully refine otherwise equal day stem and branch");
assert.deepEqual(readingA, buildTodayReading({ date, ...natalA, dayPillarHanja: todaysPillar }), "no randomness between repeat reads");
assert.equal(readingA.focusPillar, "day");
assert.equal(readingA.focusRelation, "충");
assert(readingA.topic.includes("계획을 다시 확인해요"), "personal branch relationship must refine the plain-language daily theme");
assert(readingA.action.includes("예상과 달라진 점"), "one practical plain-language action must match the selected focus");
assert(readingA.flow.includes("내가 직접 할 일") && readingB.flow.includes("내가 직접 할 일"), "selected personal context must be explained without pillar jargon");
assert(!/천간|지지|지장간|십성|오행|세운|대운|합 관계|충 관계|형 관계|파 관계|해 관계/.test(readingA.topic + readingA.flow + readingA.action), "full personal saju can be calculated without displaying jargon");

const monthFocus = buildTodayReading({ date, personDayStem: "甲", personDayBranch: "寅", personMonthPillarHanja: "丙子", personYearPillarHanja: "甲辰", dayPillarHanja: "庚午" });
assert.equal(monthFocus.focusPillar, "month", "notable month relationship may refine otherwise neutral day branch");
const yearFocus = buildTodayReading({ date, personDayStem: "甲", personDayBranch: "寅", personMonthPillarHanja: "丙戌", personYearPillarHanja: "甲子", dayPillarHanja: "庚午" });
assert.equal(yearFocus.focusPillar, "year");
const noMonthYear = buildTodayReading({ date, personDayStem: "甲", personDayBranch: "子", dayPillarHanja: "庚午" });
assert.equal(noMonthYear.focusPillar, undefined, "standalone callers without complete natal pillars use safe legacy day-only copy");
assert.throws(() => buildTodayReading({ date, ...natalA, personMonthPillarHanja: "invalid", dayPillarHanja: todaysPillar }));
const noVerifiedHour = buildTodayReading({ date, ...natalA, dayPillarHanja: todaysPillar });
const verifiedHour = buildTodayReading({ date, ...natalA, verifiedHourPillarHanja: "甲申", dayPillarHanja: todaysPillar });
assert.equal(noVerifiedHour.focusPillar, "day");
assert.equal(verifiedHour.tenGod, noVerifiedHour.tenGod, "optional verified hour must not change the day-stem ten-god basis");
assert.equal(verifiedHour.branchRelation, noVerifiedHour.branchRelation, "optional verified hour must not alter the actual day-branch relation");

// Follow actual 60 consecutive KST civil dates for several real natal pillar
// combinations; do not claim an arbitrary 450 unique results or force novelty.
const births = [[1985, 2, 14], [1991, 7, 9], [2000, 12, 1], [1978, 10, 27], [1996, 4, 19], [1988, 8, 31]] as const;
const statistics = births.map(([y, m, d]) => {
  const natal = calculateSaju(y, m, d, 12, 0);
  const readings = Array.from({ length: 60 }, (_, index) => {
    const next = new Date(Date.UTC(2026, 8, 24 + index)).toISOString().slice(0, 10);
    return buildTodayReading({
      date: next,
      personDayStem: natal.dayPillarHanja[0],
      personDayBranch: natal.dayPillarHanja[1],
      personMonthPillarHanja: natal.monthPillarHanja,
      personYearPillarHanja: natal.yearPillarHanja,
      dayPillarHanja: getTodayDayPillar(next),
    });
  });
  assert(readings.every(reading => reading.flow.length >= 55 && reading.flow.length <= 185 && reading.topic.length <= 32 && reading.action.length > 12 && reading.action.length <= 85));
  const uniqueTopics = new Set(readings.map(reading => reading.topic));
  const uniqueFlows = new Set(readings.map(reading => reading.flow));
  const uniqueActions = new Set(readings.map(reading => reading.action));
  assert(uniqueTopics.size >= 8, "60-day themes should be meaningfully diversified");
  assert(uniqueFlows.size >= 12, "60-day expanded explanatory text should not collapse to old ten-god snippets");
  assert(uniqueActions.size >= 8, "practical suggestions should vary with computed relations");
  return { birth: `${y}-${m}-${d}`, uniqueTopics: uniqueTopics.size, uniqueFlows: uniqueFlows.size, uniqueActions: uniqueActions.size, first: readings[0].topic, last: readings[59].topic };
});

const page = readFileSync("app/today/page.tsx", "utf8");
const server = readFileSync("app/lib/dailyUnboda/server.ts", "utf8");
const daily = readFileSync("app/lib/dailyUnboda.ts", "utf8");
assert(page.includes("getProfileFreeAnalysisFoundationStatus(user.id, activeProfile)"));
assert(page.includes("getCachedTodayReading(user.id, activeProfile, date)"));
assert(server.includes("personYearPillarHanja: saju.yearPillarHanja"));
assert(server.includes("personMonthPillarHanja: saju.monthPillarHanja"));
assert(server.includes("profile.birthTimeKnown === true && saju.hourPillarHanja"), "hour pillar requires explicitly known time, never default noon alone");
assert(server.includes("fingerprint") && server.includes("DAILY_COPY_VERSION") && server.includes("profile.id") && server.includes("date"), "cache scope must protect personal readings and new copy version");
assert(daily.includes("calculateWeightedElements(") && daily.includes("findBranchPunishment(") && daily.includes("findBranchBreak(") && daily.includes("findBranchHarm("));
assert(daily.includes("getTenGod(monthPillar[0], todayPillar[0])") && daily.includes("getTenGod(yearPillar[0], todayPillar[0])"), "both month and year heavenly stems must be compared to the current day stem");
for (const banned of ["requestPayment(", "grantEntitlement(", "new OpenAI(", "generatePaidReport(", "Math.random("]) assert(!daily.includes(banned));
console.log("daily-full-pillar-diversity-regression: PASS", JSON.stringify(statistics));
