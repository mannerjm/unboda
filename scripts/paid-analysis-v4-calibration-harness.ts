import { runCalibrationHarness } from "../app/lib/paidAnalysisV4CalibrationHarness";

const args = process.argv.slice(2);

console.log("[v4-calibration-harness] CLI_START");
console.log(
  `[v4-calibration-harness] MODE=${args.includes("--generate") ? "GENERATE" : "DRY_RUN"}`,
);
console.log(
  `[v4-calibration-harness] TARGET_PRODUCT=${args.includes("--product") ? args[args.indexOf("--product") + 1] ?? "missing" : "all-calibration-products"}`,
);

if (args.includes("--help") || args.includes("-h")) {
  console.log("Usage: npx --yes tsx scripts/paid-analysis-v4-calibration-harness.ts --dry-run");
  console.log("This harness is intentionally dry-run only. Real generation is disabled.");
  process.exit(0);
}

runCalibrationHarness(args)
  .then(() => {
    console.log("[v4-calibration-harness] CLI_COMPLETE");
  })
  .catch((error: unknown) => {
    console.error("[v4-calibration-harness] CLI_FAILURE", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message.slice(0, 500) : "unknown failure",
    });
    process.exitCode = 1;
  });
