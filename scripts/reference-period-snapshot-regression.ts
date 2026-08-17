import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildReferencePeriodSnapshot,
  getServerAnchorDate,
  type ReferencePeriodSnapshot,
} from "../app/lib/analysisReferencePeriod";
import { parsePaidAnalysisDetailOutputV3 } from "../app/lib/paidAnalysisDetailOutputParser";
import {
  PERIOD_PREMIUM_PRODUCTS,
  TOPIC_PREMIUM_PRODUCTS,
  PREMIUM_PRODUCT_REGISTRY,
} from "../app/lib/premiumProductRegistry";
import { buildPaidAnalysisDetailPromptV3 } from "../app/lib/paidAnalysisDetailPrompt";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function snapshot(productId: string, anchorDate: string, fortune?: Parameters<typeof buildReferencePeriodSnapshot>[0]["fortune"]) {
  const result = buildReferencePeriodSnapshot({ productId, anchorDate, fortune });

  assert(result !== null, `${productId}: snapshot must be created for a PERIOD product`);

  return result as ReferencePeriodSnapshot;
}

// A. monthly-current
const a = snapshot("monthly-current", "2026-08-17");
assert(a.scale === "monthly", "A: scale must be monthly");
assert(a.referenceYear === 2026 && a.referenceMonth === 8, "A: reference must be 2026-08");
assert(
  a.coverage?.from === "2026-08-01" && a.coverage?.to === "2026-08-31",
  `A: coverage must be 2026-08-01~2026-08-31, got ${JSON.stringify(a.coverage)}`,
);
assert(a.labelSnapshot === "2026년 8월 이번달 운", `A: label drifted: ${a.labelSnapshot}`);

// B. monthly-next rollover
const b = snapshot("monthly-next", "2026-12-15");
assert(b.referenceYear === 2027 && b.referenceMonth === 1, "B: 2026-12 must roll over to 2027-01");
assert(
  b.coverage?.from === "2027-01-01" && b.coverage?.to === "2027-01-31",
  `B: coverage must be 2027-01, got ${JSON.stringify(b.coverage)}`,
);
assert(b.labelSnapshot === "2027년 1월 다음달 운", `B: label drifted: ${b.labelSnapshot}`);

// C. leap year
const c = snapshot("monthly-current", "2028-02-10");
assert(c.coverage?.to === "2028-02-29", `C: leap February must end on 29, got ${c.coverage?.to}`);
const nonLeap = snapshot("monthly-current", "2026-02-10");
assert(nonLeap.coverage?.to === "2026-02-28", `C: non-leap February must end on 28, got ${nonLeap.coverage?.to}`);

// D. annual-current
const d = snapshot("annual-current", "2026-08-17");
assert(d.scale === "yearly" && d.referenceYear === 2026, "D: annual-current must anchor on 2026");
assert(
  d.coverage?.from === "2026-01-01" && d.coverage?.to === "2026-12-31",
  "D: annual-current coverage must span the whole year",
);
assert(d.labelSnapshot === "2026년 올해 운", `D: label drifted: ${d.labelSnapshot}`);

// E. annual-next
const e = snapshot("annual-next", "2026-08-17");
assert(e.referenceYear === 2027, "E: annual-next must anchor on 2027");
assert(e.labelSnapshot === "2027년 내년 운", `E: label drifted: ${e.labelSnapshot}`);

// F. annual-3years
const f = snapshot("annual-3years", "2026-08-17");
assert(f.scale === "yearly-series" && f.referenceYear === 2026, "F: annual-3years must start at 2026");
assert(
  f.coverage?.from === "2026-01-01" && f.coverage?.to === "2028-12-31",
  `F: coverage must span 2026~2028, got ${JSON.stringify(f.coverage)}`,
);

// G. monthly-12months
const g = snapshot("monthly-12months", "2026-08-17");
assert(g.scale === "monthly-series", "G: scale must be monthly-series");
assert(g.referenceYear === 2026 && g.referenceMonth === 8, "G: series must start at 2026-08");
assert(
  g.coverage?.from === "2026-08-01" && g.coverage?.to === "2027-07-31",
  `G: coverage must run 2026-08 ~ 2027-07, got ${JSON.stringify(g.coverage)}`,
);

// H. daeun-current reuses the engine values instead of recomputing them
const h = snapshot("daeun-current", "2026-08-17", {
  daeunOrder: 4,
  daeunGanji: "무인",
  seunGanji: "병오",
});
assert(h.scale === "daeun", "H: scale must be daeun");
assert(h.daeunOrder === 4 && h.daeunGanji === "무인" && h.seunGanji === "병오", "H: daeun values must be copied as-is");
assert(h.labelSnapshot.includes("무인"), `H: label must carry the snapshotted daeun: ${h.labelSnapshot}`);

const hMissing = snapshot("daeun-current", "2026-08-17");
assert(
  hMissing.daeunGanji === undefined && hMissing.daeunOrder === undefined,
  "H: missing engine values must stay absent instead of being invented",
);

const referencePeriodSource = readFileSync(
  join(process.cwd(), "app/lib/analysisReferencePeriod.ts"),
  "utf-8",
);
assert(
  !referencePeriodSource.includes("calculateDaeun") && !referencePeriodSource.includes("getSaju"),
  "H: the snapshot builder must not recompute daeun itself",
);

// I. lifetime-overview must not be forced into a finite coverage
const i = snapshot("lifetime-overview", "2026-08-17");
assert(i.scale === "lifetime", "I: scale must be lifetime");
assert(i.coverage === undefined, "I: lifetime must not carry a finite coverage");

// J. every PERIOD product produces a snapshot
assert(PERIOD_PREMIUM_PRODUCTS.length === 8, "J: PERIOD catalog must stay at 8");
for (const product of PERIOD_PREMIUM_PRODUCTS) {
  const result = snapshot(product.id, "2026-08-17");
  assert(result.productId === product.id, `J: ${product.id} snapshot productId mismatch`);
  assert(result.kind === "PERIOD", `J: ${product.id} kind must be PERIOD`);
  assert(result.scale === product.periodType, `J: ${product.id} scale must match periodType`);
  assert(result.anchorDate === "2026-08-17", `J: ${product.id} must keep the injected anchorDate`);
  assert(result.labelSnapshot.length > 0, `J: ${product.id} needs a labelSnapshot`);
}

// K. TOPIC and legacy products never get a snapshot
for (const product of TOPIC_PREMIUM_PRODUCTS) {
  assert(
    buildReferencePeriodSnapshot({ productId: product.id, anchorDate: "2026-08-17" }) === null,
    `K: TOPIC product "${product.id}" must not receive a referencePeriod`,
  );
}
for (const legacyId of Object.keys(PREMIUM_PRODUCT_REGISTRY)) {
  assert(
    buildReferencePeriodSnapshot({ productId: legacyId, anchorDate: "2026-08-17" }) === null,
    `K: legacy product "${legacyId}" must not receive a referencePeriod`,
  );
}
assert(
  buildReferencePeriodSnapshot({ productId: "not-a-product", anchorDate: "2026-08-17" }) === null,
  "K: unknown products must not receive a referencePeriod",
);

// L. deterministic for the same anchor + input
for (const product of PERIOD_PREMIUM_PRODUCTS) {
  const first = snapshot(product.id, "2026-08-17", { daeunOrder: 4, daeunGanji: "무인", seunGanji: "병오" });
  const second = snapshot(product.id, "2026-08-17", { daeunOrder: 4, daeunGanji: "무인", seunGanji: "병오" });
  assert(
    JSON.stringify(first) === JSON.stringify(second),
    `L: ${product.id} snapshot must be deterministic`,
  );
}
assert(
  /^\d{4}-\d{2}-\d{2}$/.test(getServerAnchorDate(new Date(2026, 7, 17))),
  "L: server anchor date must be a plain calendar date",
);
assert(
  getServerAnchorDate(new Date(2026, 7, 17)) === "2026-08-17",
  "L: server anchor date must follow the local calendar day",
);

// M. a stored snapshot wins over today's clock
const storedReport = JSON.parse(
  readFileSync(join(process.cwd(), "scripts/fixtures/paid-report-v3.json"), "utf-8"),
) as Record<string, unknown>;

const storedWithSnapshot = {
  ...storedReport,
  referencePeriod: snapshot("monthly-current", "2020-03-15"),
};
const parsedStored = parsePaidAnalysisDetailOutputV3(storedWithSnapshot);
assert(
  parsedStored.referencePeriod?.labelSnapshot === "2020년 3월 이번달 운",
  "M: stored snapshot must survive parsing unchanged",
);
assert(
  parsedStored.referencePeriod?.anchorDate === "2020-03-15"
    && parsedStored.referencePeriod?.anchorDate !== getServerAnchorDate(),
  "M: stored snapshot must not be refreshed to today",
);

const serviceSource = readFileSync(
  join(process.cwd(), "app/lib/paidAnalysisDetailService.ts"),
  "utf-8",
);
assert(
  serviceSource.includes("referencePeriod: input.referencePeriod"),
  "M: the snapshot must be attached from the generation input, not recomputed",
);
const routeSource = readFileSync(
  join(process.cwd(), "app/api/paid-analysis-detail-v2/route.ts"),
  "utf-8",
);
assert(
  !routeSource.includes("buildReferencePeriodSnapshot"),
  "M: the route must not rebuild the snapshot on completed-report reads",
);
assert(
  routeSource.includes('claim.state === "completed"') && routeSource.includes("claim.report.content"),
  "M: completed reports must still be returned straight from storage",
);
const clientSource = readFileSync(
  join(process.cwd(), "app/paid-analysis/[productId]/PaidAnalysisDetailV2Client.tsx"),
  "utf-8",
);
assert(
  clientSource.includes("detail.referencePeriod")
    && clientSource.includes("detail.referencePeriod.labelSnapshot")
    && !clientSource.includes("buildReferencePeriodSnapshot"),
  "M: the report screen must display the stored labelSnapshot only",
);

// N. legacy V3 reports without referencePeriod still parse
const parsedLegacy = parsePaidAnalysisDetailOutputV3(storedReport);
assert(
  parsedLegacy.referencePeriod === undefined,
  "N: reports stored before P0-8E must parse with no referencePeriod",
);

// O. TOPIC generation input and prompt stay unchanged
const profileInputSource = readFileSync(
  join(process.cwd(), "app/lib/paidAnalysisProfileInput.ts"),
  "utf-8",
);
assert(
  profileInputSource.includes("...(referencePeriod ? { referencePeriod } : {})"),
  "O: the prompt input must omit referencePeriod entirely for TOPIC products",
);

const topicPromptInput = {
  productId: "relationship-conflict",
  analysisType: "갈등 패턴과 회복 방식",
  birthData: "{}",
  originalChart: "{}",
  coreInterpretation: "{}",
  fortuneTiming: "{}",
  sajuSummary: "{}",
  currentFortuneFlow: "{}",
};
const topicPrompt = buildPaidAnalysisDetailPromptV3(topicPromptInput);
assert(
  !topicPrompt.includes("[기간 기준 고정]"),
  "O: TOPIC prompts must not contain the period block",
);

const periodPrompt = buildPaidAnalysisDetailPromptV3({
  ...topicPromptInput,
  productId: "annual-next",
  analysisType: "내년 운",
  referencePeriod: snapshot("annual-next", "2026-08-17"),
});
assert(
  periodPrompt.includes("[기간 기준 고정]")
    && periodPrompt.includes("2027년 내년 운")
    && periodPrompt.includes("기준 연도: 2027년"),
  "O: PERIOD prompts must pin the absolute year instead of a relative phrase",
);

console.log("referencePeriod snapshots:");
for (const product of PERIOD_PREMIUM_PRODUCTS) {
  const result = snapshot(product.id, "2026-08-17", { daeunOrder: 4, daeunGanji: "무인", seunGanji: "병오" });
  console.log(`  ${product.id} → ${result.labelSnapshot}${result.coverage ? ` (${result.coverage.from}~${result.coverage.to})` : ""}`);
}

console.log("\nreference period snapshot regression passed ✓");
