import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPaidAnalysisDetailPromptV4 } from "../app/lib/paidAnalysisDetailPrompt";
import { getLaunchProductIds } from "../app/lib/paidAnalysisTopicConfig";
import { buildPaidAnalysisInputFromProfile } from "../app/lib/paidAnalysisProfileInput";
import {
  validateCustomerFacingLanguage,
} from "../app/lib/paidAnalysisV4CustomerValueValidator";
import {
  resolvePaidAnalysisEvidence,
} from "../app/lib/paidAnalysisEvidenceResolver";
import type {
  PaidAnalysisDetailOutputV4,
  PaidAnalysisEvidenceKey,
} from "../app/lib/paidAnalysisDetailOutput";

function sentence(value: string): string {
  return `${value} 실제 상황에서 바로 확인할 수 있는 기준을 함께 설명합니다.`;
}

function makeOutput(): PaidAnalysisDetailOutputV4 {
  return {
    schemaVersion: "v4",
    conclusion: {
      headline: "지금은 맡는 일을 늘리기보다 평가할 근거부터 만들어야 합니다.",
      direction: "조정",
      focus: "다음 역할에 필요한 실제 준비",
      rationale: sentence("현재 성과는 보이지만 다음 역할을 맡길 근거는 아직 더 필요합니다."),
      immediateAction: "이번 주에 현재 일과 다음 역할에서 필요한 일을 나눠 적어 보세요.",
    },
    coreProblem: {
      title: "다음 역할을 맡길 근거가 아직 부족합니다.",
      description: sentence("일을 잘하는 것과 더 큰 역할을 맡을 준비는 따로 확인해야 합니다."),
      whyItMatters: sentence("근거 없이 맡는 일만 늘리면 부담이 커지고 평가 기준도 흐려질 수 있습니다."),
    },
    cause: {
      summary: sentence("현재는 일을 직접 해내는 힘과 사람에게 일을 맡기는 준비 사이에 차이가 있습니다."),
      reasons: [1, 2, 3].map((index) => ({
        title: `원인 ${index}`,
        observedStructure: "기본 구조에서 한쪽 힘이 더 강하게 나타납니다.",
        realWorldPattern: sentence(`현실에서 확인할 모습 ${index}`),
        problemLinkage: sentence(`현재 문제와 이어지는 이유 ${index}`),
      })),
    },
    evidence: [
      "strength",
      "fortune_flow",
      "seun",
    ].map((evidenceKey) => ({
      evidenceKey: evidenceKey as PaidAnalysisEvidenceKey,
      meaning: sentence(`${evidenceKey}이 뜻하는 생활 속 의미`),
      linkage: sentence(`${evidenceKey}이 현재 판단과 이어지는 이유`),
    })),
    current: {
      summary: sentence("지금은 맡는 일을 무조건 늘리기보다 작은 범위에서 다음 역할을 시험해 보는 편이 좋습니다."),
      opportunities: [1, 2, 3].map((index) => ({
        situation: `기회 ${index}`,
        implication: sentence(`지금 활용할 수 있는 점 ${index}`),
        observableSignal: sentence(`확인할 신호 ${index}`),
      })),
      cautions: [1, 2, 3].map((index) => ({
        situation: `주의 ${index}`,
        implication: sentence(`지금 조심할 점 ${index}`),
        observableSignal: sentence(`확인할 주의 신호 ${index}`),
      })),
    },
    timeline: ["지금", "다음 확인", "판단 변경", "다시 검토"].map((label) => ({
      label,
      changeSignal: sentence(`${label}에 확인할 변화`),
      preparation: sentence(`${label}에 준비할 일`),
    })),
    action: [1, 2].map((index) => ({
      action: `실제 행동 ${index}`,
      target: `확인 대상 ${index}`,
      condition: sentence(`행동 조건 ${index}`),
      completionCriteria: sentence(`끝났다고 볼 기준 ${index}`),
    })),
    avoid: [
      {
        type: "misjudgment",
        behavior: "일을 많이 하는 것만으로 준비가 끝났다고 보는 것",
        reason: sentence("더 큰 역할은 사람과 기준을 함께 다루는 준비도 필요합니다."),
      },
      {
        type: "bad_condition",
        behavior: "맡을 범위를 정하지 않은 채 일을 계속 늘리는 것",
        reason: sentence("책임이 어디까지인지 흐려지면 본인도 주변도 평가하기 어려워집니다."),
      },
    ],
    confidence: {
      level: "중간",
      strongestEvidence: [
        sentence("현재 일과 다음 역할 사이의 차이를 나눠 볼 수 있습니다."),
        sentence("작은 범위에서 먼저 시험할 기준을 만들 수 있습니다."),
      ],
      uncertaintyFactors: [
        sentence("실제 조직의 요구와 평가 방식은 따로 확인해야 합니다."),
      ],
      limitations: sentence("이 분석만으로 실제 승진 여부나 회사의 최종 결정을 정할 수는 없습니다."),
    },
  };
}

const profile = {
  id: "00000000-0000-0000-0000-000000000000",
  label: "테스트",
  relationshipType: "self" as const,
  birthDate: "1995-05-20",
  birthTime: "09:00",
  calendarType: "양력" as const,
  isLeapMonth: false,
  gender: "남성" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const launchIds = getLaunchProductIds();
assert.equal(launchIds.length, 57);

for (const productId of launchIds) {
  const prompt = buildPaidAnalysisDetailPromptV4({
    ...buildPaidAnalysisInputFromProfile(profile, productId, "2026-10-07"),
    productId,
    analysisType: productId,
  });
  for (const phrase of [
    "[누가 읽어도 바로 이해하는 문장 기준]",
    "중학생이 읽어도 뜻을 바로 알 수 있는 단어",
    '"완수력"은 "끝까지 해내는 힘"',
    "점수, 비율, 퍼센트, 소수점 수치, 내부 계산 지수",
  ]) {
    assert(prompt.includes(phrase), `${productId} missing plain-language V4 rule: ${phrase}`);
  }
}

const difficult = makeOutput();
difficult.conclusion.rationale = "완수력과 위임, 조율의 메커니즘을 먼저 점검해야 합니다.";
const difficultResult = validateCustomerFacingLanguage(difficult);
assert.equal(difficultResult.ok, false);
assert(
  difficultResult.issues.some((issue) =>
    issue.message.includes("고객이 빠르게 이해하기 어려운 표현"),
  ),
);

const scored = makeOutput();
scored.cause.reasons[0].observedStructure = "돕는 힘 42.6 / 누르는 힘 57.4로 계산됩니다.";
const scoredResult = validateCustomerFacingLanguage(scored);
assert.equal(scoredResult.ok, false);
assert(
  scoredResult.issues.some((issue) =>
    issue.field.includes("observedStructure") &&
    issue.message.includes("기준을 모르면 해석할 수 없는 숫자"),
  ),
);

const promptInput = buildPaidAnalysisInputFromProfile(
  profile,
  "career-promotion-readiness",
  "2026-10-07",
);
assert(promptInput.evidenceFacts);

const evidenceKeys: PaidAnalysisEvidenceKey[] = [
  "strength",
  "yongshin",
  "gyeokguk",
  "element_balance",
  "fortune_flow",
  "daeun",
  "seun",
  "element_relations",
  "fortune_brain",
  "monthly_cycle",
];

const resolved = resolvePaidAnalysisEvidence(
  evidenceKeys.map((evidenceKey) => ({
    evidenceKey,
    meaning: sentence("쉬운 의미"),
    linkage: sentence("쉬운 연결"),
  })),
  promptInput.evidenceFacts!,
).resolved;

assert(resolved.length >= 3);
for (const item of resolved) {
  assert(!/\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?/u.test(item.fact), `${item.evidenceKey} leaked a ratio`);
  assert(!/\d+(?:\.\d+)?\s*%/u.test(item.fact), `${item.evidenceKey} leaked a percentage`);
  assert(!/(?:돕는 힘|누르는 힘)\s*\d/u.test(item.fact), `${item.evidenceKey} leaked an internal strength score`);
}

const resolvedByKey = new Map(resolved.map((item) => [item.evidenceKey, item]));
assert(resolvedByKey.get("strength")?.label === "신강·신약");
assert(resolvedByKey.get("strength")?.fact.includes(promptInput.evidenceFacts!.strength!.level));
assert(resolvedByKey.get("yongshin")?.label === "용신");
assert(resolvedByKey.get("yongshin")?.fact.includes("용신"));
assert(resolvedByKey.get("gyeokguk")?.label === "격국");
assert(resolvedByKey.get("daeun")?.fact.includes("대운"));
assert(resolvedByKey.get("seun")?.fact.includes("세운"));
assert(resolvedByKey.get("monthly_cycle")?.fact.includes("월주"));
assert(
  resolvedByKey.get("monthly_cycle")?.fact.includes(
    promptInput.evidenceFacts!.monthlyCycle!.representativePillar,
  ),
  "monthly evidence must retain the actual pillar",
);

const sharedLanguage = readFileSync("app/lib/paidReportCustomerLanguage.ts", "utf8");
assert(
  !sharedLanguage.includes("[누가 읽어도 바로 이해하는 문장 기준]"),
  "compatibility/shared paid-report language rules must remain unchanged",
);

const reportPage = readFileSync("app/paid-analysis/[productId]/report/page.tsx", "utf8");
assert(
  reportPage.includes("parseAnalysisInputSnapshot") &&
    reportPage.includes("buildPaidAnalysisInputFromProfile") &&
    reportPage.includes("resolvePaidAnalysisEvidence") &&
    reportPage.includes("evidenceOverride={evidenceOverride}"),
  "stored V4 reports must rebuild professional evidence from frozen purchase inputs",
);

const report = readFileSync("app/paid-analysis/[productId]/PaidAnalysisV4Report.tsx", "utf8");
assert(
  report.includes("formatPaidAnalysisEvidenceFactForCustomer") &&
    report.includes("getPaidAnalysisEvidenceCustomerLabel"),
  "stored V4 reports must hide legacy raw evidence scores at render time",
);
assert(
  report.includes("확인할 신호 ·") && !report.includes("관찰 신호 ·"),
  "V4 customer UI should use the simpler static label",
);

console.log("paid-analysis-v4-plain-language-regression: PASS (57/57 prompts + no raw calculation scores)");
