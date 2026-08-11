import { promises as fs } from "fs";
import * as path from "path";
import { evaluateRelationshipPremiumQuality } from "./paidAnalysisRelationshipPremiumQuality";
import { validatePaidAnalysisHealthSafety } from "./paidAnalysisHealthSafetyValidator";
import { generateAnalysisText } from "./ai/generateAnalysisText";
import { reviewPaidAnalysisDetail } from "./paidAnalysisSelfReview";
import type {
  PaidAnalysisDetailOutput,
  PaidAnalysisDetailOutputV2,
    PaidAnalysisDetailOutputV3,
} from "./paidAnalysisDetailOutput";
import { validatePaidAnalysisConsistency } from "./paidAnalysisConsistencyValidator";
import {
  parsePaidAnalysisDetailOutput,
  parsePaidAnalysisDetailOutputV2,
   parsePaidAnalysisDetailOutputV3,
} from "./paidAnalysisDetailOutputParser";
import {
  buildPaidAnalysisDetailPrompt,
  buildPaidAnalysisDetailPromptV2,
    buildPaidAnalysisDetailPromptV3,
  type PaidAnalysisDetailPromptInput,
} from "./paidAnalysisDetailPrompt";

import {
  getCanonicalPremiumProductId,
  getPremiumProduct,
} from "./premiumProductRegistry";

function extractJsonCandidate(value: string): string {
  const trimmedValue = value.trim();

  const fencedMatch = trimmedValue.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBraceIndex = trimmedValue.indexOf("{");
  if (firstBraceIndex === -1) {
    throw new Error("JSON 객체를 찾지 못했습니다.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = firstBraceIndex; index < trimmedValue.length; index += 1) {
    const currentChar = trimmedValue[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (currentChar === "\\") {
        escaped = true;
      } else if (currentChar === '"') {
        inString = false;
      }
      continue;
    }

    if (currentChar === '"') {
      inString = true;
      continue;
    }

    if (currentChar === "{") {
      depth += 1;
    } else if (currentChar === "}") {
      depth -= 1;
      if (depth === 0) {
        return trimmedValue.slice(firstBraceIndex, index + 1).trim();
      }
    }
  }

  return trimmedValue.slice(firstBraceIndex).trim();
}

function repairJsonText(value: string): string {
  let result = value;

  result = result.replace(/,\s*([}\]])/g, "$1");

  let inString = false;
  let escaped = false;
  let repaired = "";

  for (let index = 0; index < result.length; index += 1) {
    const currentChar = result[index];

    if (inString) {
      if (escaped) {
        repaired += currentChar;
        escaped = false;
      } else if (currentChar === "\\") {
        repaired += currentChar;
        escaped = true;
      } else if (currentChar === '"') {
        repaired += currentChar;
        inString = false;
      } else if (currentChar === "\n" || currentChar === "\r") {
        repaired += " ";
      } else {
        repaired += currentChar;
      }
      continue;
    }

    if (currentChar === '"') {
      inString = true;
      repaired += currentChar;
    } else {
      repaired += currentChar;
    }
  }

  return repaired.trim();
}

function parseGeneratedJson<T>(value: unknown, parser: (input: unknown) => T): T {
  if (typeof value !== "string") {
    return parser(value);
  }

  const normalizedValue = value.trim();

  try {
    return parser(JSON.parse(normalizedValue));
  } catch (error) {
    const candidate = extractJsonCandidate(normalizedValue);

    try {
      return parser(JSON.parse(candidate));
    } catch (firstParseError) {
      try {
        const repairedCandidate = repairJsonText(candidate);
        return parser(JSON.parse(repairedCandidate));
      } catch (secondParseError) {
        const message =
          secondParseError instanceof Error
            ? secondParseError.message
            : "unknown-json-parse-error";

        throw new Error(`AI 응답 JSON 파싱에 실패했습니다. ${message}`);
      }
    }
  }
}

function parseGeneratedPaidAnalysisDetail(
  value: unknown,
): PaidAnalysisDetailOutput {
  return parseGeneratedJson(value, parsePaidAnalysisDetailOutput);
}

function parseGeneratedPaidAnalysisDetailV2(
  value: unknown,
): PaidAnalysisDetailOutputV2 {
  return parseGeneratedJson(value, parsePaidAnalysisDetailOutputV2);
}

function parseGeneratedPaidAnalysisDetailV3(
  value: unknown,
): PaidAnalysisDetailOutputV3 {
  return parseGeneratedJson(value, parsePaidAnalysisDetailOutputV3);
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function compactText(value: string, maxLength: number): string {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return "";
  }

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxLength).trimEnd()}…`;
}

function compressCareerDetailStructure(
  detail: PaidAnalysisDetailOutputV3,
): PaidAnalysisDetailOutputV3 {
  const focusText = normalizeText(detail.decisionAnchor.focus);
  const focus = focusText || "현재 흐름의 핵심 기준";
  const actionSources = detail.actionGuide
    .map((item) => compactText(item, 108))
    .filter(Boolean);

  const actionFallbacks = [
    "핵심 결정을 앞두고 우선순위를 한 줄로 정리한다.",
    "현재 흐름에서 가장 먼저 조정할 부분을 구체적으로 정리한다.",
    "결정 이후 부담과 이익을 함께 비교해본다.",
  ];

  detail.actionGuide = [
    ...(actionSources.length >= 1 ? actionSources.slice(0, 1) : []),
    ...(actionSources.length >= 2 ? actionSources.slice(1, 2) : []),
    ...(actionSources.length >= 3 ? actionSources.slice(2, 3) : []),
    ...actionFallbacks.slice(actionSources.length),
  ].slice(0, 3);

  const timelineTitle = detail.futureTimeline[0]?.title || "현재 흐름";
  const decisionQuestions = [
    `지금 선택의 우선순위가 ${focus}를 기준으로 분명한가?`,
    `이 결정이 가져올 부담과 이익의 균형이 적절한가?`,
    `되돌리기 어려운 선택으로 치닫고 있지는 않은가?`,
    `${timelineTitle}에 나타나는 위험 신호가 실제 상황에서도 반복되는가?`,
    `결정 시점을 늦추거나 단계적으로 실행할 여지가 있는가?`,
  ];

  const existingChecklist = detail.checklist
    .map((item) => compactText(item, 112))
    .filter(Boolean);

  detail.checklist = [
    ...(existingChecklist.length >= 1 ? existingChecklist.slice(0, 1) : []),
    ...(existingChecklist.length >= 2 ? existingChecklist.slice(1, 2) : []),
    ...(existingChecklist.length >= 3 ? existingChecklist.slice(2, 3) : []),
    ...decisionQuestions.slice(existingChecklist.length),
  ].slice(0, 5);

  detail.avoidGuide = detail.avoidGuide
    .map((item) => compactText(item, 112))
    .filter(Boolean)
    .slice(0, 4);

  detail.futureTimeline = detail.futureTimeline.map((item) => ({
    ...item,
    description: compactText(item.description, 92),
  }));

  return detail;
}

export async function generatePaidAnalysisDetail(
  input: PaidAnalysisDetailPromptInput,
): Promise<PaidAnalysisDetailOutput> {
  const prompt = buildPaidAnalysisDetailPrompt(input);

  const responseText = await generateAnalysisText(prompt);

  return parseGeneratedPaidAnalysisDetail(responseText);
}

export async function generatePaidAnalysisDetailV2(
  input: PaidAnalysisDetailPromptInput,
): Promise<PaidAnalysisDetailOutputV3> {
  const canonicalProductId = input.productId
    ? getCanonicalPremiumProductId(input.productId)
    : undefined;

  const registryProduct = canonicalProductId
    ? getPremiumProduct(canonicalProductId)
    : undefined;

  console.info("[paid-analysis-detail-v2] start", {
    productId: input.productId,
    canonicalProductId,
    plugin: registryProduct?.plugin,
    analysisType: input.analysisType,
  });

  const prompt = buildPaidAnalysisDetailPromptV3(input);

  console.info("[paid-analysis-detail-v2] prompt-built", {
    promptLength: prompt.length,
  });

  let responseText: string;

  try {
    responseText = await generateAnalysisText(prompt, {
      callType: "paid-analysis-detail",
    });
    console.info("[paid-analysis-detail-v2] model-response-received", {
      responseLength: responseText?.length ?? 0,
    });
  } catch (error) {
    console.error("[paid-analysis-detail-v2] model-call-failed", error);
    throw error;
  }

  let detail: PaidAnalysisDetailOutputV3;

  try {
    detail = parseGeneratedPaidAnalysisDetailV3(responseText);
    console.info("[paid-analysis-detail-v2] parsed-success", {
      hasHeroSummary: Boolean(detail.heroSummary),
      futureTimelineCount: detail.futureTimeline.length,
    });
  } catch (error) {
    console.error("[paid-analysis-detail-v2] parse-failed", error);
    throw error;
  }

  const compressedDetail = compressCareerDetailStructure(detail);

  const consistencyResult = validatePaidAnalysisConsistency(compressedDetail);

  if (!consistencyResult.ok) {
    const issueMessage = consistencyResult.issues
      .map((issue) => `${issue.field}: ${issue.message}`)
      .join(" | ");

    console.error("[paid-analysis-detail-v2] consistency-failed", {
      issueMessage,
    });

    throw new Error(
      `심층 분석 결과의 섹션 간 일관성 검증에 실패했습니다. ${issueMessage}`,
    );
  }

const selfReview = reviewPaidAnalysisDetail(compressedDetail);

if (!selfReview.passed) {
  const feedbackMessage = selfReview.feedback.join(" | ");

  console.error("[paid-analysis-detail-v2] self-review-failed", {
    overallScore: selfReview.overallScore,
    feedbackMessage,
  });

  throw new Error(
    `심층 분석 결과의 Self Review에 실패했습니다. 점수: ${selfReview.overallScore}. ${feedbackMessage}`,
  );
}

const isHealthAnalysis =
  registryProduct?.plugin === "HEALTH";

if (isHealthAnalysis) {
  const healthSafetyResult =
    validatePaidAnalysisHealthSafety(detail);

  if (!healthSafetyResult.ok) {
    const issueMessage = healthSafetyResult.issues
      .map((issue) => `${issue.field}: ${issue.message}`)
      .join(" | ");

    console.error("[paid-analysis-detail-v2] health-safety-failed", {
      issueMessage,
    });

    throw new Error(
      `건강운 심층 분석 결과의 안전 검증에 실패했습니다. ${issueMessage}`,
    );
  }
}

const isRelationshipAnalysis =
  registryProduct?.plugin === "RELATIONSHIP";

if (
  process.env.NODE_ENV === "development" &&
  registryProduct?.plugin === "CAREER"
) {
  const diagnosticsDir = path.join(
    process.cwd(),
    ".tmp",
    "diagnostics",
    "paid-analysis-detail-v2",
  );

  await fs.mkdir(diagnosticsDir, { recursive: true });

  const outputPath = path.join(
    diagnosticsDir,
    "latest-career-parsed.json",
  );

  await fs.writeFile(outputPath, JSON.stringify(compressedDetail, null, 2), "utf8");

  console.info("[paid-analysis-detail-v2] development-diagnostic-saved", {
    outputPath,
  });
}

if (isRelationshipAnalysis) {
  const relationshipPremiumResult =
    evaluateRelationshipPremiumQuality({
      pastPatternSummary:
        compressedDetail.pastPattern.summary,

      pastPatternVerificationQuestion:
        compressedDetail.pastPattern.periods[0]?.verificationQuestion ?? "",

      currentCoreProblemTitle:
        compressedDetail.currentCoreProblem.title,

      currentCoreProblemDescription:
        compressedDetail.currentCoreProblem.description,

      currentCoreProblemWhyItMatters:
        compressedDetail.currentCoreProblem.whyItMatters,

      futureTimelineTexts:
        compressedDetail.futureTimeline.map(
          (item) =>
            `${item.period} ${item.title} ${item.description}`,
        ),

      actionGuide:
        compressedDetail.actionGuide,
    });

  if (!relationshipPremiumResult.ok) {
    const failedChecks = Object.entries(
      relationshipPremiumResult.checks,
    )
      .filter(([, passed]) => !passed)
      .map(([check]) => check);

    const issueMessage = [
      ...failedChecks,
      ...relationshipPremiumResult.businessMatches,
      ...relationshipPremiumResult.genericAdviceMatches,
    ].join(" | ");

    console.error("[paid-analysis-detail-v2] relationship-quality-failed", {
      issueMessage,
    });

    throw new Error(
      `연애·관계 심층 분석 결과가 5만원급 품질 기준을 충족하지 못했습니다. ${issueMessage}`,
    );
  }
}

  return compressedDetail;
}