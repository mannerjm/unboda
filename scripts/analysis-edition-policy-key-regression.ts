// STEP 57D-48F-B: analysis edition policy + edition key foundation regression.
//
// Proves: (A) exhaustive 54-product policy mapping, (B-J) deterministic
// edition-key formats per policy including month/year rollover boundaries,
// (K) host-timezone independence, (L) fail-closed on unknown/non-launch
// productIds.
import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { getLaunchProductIds } from "../app/lib/paidAnalysisTopicConfig";
import {
  getAnalysisEditionPolicy,
  getConfiguredEditionPolicyProductIds,
} from "../app/lib/analysisEditionPolicy";
import {
  computeAnalysisEditionKey,
  MissingDaeunFortuneInputError,
  UnresolvableEditionPolicyError,
} from "../app/lib/analysisEditionKey";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

// --- A. exactly 54 launch products mapped, no duplicates, no gaps ---
const launchIds = getLaunchProductIds();
const configuredIds = getConfiguredEditionPolicyProductIds();

assert(launchIds.length === 54, `expected exactly 54 launch products, found ${launchIds.length}`);
assert(configuredIds.length === new Set(configuredIds).size, "policy config must not contain duplicate productIds");
assert(configuredIds.length === launchIds.length, "policy config must map every launch product exactly once, no more, no fewer");

for (const productId of launchIds) {
  const policy = getAnalysisEditionPolicy(productId);
  assert(policy !== null, `launch product "${productId}" must resolve to a configured edition policy`);
}

const ALLOWED = new Set(["MONTHLY", "YEARLY", "TARGET_MONTH", "TARGET_YEAR", "ROLLING_MULTIYEAR", "DAEUN", "LIFETIME"]);
for (const productId of configuredIds) {
  const policy = getAnalysisEditionPolicy(productId);
  assert(policy !== null && ALLOWED.has(policy), `"${productId}" must map to an allowed policy enum value`);
}

// non-launch products must never be accidentally activated
assert(getAnalysisEditionPolicy("monthly-12months") === null, "non-launch monthly-12months must not resolve to a policy");
assert(getAnalysisEditionPolicy("not-a-real-product") === null, "unknown productId must not resolve to a policy");
console.log("A. all 54 launch products mapped exactly once, non-launch products excluded ✓");

// --- B. MONTHLY (TOPIC), e.g. career-job-change ---
assert(getAnalysisEditionPolicy("career-job-change") === "MONTHLY", "career-job-change must be MONTHLY");
assert(
  computeAnalysisEditionKey({ productId: "career-job-change", anchorDate: "2026-09-30" }) === "MONTH:2026-09",
  "MONTHLY must format as MONTH:YYYY-MM for the pre-boundary date",
);
assert(
  computeAnalysisEditionKey({ productId: "career-job-change", anchorDate: "2026-10-01" }) === "MONTH:2026-10",
  "MONTHLY must roll over at the month boundary",
);
console.log("B. MONTHLY edition key format + month-boundary rollover ✓");

// --- C. YEARLY (TOPIC), e.g. wealth ---
assert(getAnalysisEditionPolicy("wealth") === "YEARLY", "wealth must be YEARLY");
assert(
  computeAnalysisEditionKey({ productId: "wealth", anchorDate: "2026-12-31" }) === "YEAR:2026",
  "YEARLY must format as YEAR:YYYY for the pre-boundary date",
);
assert(
  computeAnalysisEditionKey({ productId: "wealth", anchorDate: "2027-01-01" }) === "YEAR:2027",
  "YEARLY must roll over at the year boundary",
);
console.log("C. YEARLY edition key format + year-boundary rollover ✓");

// --- D. monthly-current -> TARGET_MONTH(current) ---
assert(getAnalysisEditionPolicy("monthly-current") === "TARGET_MONTH", "monthly-current must be TARGET_MONTH");
assert(
  computeAnalysisEditionKey({ productId: "monthly-current", anchorDate: "2026-09-15" }) === "TARGET_MONTH:2026-09",
  "monthly-current must key on the current month",
);
console.log("D. monthly-current TARGET_MONTH(current) ✓");

// --- E. monthly-next -> TARGET_MONTH(next), including December -> January rollover ---
assert(getAnalysisEditionPolicy("monthly-next") === "TARGET_MONTH", "monthly-next must be TARGET_MONTH");
assert(
  computeAnalysisEditionKey({ productId: "monthly-next", anchorDate: "2026-09-15" }) === "TARGET_MONTH:2026-10",
  "monthly-next must key on the following month",
);
assert(
  computeAnalysisEditionKey({ productId: "monthly-next", anchorDate: "2026-12-15" }) === "TARGET_MONTH:2027-01",
  "monthly-next must roll over December -> January across the year boundary",
);
console.log("E. monthly-next TARGET_MONTH(next) including Dec->Jan rollover ✓");

// --- F. yearly-current -> TARGET_YEAR(current) ---
assert(getAnalysisEditionPolicy("yearly-current") === "TARGET_YEAR", "yearly-current must be TARGET_YEAR");
assert(
  computeAnalysisEditionKey({ productId: "yearly-current", anchorDate: "2026-06-01" }) === "TARGET_YEAR:2026",
  "yearly-current must key on the current year",
);
console.log("F. yearly-current TARGET_YEAR(current) ✓");

// --- G. annual-next -> TARGET_YEAR(next), including year rollover ---
assert(getAnalysisEditionPolicy("annual-next") === "TARGET_YEAR", "annual-next must be TARGET_YEAR");
assert(
  computeAnalysisEditionKey({ productId: "annual-next", anchorDate: "2026-06-01" }) === "TARGET_YEAR:2027",
  "annual-next must key on the following year",
);
assert(
  computeAnalysisEditionKey({ productId: "annual-next", anchorDate: "2026-12-31" }) === "TARGET_YEAR:2027",
  "annual-next must still resolve to next year right at the pre-boundary date",
);
assert(
  computeAnalysisEditionKey({ productId: "annual-next", anchorDate: "2027-01-01" }) === "TARGET_YEAR:2028",
  "annual-next must roll forward again once the year itself has rolled over",
);
console.log("G. annual-next TARGET_YEAR(next) including year rollover ✓");

// --- H. annual-3years -> deterministic ROLLING_MULTIYEAR range ---
assert(getAnalysisEditionPolicy("annual-3years") === "ROLLING_MULTIYEAR", "annual-3years must be ROLLING_MULTIYEAR");
assert(
  computeAnalysisEditionKey({ productId: "annual-3years", anchorDate: "2026-06-01" }) === "RANGE:2026-2028",
  "annual-3years must key on the deterministic 3-year range",
);
console.log("H. annual-3years deterministic RANGE ✓");

// --- I. daeun-current -> deterministic stable DAEUN key ---
assert(getAnalysisEditionPolicy("daeun-current") === "DAEUN", "daeun-current must be DAEUN");
const daeunKey = computeAnalysisEditionKey({
  productId: "daeun-current",
  anchorDate: "2026-08-17",
  fortune: { daeunOrder: 4, daeunGanji: "무인", seunGanji: "병오" },
});
assert(daeunKey === "DAEUN:4:무인", "DAEUN key must combine the stable ordinal and structural ganji, not the ordinal alone");
const daeunKeyRepeat = computeAnalysisEditionKey({
  productId: "daeun-current",
  anchorDate: "2026-08-17",
  fortune: { daeunOrder: 4, daeunGanji: "무인", seunGanji: "병오" },
});
assert(daeunKey === daeunKeyRepeat, "DAEUN key must be deterministic for identical fortune input");
let daeunFailedClosed = false;
try {
  computeAnalysisEditionKey({ productId: "daeun-current", anchorDate: "2026-08-17" });
} catch (error) {
  daeunFailedClosed = error instanceof MissingDaeunFortuneInputError;
}
assert(daeunFailedClosed, "DAEUN must fail closed (not silently key on an incomplete/guessed value) when fortune input is missing");
console.log("I. daeun-current deterministic DAEUN:<order>:<ganji> key, fails closed without fortune input ✓");

// --- J. lifetime-overview (PERIOD) and career-job-fit (TOPIC) -> bare LIFETIME ---
assert(getAnalysisEditionPolicy("lifetime-overview") === "LIFETIME", "lifetime-overview must be LIFETIME");
assert(computeAnalysisEditionKey({ productId: "lifetime-overview" }) === "LIFETIME", "lifetime-overview must key as bare LIFETIME");
assert(getAnalysisEditionPolicy("career-job-fit") === "LIFETIME", "career-job-fit must be LIFETIME (natal aptitude, not time-aware)");
assert(computeAnalysisEditionKey({ productId: "career-job-fit" }) === "LIFETIME", "career-job-fit must key as bare LIFETIME");
console.log("J. LIFETIME products (TOPIC and PERIOD) key as bare LIFETIME ✓");

// --- K. host timezone independence (explicit anchorDate must never depend on host TZ) ---
function checkUnderTz(tz: string): string {
  const probePath = join(process.cwd(), `scripts/_tmp-edition-key-tz-probe-${process.pid}.ts`);
  writeFileSync(
    probePath,
    [
      'import { computeAnalysisEditionKey } from "../app/lib/analysisEditionKey";',
      'const key = computeAnalysisEditionKey({ productId: "monthly-next", anchorDate: "2026-12-15" });',
      "process.stdout.write(key);",
    ].join("\n"),
    "utf-8",
  );
  try {
    // shell:true is required on Windows to invoke the npx.cmd batch file directly;
    // args are fixed local literals (no untrusted input), so this is safe here.
    return execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["tsx", probePath], {
      encoding: "utf-8",
      env: { ...process.env, TZ: tz },
      cwd: process.cwd(),
      shell: process.platform === "win32",
    });
  } finally {
    unlinkSync(probePath);
  }
}

const utcKey = checkUnderTz("UTC");
const seoulKey = checkUnderTz("Asia/Seoul");
assert(utcKey === "TARGET_MONTH:2027-01", "TZ=UTC host must still resolve the Dec->Jan rollover key correctly");
assert(seoulKey === "TARGET_MONTH:2027-01", "TZ=Asia/Seoul host must still resolve the Dec->Jan rollover key correctly");
assert(utcKey === seoulKey, "edition key must be host-timezone independent");
console.log("K. edition key computation is host-timezone independent ✓");

// --- L. unknown/non-launch new-sale product fails closed in the policy resolver ---
let unknownFailedClosed = false;
try {
  computeAnalysisEditionKey({ productId: "not-a-real-product" });
} catch (error) {
  unknownFailedClosed = error instanceof UnresolvableEditionPolicyError;
}
assert(unknownFailedClosed, "unknown productId must fail closed, never silently produce a key");

let nonLaunchFailedClosed = false;
try {
  computeAnalysisEditionKey({ productId: "monthly-12months", anchorDate: "2026-09-15" });
} catch (error) {
  nonLaunchFailedClosed = error instanceof UnresolvableEditionPolicyError;
}
assert(nonLaunchFailedClosed, "non-launch monthly-12months must fail closed, never accidentally become edition-purchasable");
console.log("L. unknown/non-launch productIds fail closed in the policy resolver ✓");

console.log("\nanalysis-edition-policy-key-regression passed ✓");
