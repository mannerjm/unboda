import { runCalibrationHarness } from "../app/lib/paidAnalysisV4CalibrationHarness";

const args = process.argv.slice(2);

async function main(): Promise<void> {
  console.log("V4_CHILD_START");
  console.log(`V4_CHILD_MODE=${args.includes("--generate") ? "GENERATE" : "DRY_RUN"}`);
  console.log("V4_CHILD_TARGET=career-job-change");
  await runCalibrationHarness(args);
  console.log("V4_CHILD_COMPLETE");
}

void main().catch((error: unknown) => {
  console.error("V4_CHILD_FAILURE", {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message.slice(0, 500) : "unknown failure",
  });
  process.exitCode = 1;
});
