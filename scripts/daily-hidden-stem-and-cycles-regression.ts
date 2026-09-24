import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateSaju } from "@fullstackfamily/manseryeok";
import { buildTodayReading, getTodayDayPillar, getTodayYearPillar, normalizeDailyCyclePillar, DAILY_COPY_VERSION } from "../app/lib/dailyUnboda";
import { BRANCH_HIDDEN_STEMS } from "../app/lib/weights";
import { getTenGod } from "../app/lib/tenGod";

assert.equal(DAILY_COPY_VERSION, "daily-v6", "daily-v6 must invalidate older cached copy");
assert.equal(normalizeDailyCyclePillar("병자"), "丙子");
assert.equal(normalizeDailyCyclePillar("辛未"), "辛未");
assert.equal(normalizeDailyCyclePillar("갑"), null);
assert.equal(normalizeDailyCyclePillar("잘못된 값"), null);
assert.equal(normalizeDailyCyclePillar(null), null);

const date = "2026-09-24";
const natal = {
  personDayStem: "甲",
  personDayBranch: "子",
  personMonthPillarHanja: "丙寅",
  personYearPillarHanja: "庚午",
  dayPillarHanja: "庚午",
};
const base = buildTodayReading({ date, ...natal });
const annual = buildTodayReading({ date, ...natal, currentSeunGanji: "기미" });
const annualRepeat = buildTodayReading({ date, ...natal, currentSeunGanji: "기미" });
assert.deepEqual(annualRepeat, annual, "same person/date/cycle always returns identical copy");
assert.equal(annual.hiddenStemTenGod, getTenGod("甲", "丁"), "午 must use its actual primary hidden stem");
assert.equal(annual.cycleFocus, "seun");
assert(annual.topic.includes("해야 할 일부터 정리해요"), "visible headline must follow the calculated ten-god in everyday language");
assert(annual.topic.includes("계획을 다시 확인해요"), "the natal focus should remain visible and understandable");
assert(annual.action.includes("예상과 달라진 점"), "daily action must be one understandable suggestion tied to selected focus");
assert(annual.topic.length <= 32, "daily event headline must remain glanceable on mobile");
const neutralNatal = { date, personDayStem: "甲", personDayBranch: "寅", personMonthPillarHanja: "丙辰", personYearPillarHanja: "庚寅", dayPillarHanja: "庚午" };
const neutralWithCycle = buildTodayReading({ ...neutralNatal, currentSeunGanji: "기미" });
assert(neutralWithCycle.action.includes("함께할 사람과 생각을 맞춰 보세요"), "when there is no notable natal relation the annual cycle can select a grounded practical action");
assert(!/천간|지지|지장간|십성|오행|세운|대운|합 관계|충 관계|형 관계|파 관계|해 관계/.test(annual.topic + annual.flow + annual.action), "customer-facing copy must not expose the internal saju terminology");
assert(annual.flow.split(/[.!?] /).length <= 3 && annual.flow.length <= 185, "today note must read in at most three short sentences");
assert.equal(annual.topic, base.topic, "the most relevant personal focus stays primary when an annual cycle is added");
assert.equal(annual.action, base.action, "the personal focus must not be overwritten by a secondary annual cycle");
assert.equal(base.cycleFocus, null);
assert.equal(base.hiddenStemTenGod, annual.hiddenStemTenGod);

const decade = buildTodayReading({ date, ...natal, currentDaeunGanji: "계축" });
assert.equal(decade.cycleFocus, "daeun");
assert(decade.topic.length <= 32 && !decade.flow.includes("대운"), "available decade cycle can be selected without exposing jargon");
const both = buildTodayReading({ date, ...natal, currentSeunGanji: "기미", currentDaeunGanji: "계축" });
assert.equal(both.cycleFocus, "seun", "concrete non-neutral annual branch relation wins by documented priority");
assert.equal(both.action, annual.action, "second cycle must not crowd out the single personal action");

const withoutFullNatal = buildTodayReading({ date, personDayStem: "甲", personDayBranch: "子", dayPillarHanja: "庚午", currentSeunGanji: "기미" });
assert.equal(withoutFullNatal.hiddenStemTenGod, undefined, "incomplete natal pillars may not claim full personal interpretation");
assert.equal(withoutFullNatal.cycleFocus, undefined, "incomplete natal pillars fall back to earlier safe reading");
assert.equal(withoutFullNatal.topic, "해야 할 일부터 정리해요");

const stems = [..."甲乙丙丁戊己庚辛壬癸"];
const branches = [..."子丑寅卯辰巳午未申酉戌亥"];
for (const stem of stems) {
  for (const branch of branches) {
    const hidden = BRANCH_HIDDEN_STEMS[branch].find(part => part.position === "primary");
    assert(hidden, `primary hidden stem missing for ${branch}`);
    const reading = buildTodayReading({
      date, personDayStem: stem, personDayBranch: "子",
      personMonthPillarHanja: "丙寅", personYearPillarHanja: "庚午",
      dayPillarHanja: `甲${branch}`,
    });
    assert.equal(reading.hiddenStemTenGod, getTenGod(stem, hidden.stem), "primary hidden stem must be interpreted relative to the personal day stem");
  }
}

// 60 real Korean civil days, six sample natal structures, no random rotation.
// Report distinctive *rendered texts*, not an invented global combinations count.
const births = [[1985, 2, 14], [1991, 7, 9], [2000, 12, 1], [1978, 10, 27], [1996, 4, 19], [1988, 8, 31]] as const;
const measurements = births.map(([year, month, day]) => {
  const person = calculateSaju(year, month, day, 12, 0);
  const results = Array.from({ length: 60 }, (_, index) => {
    const currentDate = new Date(Date.UTC(2026, 8, 24 + index)).toISOString().slice(0, 10);
    const seun = getTodayYearPillar(currentDate);
    return buildTodayReading({
      date: currentDate,
      personDayStem: person.dayPillarHanja[0],
      personDayBranch: person.dayPillarHanja[1],
      personMonthPillarHanja: person.monthPillarHanja,
      personYearPillarHanja: person.yearPillarHanja,
      dayPillarHanja: getTodayDayPillar(currentDate),
      currentSeunGanji: seun,
      // The saved profile has no verified birth-time field: do not manufacture a decade cycle here.
    });
  });
  const topics = new Set(results.map(row => row.topic));
  const flows = new Set(results.map(row => row.flow));
  const actions = new Set(results.map(row => row.action));
  assert(topics.size >= 8 && flows.size >= 16 && actions.size >= 10, "60-day plain-language results must retain meaningful variety");
  assert(results.every(row => row.hiddenStemTenGod && row.action.length > 12 && row.topic.length > 8));
  return { birth: `${year}-${month}-${day}`, topics: topics.size, flows: flows.size, actions: actions.size, maxTopicLength: Math.max(...results.map(row => row.topic.length)) };
});
const server = readFileSync("app/lib/dailyUnboda/server.ts", "utf8");
const page = readFileSync("app/today/page.tsx", "utf8");
const daily = readFileSync("app/lib/dailyUnboda.ts", "utf8");
assert(server.includes("currentSeunGanji: getTodayYearPillar(date)"), "daily annual context must use the existing solar-term year pillar");
assert(server.includes("currentDaeunGanji: profile.birthTimeKnown === true"), "daily decade analysis must require confirmed birth time");
assert(server.includes("profile.birthTimeKnown === true && saju.hourPillarHanja"), "hour pillar requires confirmed birth time");
assert(page.includes("getProfileFreeAnalysisFoundationStatus(user.id, activeProfile)"));
assert(page.includes("getCachedTodayReading(user.id, activeProfile, date)"));
assert(server.includes("fingerprint") && server.includes("DAILY_COPY_VERSION") && server.includes("profile.id") && server.includes("date"), "cache scoped by exact person and Korean date");
for (const forbidden of ["Math.random(", "new OpenAI(", "grantEntitlement(", "requestPayment(", "generatePaidReport("]) {
  assert(!daily.includes(forbidden) && !server.includes(forbidden), `free daily reading cannot trigger ${forbidden}`);
}
console.log("daily-hidden-stem-and-cycles-regression: PASS", JSON.stringify(measurements));
