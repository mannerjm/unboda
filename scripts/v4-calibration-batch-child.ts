import {
  getCalibrationProcessExitCode,
  runCalibrationHarness,
} from "../app/lib/paidAnalysisV4CalibrationHarness";

const args = process.argv.slice(2);
const productIndex = args.indexOf("--product");
const productId = productIndex >= 0 ? args[productIndex + 1] : undefined;

async function main(): Promise<void> {
  console.log("V4_BATCH_CHILD_START");
  console.log(`V4_BATCH_CHILD_TARGET=${productId ?? "missing"}`);
  const success = await runCalibrationHarness(args);
  if (getCalibrationProcessExitCode({
    status: success ? "completed" : "failed",
    validation: { status: success ? "passed" : "failed" },
  }) !== 0) {
    console.error(`V4_BATCH_CHILD_RESULT_FAILED productId=${productId ?? "missing"}`);
    process.exitCode = 1;
  }
  console.log("V4_BATCH_CHILD_COMPLETE");
}

void main().catch((error: unknown) => {
  console.error("V4_BATCH_CHILD_FAILURE", {
    productId,
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message.slice(0, 500) : "unknown failure",
  });
  process.exitCode = 1;
});
