import {
  generateCalibrationProduct,
  getCalibrationProcessExitCode,
} from "../app/lib/paidAnalysisV4CalibrationHarness";
import { isPaidAnalysisV4RuntimeEnabled } from "../app/lib/paidAnalysisV4Runtime";

const PRODUCT_ID = "career-job-change";
const LOG_CHUNK_SIZE = 3000;

async function main(): Promise<void> {
  if (process.env.VERCEL_ENV !== "preview") {
    throw new Error("V4 preview smoke is allowed only in Vercel Preview.");
  }
  if (process.env.V4_CALIBRATION_CONFIRM !== "yes") {
    throw new Error("V4 preview smoke requires V4_CALIBRATION_CONFIRM=yes.");
  }
  if (!isPaidAnalysisV4RuntimeEnabled()) {
    throw new Error("V4 preview smoke requires PAID_ANALYSIS_V4_RUNTIME_ENABLED=true.");
  }

  console.log("[v4-preview-smoke] START", { productId: PRODUCT_ID });
  const artifact = await generateCalibrationProduct(PRODUCT_ID);
  const payload = JSON.stringify(artifact);
  const chunkCount = Math.ceil(payload.length / LOG_CHUNK_SIZE);

  console.log("[v4-preview-smoke] RESULT", {
    productId: artifact.productId,
    status: artifact.status,
    validation: artifact.validation.status,
    failureStage: artifact.failureStage ?? null,
    contractVersion: artifact.contractVersion,
    usage: artifact.usage,
    payloadLength: payload.length,
    chunkCount,
  });

  for (let index = 0; index < chunkCount; index += 1) {
    const chunk = payload.slice(index * LOG_CHUNK_SIZE, (index + 1) * LOG_CHUNK_SIZE);
    console.log(`[v4-preview-smoke] ARTIFACT_CHUNK ${index + 1}/${chunkCount} ${chunk}`);
  }

  if (getCalibrationProcessExitCode(artifact) !== 0) {
    throw new Error("V4 preview smoke generation or validation failed.");
  }

  console.log("[v4-preview-smoke] PASS");
}

void main().catch((error: unknown) => {
  console.error("[v4-preview-smoke] FAIL", {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message.slice(0, 800) : "unknown failure",
  });
  process.exitCode = 1;
});
