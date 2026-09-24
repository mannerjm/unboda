import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateSaju } from "@fullstackfamily/manseryeok";
import { buildTodayReading, DAILY_COPY_VERSION, getTodayDayPillar, getTodayYearPillar } from "../app/lib/dailyUnboda";

assert.equal(DAILY_COPY_VERSION, "daily-v6", "edited visible copy must invalidate existing cached daily-v5 text");
const jargon = /천간|지지|지장간|십성|오행|세운|대운|일간|일주|월주|연주|시주|본기\(|[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]|(?:합|충|형|파|해) 관계/;
const births = [[1985, 2, 14], [1991, 7, 9], [2000, 12, 1], [1978, 10, 27], [1996, 4, 19], [1988, 8, 31]] as const;
let checked = 0;
for (const [year, month, day] of births) {
  const natal = calculateSaju(year, month, day, 12, 0);
  for (let index = 0; index < 60; index++) {
    const date = new Date(Date.UTC(2026, 8, 24 + index)).toISOString().slice(0, 10);
    const input = {
      date,
      personDayStem: natal.dayPillarHanja[0],
      personDayBranch: natal.dayPillarHanja[1],
      personMonthPillarHanja: natal.monthPillarHanja,
      personYearPillarHanja: natal.yearPillarHanja,
      dayPillarHanja: getTodayDayPillar(date),
      currentSeunGanji: getTodayYearPillar(date),
    };
    const reading = buildTodayReading(input);
    assert.equal(reading.topic, buildTodayReading(input).topic, "same profile+date must have stable title");
    assert(!jargon.test(reading.topic + reading.flow + reading.action), "no customer-facing saju technical terms");
    assert(reading.topic.length <= 32 && reading.topic.length >= 7, "a glanceable daily headline");
    assert(reading.flow.length <= 185 && reading.flow.length >= 55, "readable note without a technical paragraph");
    assert((reading.flow.match(/[.!?](?=\s|$)/g) ?? []).length <= 3, "only 2–3 short sentences");
    assert(reading.action.length <= 85 && reading.action.length >= 17, "single short practical suggestion");
    assert(!/[\n\r]/.test(reading.flow + reading.action), "compact reading without dense formatting");
    checked++;
  }
}
const page = readFileSync("app/today/page.tsx", "utf8");
const server = readFileSync("app/lib/dailyUnboda/server.ts", "utf8");
assert(page.indexOf("{reading.topic}") < page.indexOf("{reading.flow}") && page.indexOf("{reading.flow}") < page.indexOf("{reading.action}"));
assert(server.includes("getProfileFingerprint(profile)") && server.includes("DAILY_COPY_VERSION"));
assert(!server.includes("new OpenAI(") && !server.includes("requestPayment("));
console.log("daily-plain-language-customer-copy-regression: PASS", JSON.stringify({ checked, example: buildTodayReading({
  date:"2026-09-24", personDayStem:"甲", personDayBranch:"子",
  personMonthPillarHanja:"丙寅", personYearPillarHanja:"庚午",
  dayPillarHanja:getTodayDayPillar("2026-09-24"), currentSeunGanji:getTodayYearPillar("2026-09-24"),
}).topic }));
