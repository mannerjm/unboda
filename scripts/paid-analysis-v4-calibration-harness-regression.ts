import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CALIBRATION_ARTIFACT_DIRECTORY,
  CALIBRATION_PRODUCT_SET,
  getCalibrationInput,
  getCalibrationProcessExitCode,
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
assert(CALIBRATION_PRODUCT_SET.length === 18, "calibration set must contain exactly 18 products");
assert(CALIBRATION_PRODUCT_SET.every((item) => getLaunchProductIds().includes(item.productId)), "all 18 products must be Launch members");
assert(CALIBRATION_PRODUCT_SET.filter((item) => item.productId === "career").length === 1, "career must be included exactly once");
assert(CALIBRATION_PRODUCT_SET.some((item) => item.productId === "career"), "canonical career must be calibration-eligible");
assert(CALIBRATION_PRODUCT_SET.filter((item) => item.productId === "study-learning-strategy").length === 1, "study-learning-strategy must be included exactly once");
assert(CALIBRATION_PRODUCT_SET.some((item) => item.productId === "study-learning-strategy"), "canonical study-learning-strategy must be calibration-eligible");
assert(CALIBRATION_PRODUCT_SET.filter((item) => item.productId === "money-leak-risk").length === 1, "money-leak-risk must be included exactly once");
assert(CALIBRATION_PRODUCT_SET.some((item) => item.productId === "money-leak-risk"), "canonical money-leak-risk must be calibration-eligible");
assert(CALIBRATION_PRODUCT_SET.filter((item) => item.productId === "business-team-management").length === 1, "business-team-management must be included exactly once");
assert(CALIBRATION_PRODUCT_SET.some((item) => item.productId === "business-team-management"), "canonical business-team-management must be calibration-eligible");
assert(CALIBRATION_PRODUCT_SET.filter((item) => item.productId === "career-leadership-readiness").length === 1, "career-leadership-readiness must be included exactly once");
assert(CALIBRATION_PRODUCT_SET.some((item) => item.productId === "career-leadership-readiness"), "canonical career-leadership-readiness must be calibration-eligible");
assert(CALIBRATION_PRODUCT_SET.filter((item) => item.productId === "health-burnout-risk").length === 1, "health-burnout-risk must be included exactly once");
assert(CALIBRATION_PRODUCT_SET.some((item) => item.productId === "health-burnout-risk"), "canonical health-burnout-risk must be calibration-eligible");
assert(CALIBRATION_PRODUCT_SET.filter((item) => item.productId === "relationship-boundary").length === 1, "relationship-boundary must be included exactly once");
assert(CALIBRATION_PRODUCT_SET.some((item) => item.productId === "relationship-boundary"), "canonical relationship-boundary must be calibration-eligible");
assert(CALIBRATION_PRODUCT_SET.filter((item) => item.productId === "annual-3years").length === 1, "annual-3years must be included exactly once");
assert(CALIBRATION_PRODUCT_SET.some((item) => item.productId === "annual-3years"), "canonical annual-3years must be calibration-eligible");
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
assert(CALIBRATION_PRODUCT_SET.filter((item) => item.tier === "CORE").length === 5, "CORE tier must contain 5 products");
assert(CALIBRATION_PRODUCT_SET.filter((item) => item.tier === "DEEP").length === 7, "DEEP tier must contain 7 products");
assert(CALIBRATION_PRODUCT_SET.filter((item) => item.tier === "LONG_RANGE").length === 3, "LONG_RANGE tier must contain 3 products");
assert(CALIBRATION_PRODUCT_SET.filter((item) => item.tier === "SIGNATURE").length === 1, "SIGNATURE tier must contain 1 product");
assert(getCalibrationProcessExitCode({ status: "completed", validation: { status: "passed" } }) === 0, "completed passed artifact must exit 0");
assert(getCalibrationProcessExitCode({ status: "failed", validation: { status: "failed" } }) === 1, "failed artifact must exit 1");
assert(getCalibrationProcessExitCode({ status: "completed", validation: { status: "failed" } }) === 1, "validation failure artifact must exit 1");
console.log("paid-analysis-v4-calibration-harness-regression passed ✓");
