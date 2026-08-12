import { buildAnalysisProductRecommendations } from "../app/lib/analysisProductRecommendations";
import type { ElementRelationsAnalysis } from "../app/lib/elementRelations";
import type { FortuneBrainResult } from "../app/lib/fortuneBrain";
import type { StrengthAnalysis } from "../app/lib/strength";
import type { ElementAnalysis } from "../app/lib/elements";
import { TOPIC_PREMIUM_PRODUCTS } from "../app/lib/premiumProductRegistry";
import { paidAnalysisProducts } from "../app/lib/paidAnalysisProducts";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const canonicalTopicIds = new Set(
  TOPIC_PREMIUM_PRODUCTS.filter((p) => p.kind === "TOPIC").map((p) => p.id),
);

const strengthAnalysis = {
  level: "신강",
} as StrengthAnalysis;

const fortuneBrain: FortuneBrainResult = {
  structure: "회귀 테스트용 사주 구조",
  strengths: [],
  weaknesses: [],
  recommendations: [],
  summary: "회귀 테스트용 종합 요약",
};

const elementRelations: ElementRelationsAnalysis = {
  relations: [],
  highlights: [],
  summary: "회귀 테스트용 오행 관계 요약",
};

// neutral: no strongest/weakest so only 신강 strength signals emit
const elementAnalysis: ElementAnalysis = {
  counts: { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 },
  percentages: { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 },
  total: 0,
  strongest: [],
  weakest: [],
};

// --- Test 1: 신강 + no fortuneFlow ---
// Expected: career_stability(1.0) / relationship_commitment(0.8) / growth_learning(0.7) emit.
// Top topic: career-organization-fit (career_stability:1.1 + relationship_commitment:0.4*0.8 = 1.42)
const result = buildAnalysisProductRecommendations({
  strengthAnalysis,
  fortuneBrain,
  elementRelations,
  fortuneFlow: null,
  elementAnalysis,
});

assert(result.recommendations.length === 3, "추천 결과가 정확히 3개가 아닙니다.");

assert(
  result.recommendations.every(
    (item, index, recommendations) =>
      index === 0 || recommendations[index - 1].score >= item.score,
  ),
  "추천 결과가 점수 내림차순으로 정렬되지 않았습니다.",
);

assert(
  result.recommendations.every((item) => item.reasons.length > 0),
  "추천 결과 중 추천 이유가 없는 항목이 있습니다.",
);

assert(
  result.recommendations.every((item) => canonicalTopicIds.has(item.productId)),
  "추천 결과에 registry에 없는 productId가 포함되어 있습니다.",
);

assert(
  result.recommendations[0].productId === "career-organization-fit",
  "신강 + no fortuneFlow: 첫 번째 추천은 career-organization-fit이어야 합니다.",
);

assert(
  result.recommendations[0].score === 1.42,
  "신강 + no fortuneFlow: career-organization-fit 점수가 1.42이어야 합니다.",
);

console.log("추천 결과 3개: true");
console.log("점수 내림차순: true");
console.log("추천 이유 존재: true");
console.log("canonical topic ID 검증: true");
console.log("신강 top topic: career-organization-fit (1.42)");

// --- Test 2: 신강 + 기회 우세 fortune flow ---
// Expected: career_change(1.1) / growth_transition(0.9) additionally emit.
// Top topic: career-job-change (career_change:1.4*1.1 + career_stability:0.8*1.0 = 2.34)
// Ranking must differ from Test 1 (fortune flow influences results).
const opportunityFlowResult = buildAnalysisProductRecommendations({
  strengthAnalysis,
  fortuneBrain,
  elementRelations,
  elementAnalysis,
  fortuneFlow: {
    relations: [],
    elementFlow: {
      original: { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 },
      adjusted: { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 },
      changes: { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 },
      strongest: [],
      weakest: [],
    },
    yongshinFlow: {
      primary: "목",
      secondary: [],
      primaryActive: false,
      secondaryActive: [],
      activationScore: 0,
      level: "보통",
    },
    currentFlow: "기회 우세",
    opportunityScore: 1,
    cautionScore: 0,
    daeunFlow: "중립",
    seunFlow: "중립",
    opportunities: [],
    cautions: [],
    summary: "회귀 테스트",
    topicGuides: {
      career: "회귀 테스트",
      wealth: "회귀 테스트",
      relationship: "회귀 테스트",
      health: "회귀 테스트",
    },
  },
});

assert(
  opportunityFlowResult.recommendations.length === 3,
  "기회 우세 결과가 정확히 3개가 아닙니다.",
);

assert(
  opportunityFlowResult.recommendations.every((item) => canonicalTopicIds.has(item.productId)),
  "기회 우세 결과에 registry에 없는 productId가 포함되어 있습니다.",
);

assert(
  opportunityFlowResult.recommendations[0].productId === "career-job-change",
  "기회 우세 + 신강: 첫 번째 추천은 career-job-change이어야 합니다.",
);

assert(
  opportunityFlowResult.recommendations[0].score === 2.34,
  "기회 우세 + 신강: career-job-change 점수가 2.34이어야 합니다.",
);

// fortune flow가 ranking에 실제 영향을 주는지 확인
assert(
  opportunityFlowResult.recommendations[0].productId !== result.recommendations[0].productId,
  "기회 우세 flow가 추천 순위에 영향을 주어야 합니다.",
);

console.log("기회 우세 top topic: career-job-change (2.34)");
console.log("fortune flow ranking 영향 확인: true");

const wealthProduct = paidAnalysisProducts.wealth;

console.log(
  "wealth category 연결:",
  wealthProduct.category === "MONEY",
);

console.log(
  "wealth plugin 연결:",
  wealthProduct.plugin === "MONEY",
);

console.log(
  "wealth V1 출시 단계:",
  wealthProduct.releaseLevel === "V1",
);

console.log(
  "wealth analysisType 연결:",
  wealthProduct.analysisType === "재물운 심층 분석",
);

console.log(
  "wealth details 5개 이상:",
  (wealthProduct.details?.length ?? 0) >= 5,
);

console.log(
  "wealth recommendedFor 5개 이상:",
  (wealthProduct.recommendedFor?.length ?? 0) >= 5,
);

console.log(
  "wealth analysisFocus 5개 이상:",
  (wealthProduct.analysisFocus?.length ?? 0) >= 5,
);

console.log(
  "wealth expectedOutcome 5개 이상:",
  (wealthProduct.expectedOutcome?.length ?? 0) >= 5,
);

if (wealthProduct.category !== "MONEY") {
  throw new Error("wealth 상품의 category가 MONEY가 아닙니다.");
}

if (wealthProduct.plugin !== "MONEY") {
  throw new Error("wealth 상품의 plugin이 MONEY가 아닙니다.");
}

if (wealthProduct.releaseLevel !== "V1") {
  throw new Error("wealth 상품의 releaseLevel이 V1이 아닙니다.");
}

if (wealthProduct.analysisType !== "재물운 심층 분석") {
  throw new Error("wealth 상품의 analysisType이 올바르지 않습니다.");
}

if ((wealthProduct.details?.length ?? 0) < 5) {
  throw new Error("wealth 상품의 details가 5개 미만입니다.");
}

if ((wealthProduct.recommendedFor?.length ?? 0) < 5) {
  throw new Error("wealth 상품의 recommendedFor가 5개 미만입니다.");
}

if ((wealthProduct.analysisFocus?.length ?? 0) < 5) {
  throw new Error("wealth 상품의 analysisFocus가 5개 미만입니다.");
}

if ((wealthProduct.expectedOutcome?.length ?? 0) < 5) {
  throw new Error("wealth 상품의 expectedOutcome이 5개 미만입니다.");
}

console.log("wealth premium product metadata regression passed");