import { buildPaidAnalysisInputFromProfile } from "../app/lib/paidAnalysisProfileInput";
import type { PaidAnalysisEvidenceKey } from "../app/lib/paidAnalysisDetailOutput";
import { resolvePaidAnalysisLaunchSpecialization } from "../app/lib/paidAnalysisTopicConfig";
import type { ProfileDto } from "../app/lib/profiles/types";

const RUN_MESSAGE = "Run V4 price-tier output calibration";
const SHOULD_RUN =
  process.env.VERCEL_ENV === "preview" &&
  process.env.VERCEL_GIT_COMMIT_REF === "test/v4-one-product-smoke" &&
  process.env.VERCEL_GIT_COMMIT_MESSAGE === RUN_MESSAGE;

// Deterministic evidence-availability check for the three DEEP failures.
// No OpenAI call, no Production DB/customer data.
const PRODUCT_IDS = [
  "health-stress-regulation",
  "relationship-boundary",
  "business-startup-readiness",
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

function availableEvidenceKeys(
  facts: NonNullable<ReturnType<typeof buildPaidAnalysisInputFromProfile>["evidenceFacts"]>,
): PaidAnalysisEvidenceKey[] {
  return [
    facts.strength ? "strength" : null,
    facts.yongshin ? "yongshin" : null,
    facts.gyeokguk ? "gyeokguk" : null,
    facts.elementBalance ? "element_balance" : null,
    facts.fortuneFlow ? "fortune_flow" : null,
    facts.daeun ? "daeun" : null,
    facts.seun ? "seun" : null,
    facts.elementRelations?.items.length ? "element_relations" : null,
    facts.fortuneBrain &&
    (facts.fortuneBrain.strengths.length > 0 || facts.fortuneBrain.weaknesses.length > 0)
      ? "fortune_brain"
      : null,
  ].filter((key): key is PaidAnalysisEvidenceKey => key !== null);
}

function main(): void {
  if (!SHOULD_RUN) {
    console.log("[v4-evidence-availability] skipped");
    return;
  }

  let failed = false;

  for (const productId of PRODUCT_IDS) {
    const specialization = resolvePaidAnalysisLaunchSpecialization(productId);
    if (specialization.kind !== "topic") {
      throw new Error(`${productId} must resolve to a topic specialization`);
    }

    const input = buildPaidAnalysisInputFromProfile(
      SYNTHETIC_PROFILE,
      productId,
      "2026-08-25",
    );
    if (!input.evidenceFacts) {
      throw new Error(`${productId} must have deterministic evidence facts`);
    }

    const available = availableEvidenceKeys(input.evidenceFacts);
    const required = specialization.config.evidenceFocus;
    const missing = required.filter((key) => !available.includes(key));

    console.log("[v4-evidence-availability] PRODUCT", {
      productId,
      requiredEvidenceKeys: required,
      availableEvidenceKeys: available,
      missingRequiredEvidenceKeys: missing,
    });

    if (missing.length > 0) failed = true;
  }

  if (failed) {
    console.error("[v4-evidence-availability] FAIL required product evidence is unavailable");
    process.exitCode = 1;
    return;
  }

  console.log(`[v4-evidence-availability] PASS count=${PRODUCT_IDS.length}`);
}

main();