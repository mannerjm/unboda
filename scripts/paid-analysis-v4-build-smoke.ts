import { buildPaidAnalysisInputFromProfile } from "../app/lib/paidAnalysisProfileInput";
import { generatePaidAnalysisDetailV4WithConsistencyRetry } from "../app/lib/paidAnalysisV4ConsistencyRetry";
import { getPaidAnalysisEngine } from "../app/lib/paidAnalysisEngine";
import { getLaunchProductIds } from "../app/lib/paidAnalysisTopicConfig";
import { reviewEvidenceLinkage } from "../app/lib/paidAnalysisV4QualityValidators";
import { validatePaidAnalysisV4HealthSafety } from "../app/lib/paidAnalysisV4HealthSafetyValidator";
import type { PaidAnalysisResponseTelemetry } from "../app/lib/ai/generateAnalysisText";
import type { ProfileDto } from "../app/lib/profiles/types";

const BATCH_SIZE = 9;
const BATCH_COUNT = 6;
const CONSISTENCY_SMOKE_PRODUCT_ID = "money-income-stability";
const commitMessage = process.env.VERCEL_GIT_COMMIT_MESSAGE ?? "";
const batchMessageMatch = commitMessage.match(/^Run V4 launch batch ([1-6])$/);
const batchNumber = batchMessageMatch ? Number(batchMessageMatch[1]) : null;
const isConsistencySmoke = commitMessage === "Run V4 consistency smoke";
const SHOULD_RUN =
  process.env.VERCEL_ENV === "preview" &&
  process.env.VERCEL_GIT_COMMIT_REF === "test/v4-one-product-smoke" &&
  (batchNumber !== null || isConsistencySmoke);

const launchProductIds = getLaunchProductIds();
if (launchProductIds.length !== 54) {
  throw new Error(`Expected exactly 54 Launch products, got ${launchProductIds.length}`);
}

const PRODUCT_IDS = isConsistencySmoke
  ? [CONSISTENCY_SMOKE_PRODUCT_ID]
  : batchNumber === null
    ? []
    : launchProductIds.slice((batchNumber - 1) * BATCH_SIZE, batchNumber * BATCH_SIZE);

if (batchNumber !== null && PRODUCT_IDS.length !== BATCH_SIZE) {
  throw new Error(
    `Launch batch ${batchNumber}/${BATCH_COUNT} must contain exactly ${BATCH_SIZE} products`,
  );
}

const runLabel = isConsistencySmoke
  ? "consistency-smoke"
  : `batch-${batchNumber ?? "none"}`;

const SYNTHETIC_PROFILE: ProfileDto = {
  id: "00000000-0000-0000-0000-000000000000",
  label: "Synthetic V4 launch calibration persona",
  relationshipType: "self",
  birthDate: "1995-05-20",
  birthTime: "09:00",
  calendarType: "양력",
  isLeapMonth: false,
  gender: "남성",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

type ProductResult = {
  productId: string;
  engine: string | undefined;
  signature: string;
  outputChars: number;
  linkageWarningCount: number;
  usage: PaidAnalysisResponseTelemetry | null;
};

function tokenSet(value: string): Set<string> {
  return new Set(
    value
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2),
  );
}

function overlap(left: string, right: string): number {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return shared / Math.max(leftTokens.size, rightTokens.size);
}

async function generateOne(productId: string): Promise<ProductResult> {
  const engine = getPaidAnalysisEngine(productId);
  let usage: PaidAnalysisResponseTelemetry | null = null;
  const input = buildPaidAnalysisInputFromProfile(
    SYNTHETIC_PROFILE,
    productId,
    "2026-08-25",
  );

  console.log(`[v4-launch-batch] START run=${runLabel} productId=${productId} engine=${engine ?? "unknown"}`);
  const result = await generatePaidAnalysisDetailV4WithConsistencyRetry(input, {
    onResponseTelemetry: (telemetry) => {
      usage = telemetry;
    },
  });

  if (engine === "HEALTH") {
    const healthSafety = validatePaidAnalysisV4HealthSafety(result);
    if (!healthSafety.ok) {
      throw new Error(
        `${productId}: V4 health safety failed: ${healthSafety.issues
          .map((issue) => `${issue.field}:${issue.message}`)
          .join(" | ")}`,
      );
    }
  }

  const linkageWarnings = reviewEvidenceLinkage(result);
  if (linkageWarnings.length > 0) {
    console.log("[v4-launch-batch] LINKAGE_DIAGNOSTIC", {
      runLabel,
      productId,
      direction: result.conclusion.direction,
      focus: result.conclusion.focus,
      warnings: linkageWarnings.map((warning) => {
        const match = warning.field.match(/^evidence\[(\d+)\]\.linkage$/);
        const index = match ? Number(match[1]) : -1;
        return {
          field: warning.field,
          linkage: index >= 0 ? result.evidence[index]?.linkage ?? "" : "",
        };
      }),
    });
  }

  const signature = [
    result.conclusion.focus,
    result.coreProblem.title,
    ...result.timeline.map((item) => item.label),
    ...result.action.map((item) => item.target),
  ].join(" | ");
  const outputChars = JSON.stringify(result).length;

  console.log("[v4-launch-batch] PRODUCT_PASS", {
    runLabel,
    productId,
    engine,
    direction: result.conclusion.direction,
    evidenceCount: result.evidence.length,
    timelineCount: result.timeline.length,
    actionCount: result.action.length,
    decisionCheckCount: result.decisionCheck?.length ?? 0,
    strictLinkageWarningCount: linkageWarnings.length,
    outputChars,
    usage,
  });

  return {
    productId,
    engine,
    signature,
    outputChars,
    linkageWarningCount: linkageWarnings.length,
    usage,
  };
}

async function main(): Promise<void> {
  if (!SHOULD_RUN) {
    console.log("[v4-launch-batch] skipped");
    return;
  }

  console.log(
    `[v4-launch-batch] START run=${runLabel} count=${PRODUCT_IDS.length} ids=${PRODUCT_IDS.join(",")}`,
  );

  const results: ProductResult[] = [];
  const failures: Array<{ productId: string; error: string }> = [];
  let nextIndex = 0;
  const workerCount = isConsistencySmoke ? 1 : 2;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= PRODUCT_IDS.length) return;
      const productId = PRODUCT_IDS[index];
      try {
        results.push(await generateOne(productId));
      } catch (error) {
        failures.push({
          productId,
          error: error instanceof Error ? error.message : "unknown failure",
        });
        console.error("[v4-launch-batch] PRODUCT_FAIL", failures[failures.length - 1]);
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const similarityWarnings: Array<{ left: string; right: string; overlap: number }> = [];
  for (let leftIndex = 0; leftIndex < results.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < results.length; rightIndex += 1) {
      const left = results[leftIndex];
      const right = results[rightIndex];
      if (left.engine !== right.engine) continue;
      const score = overlap(left.signature, right.signature);
      if (score >= 0.65) {
        similarityWarnings.push({
          left: left.productId,
          right: right.productId,
          overlap: Number(score.toFixed(3)),
        });
      }
    }
  }

  console.log("[v4-launch-batch] BATCH_SUMMARY", {
    runLabel,
    requested: PRODUCT_IDS.length,
    passed: results.length,
    failed: failures.length,
    failures,
    similarityWarnings,
    totalLinkageWarnings: results.reduce(
      (sum, item) => sum + item.linkageWarningCount,
      0,
    ),
    totalInputTokens: results.reduce(
      (sum, item) => sum + (item.usage?.inputTokens ?? 0),
      0,
    ),
    totalOutputTokens: results.reduce(
      (sum, item) => sum + (item.usage?.outputTokens ?? 0),
      0,
    ),
    outputChars: results.map((item) => ({
      productId: item.productId,
      outputChars: item.outputChars,
    })),
  });

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[v4-launch-batch] UNEXPECTED_FAILURE", {
    error: error instanceof Error ? error.message : "unknown",
  });
  process.exitCode = 1;
});
