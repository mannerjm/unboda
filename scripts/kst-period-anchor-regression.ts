// STEP 57D-47 PHASE 2: KST calendar-date anchor regression.
//
// Proves getServerAnchorDate() (used by paid period-analysis products) and
// getKoreaEvaluationDate() (used by the free recommendation engine) resolve a
// given instant to the same Korea (Asia/Seoul) calendar date regardless of the
// host process timezone.
import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { getServerAnchorDate } from "../app/lib/analysisReferencePeriod";
import { getKoreaEvaluationDate } from "../app/lib/evaluationContext";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

// KST midnight boundary: 2026-08-31 23:59 KST vs 2026-09-01 00:00 KST.
const monthBefore = new Date("2026-08-31T14:59:00.000Z");
const monthAfter = new Date("2026-08-31T15:00:00.000Z");
assert(getServerAnchorDate(monthBefore) === "2026-08-31", "month boundary BEFORE resolves to 2026-08-31");
assert(getServerAnchorDate(monthAfter) === "2026-09-01", "month boundary AFTER resolves to 2026-09-01");
assert(getKoreaEvaluationDate(monthBefore) === "2026-08-31", "evaluation date agrees on month boundary BEFORE");
assert(getKoreaEvaluationDate(monthAfter) === "2026-09-01", "evaluation date agrees on month boundary AFTER");

// KST year boundary: 2026-12-31 23:59 KST vs 2027-01-01 00:00 KST.
const yearBefore = new Date("2026-12-31T14:59:00.000Z");
const yearAfter = new Date("2026-12-31T15:00:00.000Z");
assert(getServerAnchorDate(yearBefore) === "2026-12-31", "year boundary BEFORE resolves to 2026-12-31");
assert(getServerAnchorDate(yearAfter) === "2027-01-01", "year boundary AFTER resolves to 2027-01-01");
assert(getKoreaEvaluationDate(yearBefore) === "2026-12-31", "evaluation date agrees on year boundary BEFORE");
assert(getKoreaEvaluationDate(yearAfter) === "2027-01-01", "evaluation date agrees on year boundary AFTER");

// Host-timezone independence: spawn the same fixed-instant check under both
// TZ=UTC and TZ=Asia/Seoul in isolated child processes (never mutate this
// process's own environment) and require identical Korea-calendar results.
function checkUnderTz(tz: string): { before: string; after: string } {
  const probePath = join(process.cwd(), `scripts/_tmp-tz-probe-${process.pid}.ts`);
  writeFileSync(
    probePath,
    [
      'import { getServerAnchorDate } from "../app/lib/analysisReferencePeriod";',
      'const before = getServerAnchorDate(new Date("2026-08-31T14:59:00.000Z"));',
      'const after = getServerAnchorDate(new Date("2026-08-31T15:00:00.000Z"));',
      "process.stdout.write(JSON.stringify({ before, after }));",
    ].join("\n"),
    "utf-8",
  );
  try {
    // shell:true is required on Windows to invoke the npx.cmd batch file directly;
    // args are fixed local literals (no untrusted input), so this is safe here.
    const out = execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["tsx", probePath], {
      encoding: "utf-8",
      env: { ...process.env, TZ: tz },
      cwd: process.cwd(),
      shell: process.platform === "win32",
    });
    return JSON.parse(out) as { before: string; after: string };
  } finally {
    unlinkSync(probePath);
  }
}

const utcResult = checkUnderTz("UTC");
const kstResult = checkUnderTz("Asia/Seoul");
assert(utcResult.before === "2026-08-31" && utcResult.after === "2026-09-01", "TZ=UTC host resolves the KST boundary correctly");
assert(kstResult.before === "2026-08-31" && kstResult.after === "2026-09-01", "TZ=Asia/Seoul host resolves the KST boundary correctly");
assert(JSON.stringify(utcResult) === JSON.stringify(kstResult), "result is host-timezone independent");

console.log(JSON.stringify({ monthBoundary: true, yearBoundary: true, hostTzIndependent: true, utcResult, kstResult }));
