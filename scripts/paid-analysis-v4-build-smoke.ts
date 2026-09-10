import { buildPaidAnalysisInputFromProfile } from "../app/lib/paidAnalysisProfileInput";
import { generatePaidAnalysisDetailV4WithConsistencyRetry } from "../app/lib/paidAnalysisV4ConsistencyRetry";
import {
  auditPaidAnalysisV4ActualOutputTier,
  auditPaidAnalysisV4ActualTierSample,
  type PaidAnalysisV4ActualTierSample,
} from "../app/lib/paidAnalysisV4ActualOutputTierQuality";
import { getPaidAnalysisEngine } from "../app/lib/paidAnalysisEngine";
import { validatePaidAnalysisV4HealthSafety } from "../app/lib/paidAnalysisV4HealthSafetyValidator";
import { getProductPricing } from "../app/lib/productPricing";
import type { PaidAnalysisResponseTelemetry } from "../app/lib/ai/generateAnalysisText";
import type { ProfileDto } from "../app/lib/profiles/types";

const RUN_MESSAGE = "Run V4 price-tier output calibration";
const SHOULD_RUN =
  process.env.VERCEL_ENV === "preview" &&
  process.env.VERCEL_GIT_COMMIT_REF === "test/v4-one-product-smoke" &&
  process.env.VERCEL_GIT_COMMIT_MESSAGE === RUN_MESSAGE;

// First live threshold calibration: one representative from every price family.
// All 54 products were already generated in the earlier six-batch Launch smoke;
// this run tests the new price-value validator before widening the sample.
const PRODUCT_IDS = [
  "career-job-change", // CORE 9,900
  "relationship-current", // DEEP 16,900
  "yearly-current", // LONG_RANGE 29,900
  "lifetime-overview", // SIGNATURE 39,900
] as const;

const SYNTHETIC_PROFILE: ProfileDto = {
  id: "00000000-0000-0000-0000-000000000000",
  label: "Synthetic V4 price-tier calibration persona",
  relationshipType: "self",
  birthDate: "1995-05-20",
  birthTime: "09:00",
  calendarType: "양력",
  isLeapMonth: false,
  gender: "남성",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

async function main(): Promise<void> {
  if (!SHOULD_RUN) {
    console.log("[v4-price-output-calibration] skipped");
    return;
  }

  console.log(
    `[v4-price-output-calibration] START count=${PRODUCT_IDS.length} ids=${PRODUCT_IDS.join(",")}`,
  );

  const samples: PaidAnalysisV4ActualTierSample[] = [];
  const failures: Array<{ productId: string; error: string }> = [];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= PRODUCT_IDS.length) return;
      const productId = PRODUCT_IDS[index];
      const pricing = getProductPricing(productId);
      const engine = getPaidAnalysisEngine(productId);
      let usage: PaidAnalysisResponseTelemetry | null = null;

      try {
        console.log(
          `[v4-price-output-calibration] PRODUCT_START productId=${productId} family=${pricing.family} engine=${engine ?? "unknown"}`,
        );
        const input = buildPaidAnalysisInputFromProfile(
          SYNTHETIC_PROFILE,
          productId,
          "2026-08-25",
        );
        const output = await generatePaidAnalysisDetailV4WithConsistencyRetry(input, {
          onResponseTelemetry: (telemetry) => {
            usage = telemetry;
          },
        });

        if (engine === "HEALTH") {
          const healthSafety = validatePaidAnalysisV4HealthSafety(output);
          if (!healthSafety.ok) {
            throw new Error(
              `health safety failed: ${healthSafety.issues
                .map((issue) => `${issue.field}:${issue.message}`)
                .join(" | ")}`,
            );
          }
        }

        const audit = auditPaidAnalysisV4ActualOutputTier(productId, output);
        const warnings = audit.issues.filter((issue) => issue.severity === "warning");
        const errors = audit.issues.filter((issue) => issue.severity === "error");

        console.log("[v4-price-output-calibration] PRODUCT_RESULT", {
          productId,
          family: pricing.family,
          ok: audit.ok,
          direction: output.conclusion.direction,
          focus: output.conclusion.focus,
          depthUnits: audit.metrics.depthUnits,
          evidence: `${audit.metrics.distinctEvidenceKeyCount}/${audit.metrics.evidenceCount}`,
          actions: `${audit.metrics.distinctActionTargetCount}/${audit.metrics.actionCount}`,
          ownershipFocusHits: audit.metrics.ownershipFocusHitCount,
          ownershipActionHits: audit.metrics.ownershipActionHitCount,
          periodTimelineItems: audit.metrics.periodTimelineItemCount,
          periodKeyPoints: audit.metrics.periodKeyPointCount,
          periodSegmentsWithActions: audit.metrics.periodSegmentActionCount,
          periodSegmentsWithCautions: audit.metrics.periodSegmentCautionCount,
          decisionCheckCount: audit.metrics.decisionCheckCount,
          linkageWarningCount: audit.metrics.linkageWarningCount,
          warnings: warnings.map((issue) => `${issue.field}:${issue.message}`),
          errors: errors.map((issue) => `${issue.field}:${issue.message}`),
          usage,
        });

        if (!audit.ok) {
          throw new Error(
            errors.map((issue) => `${issue.field}:${issue.message}`).join(" | "),
          );
        }

        samples.push({ productId, output });
      } catch (error) {
        failures.push({
          productId,
          error: error instanceof Error ? error.message : "unknown failure",
        });
        console.error(
          "[v4-price-output-calibration] PRODUCT_FAIL",
          failures[failures.length - 1],
        );
      }
    }
  }

  await Promise.all([worker(), worker()]);

  if (failures.length > 0) {
    console.error("[v4-price-output-calibration] SAMPLE_FAIL", { failures });
    process.exitCode = 1;
    return;
  }

  const sampleAudit = auditPaidAnalysisV4ActualTierSample(samples);
  console.log("[v4-price-output-calibration] FAMILY_RESULT", {
    ok: sampleAudit.ok,
    familyAverageDepthUnits: sampleAudit.familyAverageDepthUnits,
    errors: sampleAudit.issues.map((issue) => `${issue.field}:${issue.message}`),
  });

  if (!sampleAudit.ok) {
    process.exitCode = 1;
    return;
  }

  console.log(
    `[v4-price-output-calibration] PASS count=${samples.length} CORE=${sampleAudit.familyAverageDepthUnits.CORE} DEEP=${sampleAudit.familyAverageDepthUnits.DEEP} LONG_RANGE=${sampleAudit.familyAverageDepthUnits.LONG_RANGE} SIGNATURE=${sampleAudit.familyAverageDepthUnits.SIGNATURE}`,
  );
}

main().catch((error) => {
  console.error("[v4-price-output-calibration] UNEXPECTED_FAILURE", {
    error: error instanceof Error ? error.message : "unknown",
  });
  process.exitCode = 1;
});
