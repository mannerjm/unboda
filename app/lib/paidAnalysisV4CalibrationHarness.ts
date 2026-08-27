import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildPaidAnalysisInputFromProfile } from "./paidAnalysisProfileInput";
import {
  generatePaidAnalysisDetailV4,
} from "./paidAnalysisDetailService";
import type { ResolvedPaidAnalysisDetailV4 } from "./paidAnalysisDetailOutput";
import type { PaidAnalysisResponseTelemetry } from "./ai/generateAnalysisText";
import type { ProfileDto } from "./profiles/types";
import { getPeriodAnalysisStrategy } from "./analysisPeriodStrategy";
import { getPaidAnalysisEngine } from "./paidAnalysisEngine";
import {
  getLaunchProductIds,
  resolvePaidAnalysisLaunchSpecialization,
} from "./paidAnalysisTopicConfig";
import { getPremiumProduct } from "./premiumProductRegistry";

export type CalibrationTier =
  | "ENTRY"
  | "CORE"
  | "DEEP"
  | "LONG_RANGE"
  | "SIGNATURE";

export type CalibrationProduct = {
  productId: string;
  tier: CalibrationTier;
  domain: string;
  whySelected: string;
  failureMode: string;
};

export const CALIBRATION_PRODUCT_SET: readonly CalibrationProduct[] = [
  {
    productId: "career-job-change",
    tier: "ENTRY",
    domain: "career",
    whySelected: "직업 전환 질문과 가장 짧은 실전 의사결정 경로를 검증한다.",
    failureMode: "generic career advice without direct decision anchor",
  },
  {
    productId: "career",
    tier: "CORE",
    domain: "career",
    whySelected: "광범위한 커리어 운영 구조와 책임·과부하·우선순위 재배분을 검증한다.",
    failureMode: "broad career output that collapses into generic advice",
  },
  {
    productId: "study-learning-strategy",
    tier: "CORE",
    domain: "study",
    whySelected: "학습 입력·정리·회상·적용을 종합하는 broad STUDY 구조를 검증한다.",
    failureMode: "study output that collapses into generic study advice",
  },
  {
    productId: "money-leak-risk",
    tier: "CORE",
    domain: "money",
    whySelected: "지출·계약·공동 부담의 손실 노출과 통제 경계를 검증한다.",
    failureMode: "money output that repeats income-stability advice without loss controls",
  },
  {
    productId: "money-saving-discipline",
    tier: "ENTRY",
    domain: "money",
    whySelected: "기본 재무 판단 기준과 행동 지표를 검증한다.",
    failureMode: "money output with vague risk framing and no concrete action",
  },
  {
    productId: "career-promotion-readiness",
    tier: "CORE",
    domain: "career",
    whySelected: "현실적 승진/직무 전환 판단과 책임 범위 판별을 검증한다.",
    failureMode: "career result that misses role-fit and timing logic",
  },
  {
    productId: "money-income-stability",
    tier: "CORE",
    domain: "money",
    whySelected: "수입 안정성과 자원 배분 판단의 핵심 결론을 검증한다.",
    failureMode: "money narrative with no action boundary or realistic caution",
  },
  {
    productId: "relationship-current",
    tier: "DEEP",
    domain: "relationship",
    whySelected: "현재 관계 상태 진단과 유지/조정 판단을 검증한다.",
    failureMode: "relationship output that confuses current status with future ideal",
  },
  {
    productId: "relationship-boundary",
    tier: "DEEP",
    domain: "relationship",
    whySelected: "관계의 거리·역할·허용·거절과 감정 노동 경계를 검증한다.",
    failureMode: "boundary output that invents relationship facts or collapses into generic advice",
  },
  {
    productId: "health-stress-regulation",
    tier: "DEEP",
    domain: "health",
    whySelected: "안전 가드와 건강 관련 표현 엄격성을 검증한다.",
    failureMode: "unsafe certainty or medical overreach",
  },
  {
    productId: "health-burnout-risk",
    tier: "DEEP",
    domain: "health",
    whySelected: "누적 부하·회복 저하·기능 신호와 health-safe reduction criteria를 검증한다.",
    failureMode: "burnout output that becomes medical diagnosis or generic wellness advice",
  },
  {
    productId: "business-startup-readiness",
    tier: "DEEP",
    domain: "business",
    whySelected: "사업 가설·역할·용량 검증을 통해 현실적 운영 경계를 확인한다.",
    failureMode: "business output that treats launch as certainty rather than proof-driven pilot",
  },
  {
    productId: "business-team-management",
    tier: "DEEP",
    domain: "business",
    whySelected: "팀의 결정권·위임·인계·책임 병목과 accountability rhythm을 검증한다.",
    failureMode: "business team output that collapses into generic leadership advice",
  },
  {
    productId: "career-leadership-readiness",
    tier: "DEEP",
    domain: "career",
    whySelected: "개인 리더십 전환의 권한·위임·피드백 실험과 personal dependence를 검증한다.",
    failureMode: "leadership output that assumes a team system instead of individual readiness",
  },
  {
    productId: "yearly-current",
    tier: "LONG_RANGE",
    domain: "period",
    whySelected: "연간 흐름의 기간 전략과 시기 분할을 검증한다.",
    failureMode: "annual product ignores horizon-specific review logic",
  },
  {
    productId: "annual-next",
    tier: "LONG_RANGE",
    domain: "period",
    whySelected: "다음 해 준비와 전환 조건을 검증한다.",
    failureMode: "future-year output with weak comparative timing logic",
  },
  {
    productId: "annual-3years",
    tier: "LONG_RANGE",
    domain: "period",
    whySelected: "3개 연도의 차이·순서·누적 전환을 검증하는 multi-year PERIOD 구조를 검증한다.",
    failureMode: "multi-year output that repeats yearly prose without sequencing depth",
  },
  {
    productId: "lifetime-overview",
    tier: "SIGNATURE",
    domain: "period",
    whySelected: "장기 생애 구조 합성과 premium-depth differentiation을 검증한다.",
    failureMode: "signature product that is only longer, not materially deeper",
  },
] as const;

export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

export function getCalibrationProductMap(): Map<string, CalibrationProduct> {
  return new Map(CALIBRATION_PRODUCT_SET.map((item) => [item.productId, item]));
}

export function validateLaunchMembership(): { launchIds: string[]; missing: string[] } {
  const launchIds = getLaunchProductIds();
  const launchSet = new Set(launchIds);
  const missing = CALIBRATION_PRODUCT_SET.filter(
    (item) => !launchSet.has(item.productId),
  ).map((item) => item.productId);

  return {
    launchIds,
    missing,
  };
}

export function validateCalibrationSet(): void {
  const { missing } = validateLaunchMembership();
  assert(missing.length === 0, `calibration IDs must all exist in Launch set: ${missing.join(", ")}`);

  const seen = new Set<string>();
  for (const item of CALIBRATION_PRODUCT_SET) {
    assert(!seen.has(item.productId), `duplicate calibration productId: ${item.productId}`);
    seen.add(item.productId);

    const specialization = resolvePaidAnalysisLaunchSpecialization(item.productId);
    assert(
      specialization.kind !== "none",
      `${item.productId} did not resolve to a specialized Launch product`,
    );

    const premiumProduct = getPremiumProduct(item.productId);
    assert(Boolean(premiumProduct), `${item.productId} must exist in premium registry`);

    const engine = getPaidAnalysisEngine(item.productId);
    assert(Boolean(engine), `${item.productId} must resolve to a valid engine`);

    if (specialization.kind === "period") {
      assert(Boolean(getPeriodAnalysisStrategy(item.productId)), `${item.productId} must have period strategy`);
    }
  }

  const tierCounts = new Map<CalibrationTier, number>();
  for (const item of CALIBRATION_PRODUCT_SET) {
    tierCounts.set(item.tier, (tierCounts.get(item.tier) ?? 0) + 1);
  }

  assert((tierCounts.get("ENTRY") ?? 0) === 2, "ENTRY coverage must be exactly 2 products");
  assert((tierCounts.get("CORE") ?? 0) === 5, "CORE coverage must be exactly 5 products");
  assert((tierCounts.get("DEEP") ?? 0) === 7, "DEEP coverage must be exactly 7 products");
  assert((tierCounts.get("LONG_RANGE") ?? 0) === 3, "LONG_RANGE coverage must be exactly 3 products");
  assert((tierCounts.get("SIGNATURE") ?? 0) === 1, "SIGNATURE coverage must be exactly 1 product");

  const coveredDomains = new Set(CALIBRATION_PRODUCT_SET.map((item) => item.domain));
  const requiredDomains = new Set(["career", "money", "relationship", "health", "business", "period"]);
  const missingDomains = [...requiredDomains].filter((domain) => !coveredDomains.has(domain));
  assert(missingDomains.length === 0, `coverage missing domains: ${missingDomains.join(", ")}`);
}

export function getCalibrationHarnessSummary(): {
  launchIdCount: number;
  launchIds: string[];
  missing: string[];
  calibrationSet: readonly CalibrationProduct[];
} {
  const { launchIds, missing } = validateLaunchMembership();

  return {
    launchIdCount: launchIds.length,
    launchIds,
    missing,
    calibrationSet: CALIBRATION_PRODUCT_SET,
  };
}

export function parseHarnessArgs(argv: readonly string[]): {
  dryRun: boolean;
  generate: boolean;
  productId?: string;
} {
  const dryRun = argv.length === 0 || argv.includes("--dry-run");
  const generate = argv.includes("--generate");
  const productIndex = argv.indexOf("--product");
  const productId = productIndex >= 0 ? argv[productIndex + 1] : undefined;

  return {
    dryRun,
    generate,
    productId,
  };
}

export const CALIBRATION_ARTIFACT_DIRECTORY = path.join(
  process.cwd(),
  ".tmp",
  "v4-calibration",
);

export const CALIBRATION_PROFILE_ID = "synthetic-calibration-persona-01";

const SYNTHETIC_PROFILE: ProfileDto = {
  id: "00000000-0000-0000-0000-000000000000",
  label: "Synthetic calibration persona",
  relationshipType: "self",
  birthDate: "1995-05-20",
  birthTime: "09:00",
  calendarType: "양력",
  isLeapMonth: false,
  gender: "남성",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export type CalibrationArtifact = {
  productId: string;
  candidateTier: CalibrationTier;
  generatedAt: string;
  contractVersion: string;
  status: "completed" | "failed";
  calibrationProfileId: string;
  result?: ResolvedPaidAnalysisDetailV4;
  validation: { status: "passed" | "failed"; error?: string };
  failureStage?:
    | "OPENAI_RESPONSE"
    | "RAW_EXTRACTION"
    | "GENERATED_JSON_PARSE"
    | "CONSISTENCY"
    | "SELF_REVIEW"
    | "EVIDENCE_RESOLUTION"
    | "TIMELINE_VALIDATION"
    | "ACTION_VALIDATION"
    | "MONEY_SAFETY"
    | "HEALTH_SAFETY"
    | "RESOLVED_SCHEMA";
  usage: PaidAnalysisResponseTelemetry | null;
};

export function getCalibrationProcessExitCode(
  artifact: Pick<CalibrationArtifact, "status" | "validation">,
): 0 | 1 {
  return artifact.status === "completed" && artifact.validation.status === "passed"
    ? 0
    : 1;
}

function classifyFailureStage(error: unknown): CalibrationArtifact["failureStage"] {
  const message = error instanceof Error ? error.message : "";
  if (/incomplete|OpenAI 응답|OPENAI/i.test(message)) return "OPENAI_RESPONSE";
  if (/JSON|파싱/i.test(message)) return "GENERATED_JSON_PARSE";
  if (/일관성|consistency/i.test(message)) return "CONSISTENCY";
  if (/Self Review|self-review/i.test(message)) return "SELF_REVIEW";
  if (/시점|기간|timeline/i.test(message)) return "TIMELINE_VALIDATION";
  if (/행동|action/i.test(message)) return "ACTION_VALIDATION";
  if (/재무|money|투자/i.test(message)) return "MONEY_SAFETY";
  return "RESOLVED_SCHEMA";
}

export function resolveCalibrationProduct(productId?: string): CalibrationProduct {
  assert(Boolean(productId), "--product requires a productId");
  const product = getCalibrationProductMap().get(productId!);
  assert(Boolean(product), `${productId} is not an allowed Launch calibration product`);
  return product!;
}

export function validateGenerationGate(
  argv: readonly string[],
  environment: NodeJS.ProcessEnv = process.env,
): void {
  const { dryRun, generate } = parseHarnessArgs(argv);
  const confirmed = environment.V4_CALIBRATION_CONFIRM === "yes";

  if (generate !== confirmed || !generate || dryRun) {
    throw new Error(
      "GENERATION REJECTED: require --generate and V4_CALIBRATION_CONFIRM=yes, without --dry-run",
    );
  }

  assert(environment.NODE_ENV !== "production", "generation is disabled in production");
}

export function getCalibrationInput(productId: string) {
  resolveCalibrationProduct(productId);
  return buildPaidAnalysisInputFromProfile(
    SYNTHETIC_PROFILE,
    productId,
    "2026-08-25",
  );
}

export function getCalibrationArtifactPath(productId: string, runId: string): string {
  return path.join(CALIBRATION_ARTIFACT_DIRECTORY, `${runId}-${productId}.json`);
}

export async function generateCalibrationProduct(
  productId: string,
): Promise<CalibrationArtifact> {
  const calibrationProduct = resolveCalibrationProduct(productId);
  const generatedAt = new Date().toISOString();
  let usage: PaidAnalysisResponseTelemetry | null = null;

  try {
    const result = await generatePaidAnalysisDetailV4(getCalibrationInput(productId), {
      onResponseTelemetry: (telemetry) => {
        usage = telemetry;
      },
    });
    return {
      productId,
      candidateTier: calibrationProduct.tier,
      generatedAt,
      contractVersion: "PAID_ANALYSIS_DETAIL_V4",
      status: "completed",
      calibrationProfileId: CALIBRATION_PROFILE_ID,
      result,
      validation: { status: "passed" },
      usage,
    };
  } catch (error) {
    return {
      productId,
      candidateTier: calibrationProduct.tier,
      generatedAt,
      contractVersion: "PAID_ANALYSIS_DETAIL_V4",
      status: "failed",
      calibrationProfileId: CALIBRATION_PROFILE_ID,
      validation: {
        status: "failed",
        error: error instanceof Error ? error.message.slice(0, 500) : "unknown failure",
      },
      failureStage: classifyFailureStage(error),
      usage,
    };
  }
}

export async function runCalibrationHarness(
  argv: readonly string[] = process.argv.slice(2),
): Promise<boolean> {
  const { dryRun, generate, productId } = parseHarnessArgs(argv);

  if (generate) {
    validateGenerationGate(argv);
    console.log("[v4-calibration-harness] SAFETY_GATE_PASS");
    const targets = productId ? [resolveCalibrationProduct(productId).productId] : CALIBRATION_PRODUCT_SET.map((item) => item.productId);
    assert(targets.length <= 10, "a calibration run may generate at most 10 products");
    await mkdir(CALIBRATION_ARTIFACT_DIRECTORY, { recursive: true });
    const runId = new Date().toISOString().replace(/[:.]/g, "-");
    let allSucceeded = true;
    for (const target of targets) {
      console.log(`[v4-calibration-harness] GENERATOR_START productId=${target}`);
      const artifact = await generateCalibrationProduct(target);
      allSucceeded = allSucceeded && getCalibrationProcessExitCode(artifact) === 0;
      console.log(`[v4-calibration-harness] GENERATOR_COMPLETE productId=${target} status=${artifact.status}`);
      await writeFile(getCalibrationArtifactPath(target, runId), JSON.stringify(artifact, null, 2), "utf8");
      console.log(`[v4-calibration-harness] ARTIFACT_WRITE_COMPLETE productId=${target}`);
      console.log(`[v4-calibration-harness] artifact = ${getCalibrationArtifactPath(target, runId)}`);
    }
    return allSucceeded;
  }

  validateCalibrationSet();

  if (productId) {
    resolveCalibrationProduct(productId);
    getCalibrationInput(productId);
  }

  const summary = getCalibrationHarnessSummary();
  const calibration = summary.calibrationSet;

  console.log("[v4-calibration-harness] dry-run =", dryRun);
  console.log("[v4-calibration-harness] launch-id-count =", summary.launchIdCount);
  console.log("[v4-calibration-harness] calibration-product-count =", calibration.length);
  console.log("[v4-calibration-harness] missing-launch-members =", summary.missing.length === 0 ? "none" : summary.missing.join(", "));

  for (const item of calibration) {
    console.log(
      `[v4-calibration-harness] ${item.productId} | tier=${item.tier} | domain=${item.domain} | why=${item.whySelected}`,
    );
  }

  console.log("[v4-calibration-harness] status = safe-dry-run-only");
  console.log("[v4-calibration-harness] SAFETY_GATE_PASS");
  console.log("[v4-calibration-harness] no OpenAI call, no DB write, no production route switch");
  console.log("[v4-calibration-harness] one-product smoke readiness = READY FOR ONE-PRODUCT SMOKE GENERATION");
  return true;
}
