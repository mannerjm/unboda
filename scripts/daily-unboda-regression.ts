import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateSaju } from "@fullstackfamily/manseryeok";
import { buildTodayReading, getTodayDayPillar } from "../app/lib/dailyUnboda";
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
assert.throws(() => buildTodayReading({ date, personDayStem: "X", dayPillarHanja: pillar }));
assert.equal(getKoreaEvaluationDate(new Date("2026-09-22T15:00:00.000Z")), date, "KST midnight must select the new civil date");
assert.equal(getKoreaEvaluationDate(new Date("2026-09-22T14:59:59.000Z")), "2026-09-22");

const page = readFileSync("app/today/page.tsx", "utf8");
const home = readFileSync("app/components/HomeExperience.tsx", "utf8");
const shell = readFileSync("app/components/AppShell.tsx", "utf8");
const daily = readFileSync("app/lib/dailyUnboda.ts", "utf8");
assert(page.includes('if (!user) redirect("/auth/login?returnTo=/today")'));
assert(page.includes('profile.relationshipType === "self"'), "daily reading must not switch to an active family profile");
assert(page.includes("getSaju(") && page.includes("getTodayDayPillar(date)"));
assert(home.includes("<DailyVisitEntry state={state}/>") && home.includes("매일 무료"));
assert(shell.includes('{ href: "/today", label: "오늘의 운보다"'));
assert(!page.includes("buildFreeAnalysisResponse") && !page.includes("/api/analyze"));
for (const source of [page, daily]) {
  for (const forbidden of ["from \"openai\"", "new OpenAI(", "generateMainAnalysis(", "generatePaidReport(", "requestPayment(", "grantEntitlement(", "debitCredit(", "/checkout/"]) {
    assert(!source.toLowerCase().includes(forbidden.toLowerCase()), `daily source must not include ${forbidden}`);
  }
}
assert(!page.includes("/deep-analysis") && !page.includes("/ai-consulting"), "daily content must not sell reports or consulting");
console.log("daily-unboda-regression: OK");
