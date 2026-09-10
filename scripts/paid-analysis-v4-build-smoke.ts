import { generateCalibrationProduct } from "../app/lib/paidAnalysisV4CalibrationHarness";

// This Preview-only runner intentionally generates exactly one synthetic V4 product.
const SHOULD_RUN =
  process.env.VERCEL_ENV === "preview" &&
  process.env.VERCEL_GIT_COMMIT_REF === "test/v4-one-product-smoke" &&
  process.env.VERCEL_GIT_COMMIT_MESSAGE === "Inspect V4 smoke evidence linkage";

async function main(): Promise<void> {
  if (!SHOULD_RUN) {
    console.log("[v4-build-smoke] skipped");
    return;
  }

  const productId = "career-job-change";
  console.log(`[v4-build-smoke] starting productId=${productId}`);

  const artifact = await generateCalibrationProduct(productId);

  if (artifact.status !== "completed" || artifact.validation.status !== "passed" || !artifact.result) {
    console.error("[v4-build-smoke] FAILED", {
      productId,
      status: artifact.status,
      validation: artifact.validation.status,
      failureStage: artifact.failureStage ?? null,
      error: artifact.validation.error ?? null,
      usage: artifact.usage,
    });
    process.exitCode = 1;
    return;
  }

  const result = artifact.result;
  console.log("[v4-build-smoke] PASSED", {
    productId,
    contractVersion: artifact.contractVersion,
    conclusion: {
      direction: result.conclusion.direction,
      focus: result.conclusion.focus,
    },
    evidence: result.evidence.map((item, index) => ({
      index,
      evidenceKey: item.evidenceKey,
      meaning: item.meaning,
      linkage: item.linkage,
      containsDirection: item.linkage.includes(result.conclusion.direction),
      containsExactFocus: item.linkage.includes(result.conclusion.focus),
    })),
    usage: artifact.usage,
  });
}

main().catch((error) => {
  console.error("[v4-build-smoke] UNEXPECTED_FAILURE", {
    error: error instanceof Error ? error.message : "unknown",
  });
  process.exitCode = 1;
});
