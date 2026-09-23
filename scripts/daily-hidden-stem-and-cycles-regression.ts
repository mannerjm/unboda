import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateSaju } from "@fullstackfamily/manseryeok";
import { buildTodayReading, getTodayDayPillar, normalizeDailyCyclePillar, DAILY_COPY_VERSION } from "../app/lib/dailyUnboda";
import { BRANCH_HIDDEN_STEMS } from "../app/lib/weights";
import { getTenGod } from "../app/lib/tenGod";
import { calculateSeun } from "../app/lib/seun";

assert.equal(DAILY_COPY_VERSION, "daily-v4", "daily-v4 must invalidate older cached copy");
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
assert(annual.topic.includes("새로운 표현"), "primary hidden ten-god must refine visible headline");
assert(annual.topic.includes("올해 조율"), "computed annual cycle must refine visible headline");
assert(annual.action.includes("맞춰 볼 기준 한 가지"), "cycle must refine a single meaningful daily action");
assert(annual.flow.includes("본기(주된 지장간) 丁") && annual.flow.includes("올해 세운의 지지와 오늘 지지는 합"), "daily copy must attribute concrete hidden and cycle grounds");
assert.notEqual(annual.topic, base.topic, "actual seun relation may change the title");
assert.notEqual(annual.action, base.action, "actual seun relation may change the one action");
assert.equal(base.cycleFocus, null);
assert.equal(base.hiddenStemTenGod, annual.hiddenStemTenGod);

const decade = buildTodayReading({ date, ...natal, currentDaeunGanji: "계축" });
assert.equal(decade.cycleFocus, "daeun");
assert(decade.topic.includes("대운 기대 확인") && decade.flow.includes("현재 대운의 지지"), "existing available decade cycle can be selected");
const both = buildTodayReading({ date, ...natal, currentSeunGanji: "기미", currentDaeunGanji: "계축" });
assert.equal(both.cycleFocus, "seun", "concrete non-neutral annual branch relation wins by documented priority");
assert(both.flow.includes("현재 대운의 지지에서도 해 관계"), "other concurrent real cycle is identified without overriding the focus");

const withoutFullNatal = buildTodayReading({ date, personDayStem: "甲", personDayBranch: "子", dayPillarHanja: "庚午", currentSeunGanji: "기미" });
assert.equal(withoutFullNatal.hiddenStemTenGod, undefined, "incomplete natal pillars may not claim full personal interpretation");
assert.equal(withoutFullNatal.cycleFocus, undefined, "incomplete natal pillars fall back to earlier safe reading");
assert.equal(withoutFullNatal.topic, "책임과 대응");

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
    const currentYear = Number(currentDate.slice(0, 4));
    const seun = calculateSeun(year, currentYear, person.dayPillarHanja[0], 1).items[0]?.ganji;
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
  assert(topics.size >= 10 && flows.size >= 20 && actions.size >= 10, "60-day results must retain meaningful variety");
  assert(results.every(row => row.hiddenStemTenGod && row.action.length > 12 && row.topic.length > 8));
  return { birth: `${year}-${month}-${day}`, topics: topics.size, flows: flows.size, actions: actions.size, maxTopicLength: Math.max(...results.map(row => row.topic.length)) };
});
const server = readFileSync("app/lib/dailyUnboda/server.ts", "utf8");
const page = readFileSync("app/today/page.tsx", "utf8");
const daily = readFileSync("app/lib/dailyUnboda.ts", "utf8");
assert(server.includes("currentSeunGanji: saju.currentSeun?.ganji ?? null"), "annual period must come from actual existing saju engine");
assert(server.includes('profile.birthTime !== "12:00"') && server.includes("saju.currentDaeun?.ganji ?? null"), "unconfirmed default noon cannot be treated as a trustworthy decade start age");
assert(!server.includes("verifiedHourPillarHanja:"), "saved default noon is not a confirmed hour pillar");
assert(page.includes("getProfileFreeAnalysisFoundationStatus(user.id, activeProfile)"));
assert(page.includes("getCachedTodayReading(user.id, activeProfile, date)"));
assert(server.includes("fingerprint") && server.includes("DAILY_COPY_VERSION") && server.includes("profile.id") && server.includes("date"), "cache scoped by exact person and Korean date");
for (const forbidden of ["Math.random(", "new OpenAI(", "grantEntitlement(", "requestPayment(", "generatePaidReport("]) {
  assert(!daily.includes(forbidden) && !server.includes(forbidden), `free daily reading cannot trigger ${forbidden}`);
}
console.log("daily-hidden-stem-and-cycles-regression: PASS", JSON.stringify(measurements));
