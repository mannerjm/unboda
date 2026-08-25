import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CALIBRATION_ARTIFACT_DIRECTORY,
  CALIBRATION_PRODUCT_SET,
  getCalibrationInput,
  parseHarnessArgs,
  resolveCalibrationProduct,
  validateCalibrationSet,
  validateGenerationGate,
} from "../app/lib/paidAnalysisV4CalibrationHarness";
import { getLaunchProductIds } from "../app/lib/paidAnalysisTopicConfig";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

const root = process.cwd();
const harnessSource = readFileSync(path.join(root, "app/lib/paidAnalysisV4CalibrationHarness.ts"), "utf8");
const routeSource = readFileSync(path.join(root, "app/api/paid-analysis-detail-v2/route.ts"), "utf8");
const pricingSource = readFileSync(path.join(root, "app/lib/productPricing.ts"), "utf8");

validateCalibrationSet();
assert(CALIBRATION_PRODUCT_SET.length === 10, "calibration set must contain exactly 10 products");
assert(CALIBRATION_PRODUCT_SET.every((item) => getLaunchProductIds().includes(item.productId)), "all 10 products must be Launch members");
assert(!CALIBRATION_PRODUCT_SET.some((item) => item.productId === "monthly-12months"), "monthly-12months must be excluded");
assert(parseHarnessArgs([]).dryRun, "default harness mode must be dry-run");
assert(!parseHarnessArgs([]).generate, "default harness must not generate");
assert(parseHarnessArgs(["--generate", "--product", "career-job-change"]).productId === "career-job-change", "product selector must parse");
assert(CALIBRATION_ARTIFACT_DIRECTORY.includes(".tmp\\") || CALIBRATION_ARTIFACT_DIRECTORY.includes(".tmp/"), "artifacts must stay under .tmp");
assert(!harnessSource.includes("claimPaidReport") && !harnessSource.includes("completePaidReport") && !harnessSource.includes("failPaidReport"), "harness must not call report persistence");
assert(!harnessSource.includes("createAdminClient") && !harnessSource.includes("supabase"), "harness must not import Supabase");
assert(routeSource.includes("generatePaidAnalysisDetailV2"), "live route must remain on V3 generator path");
assert(!routeSource.includes("generatePaidAnalysisDetailV4"), "live route must not switch to V4");
assert(pricingSource.includes("amount: 9900"), "production price must remain 9,900 KRW");
assert(getCalibrationInput("career-job-change").productId === "career-job-change", "synthetic input must resolve product");

for (const args of [
  ["--generate"],
  ["--dry-run", "V4_CALIBRATION_CONFIRM=yes"],
  ["--dry-run", "--generate", "V4_CALIBRATION_CONFIRM=yes"],
] as const) {
  try {
    validateGenerationGate(args, { NODE_ENV: "test" });
    throw new Error("generation gate unexpectedly passed");
  } catch (error) {
    assert(error instanceof Error && error.message.includes("GENERATION REJECTED"), "generation requires both explicit opt-ins");
  }
}

for (const productId of ["not-a-product", "monthly-12months"]) {
  try {
    resolveCalibrationProduct(productId);
    throw new Error("invalid product unexpectedly resolved");
  } catch (error) {
    assert(error instanceof Error && error.message.includes("not an allowed Launch calibration product"), `${productId} must be rejected`);
  }
}

assert(CALIBRATION_PRODUCT_SET.filter((item) => item.tier === "ENTRY").length === 2, "ENTRY tier must contain 2 products");
assert(CALIBRATION_PRODUCT_SET.filter((item) => item.tier === "CORE").length === 2, "CORE tier must contain 2 products");
assert(CALIBRATION_PRODUCT_SET.filter((item) => item.tier === "DEEP").length === 3, "DEEP tier must contain 3 products");
assert(CALIBRATION_PRODUCT_SET.filter((item) => item.tier === "LONG_RANGE").length === 2, "LONG_RANGE tier must contain 2 products");
assert(CALIBRATION_PRODUCT_SET.filter((item) => item.tier === "SIGNATURE").length === 1, "SIGNATURE tier must contain 1 product");
console.log("paid-analysis-v4-calibration-harness-regression passed ✓");
