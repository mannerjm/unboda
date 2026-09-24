import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateSaju } from "@fullstackfamily/manseryeok";
import { buildTodayReading, DAILY_COPY_VERSION, getTodayDayPillar, getTodayYearPillar } from "../app/lib/dailyUnboda";

assert.equal(DAILY_COPY_VERSION, "daily-v5");

// Audit the two critical time boundaries against the SAME calendar library as
// the natal chart: annual pillar must not jump on Gregorian January 1.
for (const date of ["2025-12-31", "2026-01-01", "2026-02-02", "2026-02-06", "2026-12-31"]) {
  const [y, m, d] = date.split("-").map(Number);
  assert.equal(getTodayYearPillar(date), calculateSaju(y, m, d, 12, 0).yearPillarHanja);
}
assert.equal(getTodayYearPillar("2025-12-31"), getTodayYearPillar("2026-01-01"), "annual pillar must not change on January 1");
assert.equal(getTodayYearPillar("2026-01-01"), getTodayYearPillar("2026-02-02"), "annual pillar must remain on the previous solar-term year before spring onset");
assert.notEqual(getTodayYearPillar("2026-02-02"), getTodayYearPillar("2026-02-06"), "annual pillar must change around the actual spring-onset solar term");
assert.throws(() => getTodayYearPillar("2026-02-29"), "invalid leap date must fail closed");

const server = readFileSync("app/lib/dailyUnboda/server.ts", "utf8");
const page = readFileSync("app/today/page.tsx", "utf8");
assert(server.includes("currentSeunGanji: getTodayYearPillar(date)"), "daily annual context must follow solar-term ganji, not Gregorian year");
assert(server.includes("currentDaeunGanji: profile.birthTimeKnown === true"), "only explicitly confirmed birth time may enable daily decade flow");
assert(!server.includes('profile.birthTime !== "12:00"'), "clock value alone must not establish birth-time certainty");
assert(server.includes("profile.birthTimeKnown === true && saju.hourPillarHanja"), "hour context may only use confirmed birth time");
assert(server.includes("DAILY_COPY_VERSION") && server.includes("userId") && server.includes("profile.id") && server.includes("fingerprint") && server.includes("date"), "readings remain keyed per user, exact profile/birth inputs and Korean date");
assert(page.includes("getProfileFreeAnalysisFoundationStatus(user.id, activeProfile)"));
assert(page.indexOf("if (!isFreeAnalysisFoundationReady(freeAnalysisStatus))") < page.indexOf("getCachedTodayReading(user.id, activeProfile, date)"), "free-saju foundation cannot be bypassed");

// Real, valid solar birth dates (not arbitrary combinations of 60-gabja).
// Calendar coverage: 1940-2008 inclusive in two-year steps, all 12 months,
// early and middle-month days; leap days and solar-term-adjacent dates added.
const birthDates: string[] = [];
for (let year = 1940; year <= 2008; year += 2) {
  for (let month = 1; month <= 12; month++) {
    for (const day of [3, 18]) {
      birthDates.push([year, month, day].map((n, i) => i === 0 ? String(n) : String(n).padStart(2, "0")).join("-"));
    }
  }
}
for (const date of ["1940-02-04", "1978-01-01", "1988-02-03", "1988-02-04", "1991-12-31", "2000-02-29", "2008-02-29"]) {
  if (!birthDates.includes(date)) birthDates.push(date);
}
const publicationDates = Array.from({ length: 60 }, (_, i) =>
  new Date(Date.UTC(2026, 8, 24 + i)).toISOString().slice(0, 10),
);
const days = publicationDates.map(date => ({ date, dayPillarHanja: getTodayDayPillar(date), currentSeunGanji: getTodayYearPillar(date) }));

type Counts = { date: string; topics30: number; topics60: number; flows60: number; actions30: number; actions60: number; full30: number; full60: number; maxTopicLength: number };
const samples: Counts[] = [];
const sameDayResults = new Set<string>();
const byNatalDay = new Map<string, Set<string>>();
const signaturesByDate = publicationDates.map(() => new Set<string>());
let deterministicChecks = 0;
let hiddenStemChecks = 0;
for (const birthDate of birthDates) {
  const [year, month, day] = birthDate.split("-").map(Number);
  const dateObject = new Date(Date.UTC(year, month - 1, day));
  assert.equal(dateObject.toISOString().slice(0, 10), birthDate);
  const natal = calculateSaju(year, month, day, 12, 0);
  assert.match(natal.dayPillarHanja, /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
  assert.match(natal.monthPillarHanja, /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
  assert.match(natal.yearPillarHanja, /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
  const topics = new Set<string>();
  const flows = new Set<string>();
  const actions = new Set<string>();
  const full = new Set<string>();
  const first30Topics = new Set<string>();
  const first30Actions = new Set<string>();
  const first30Full = new Set<string>();
  let maxTopicLength = 0;
  const personal = {
    personDayStem: natal.dayPillarHanja[0],
    personDayBranch: natal.dayPillarHanja[1],
    personMonthPillarHanja: natal.monthPillarHanja,
    personYearPillarHanja: natal.yearPillarHanja,
  };
  for (let index = 0; index < days.length; index++) {
    const input = { ...days[index], ...personal };
    const result = buildTodayReading(input);
    assert.equal(result.date, days[index].date);
    assert.equal(result.dayPillarHanja, days[index].dayPillarHanja);
    assert(result.topic && result.flow && result.action);
    if (index === 0 && birthDates.indexOf(birthDate) % 101 === 0) {
      assert.deepEqual(buildTodayReading(input), result, "exact repeat must be deterministic");
      deterministicChecks++;
    }
    if (index === 0) {
      assert(result.hiddenStemTenGod, "actual today hidden stem must be resolved");
      hiddenStemChecks++;
    }
    const signature = JSON.stringify([result.topic, result.flow, result.action]);
    topics.add(result.topic);
    flows.add(result.flow);
    actions.add(result.action);
    full.add(signature);
    signaturesByDate[index].add(signature);
    maxTopicLength = Math.max(maxTopicLength, result.topic.length);
    if (index < 30) {
      first30Topics.add(result.topic);
      first30Actions.add(result.action);
      first30Full.add(signature);
    }
    if (index === 0) {
      sameDayResults.add(signature);
      const bucket = byNatalDay.get(natal.dayPillarHanja) ?? new Set<string>();
      bucket.add(signature);
      byNatalDay.set(natal.dayPillarHanja, bucket);
    }
  }
  samples.push({
    date: birthDate, topics30: first30Topics.size, topics60: topics.size,
    flows60: flows.size, actions30: first30Actions.size, actions60: actions.size,
    full30: first30Full.size, full60: full.size, maxTopicLength,
  });
}
const range = (key: keyof Omit<Counts, "date">) => {
  const numbers = samples.map(x => x[key]);
  return { min: Math.min(...numbers), max: Math.max(...numbers), average: Number((numbers.reduce((a, b) => a + b, 0) / numbers.length).toFixed(2)) };
};
const differentOutputsWithSameDayPillar = [...byNatalDay.values()].filter(x => x.size > 1).length;
assert.equal(samples.length, birthDates.length);
assert(samples.length >= 840 && days.length === 60);
assert(differentOutputsWithSameDayPillar > 0, "month/year differences must survive identical natal day pillars");
assert(sameDayResults.size > 30, "different solar birthdays must produce distinguishable same-day readings");
assert(samples.every(row => row.full60 >= row.full30 && row.topics60 >= row.topics30 && row.actions60 >= row.actions30));
const metrics = {
  sampleKind: "stratified real solar-calendar birth dates; no birth-hour/verified-time/lunar/gender variation or probability weighting",
  birthCount: birthDates.length,
  publicationWindow: [publicationDates[0], publicationDates.at(-1)],
  evaluatedReadings: birthDates.length * days.length,
  uniqueSameDateReadings: sameDayResults.size,
  uniqueAcrossAllDates: new Set(signaturesByDate.flatMap(group => [...group])).size,
  distinctNatalDayPillars: byNatalDay.size,
  natalDayPillarGroupsWithDifferentSameDayText: differentOutputsWithSameDayPillar,
  sameDateTextRange: { min: Math.min(...signaturesByDate.map(set => set.size)), max: Math.max(...signaturesByDate.map(set => set.size)) },
  topics30: range("topics30"), topics60: range("topics60"),
  actions30: range("actions30"), actions60: range("actions60"),
  flows60: range("flows60"), full30: range("full30"), full60: range("full60"),
  maxTopicLength: range("maxTopicLength"),
  exampleBirthDates: [samples[0], samples[101], samples[357], samples.at(-1)],
  deterministicChecks, hiddenStemChecks,
};
console.log("daily-real-birth-accuracy-and-diversity-audit: PASS", JSON.stringify(metrics));