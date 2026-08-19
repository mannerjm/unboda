import { buildPaidAnalysisDetailPromptV4 } from "../app/lib/paidAnalysisDetailPrompt";
import { getPaidAnalysisTopicConfig } from "../app/lib/paidAnalysisTopicConfig";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const basePromptInput = {
  analysisType: "테스트 분석",
  birthData: "birth",
  originalChart: "chart",
  coreInterpretation: "core",
  fortuneTiming: "timing",
  sajuSummary: "summary",
  currentFortuneFlow: "flow",
};

const productIds = [
  "career-specialization",
  "money-leak-risk",
  "relationship-conflict",
  "relationship-current",
] as const;

const prompts = new Map(
  productIds.map((productId) => [
    productId,
    buildPaidAnalysisDetailPromptV4({ ...basePromptInput, productId }),
  ]),
);

for (const productId of productIds) {
  const config = getPaidAnalysisTopicConfig(productId);
  const prompt = prompts.get(productId);

  if (!config) throw new Error(`FAIL: ${productId} must have a TopicConfig`);
  if (!prompt) throw new Error(`FAIL: ${productId} must produce a V4 prompt`);

  assert(prompt.includes("[상품 중심 추론 계약]"), `${productId} must require product-question-first reasoning`);
  assert(prompt.includes("근거 해석 → 사용자가 확인할 수 있는 조건 또는 메커니즘 → 이 상품 질문에 대한 결과 → 상품별 행동 또는 검토 시험"), `${productId} must require the evidence-to-action chain`);
  assert(prompt.includes("공통적인 성격 요약처럼 섹션의 첫 문장에 반복하지 않는다"), `${productId} must prevent generic-profile dominance`);
  assert(prompt.includes("다른 상품에도 그대로 옮길 수 있는 원인 문단"), `${productId} must prevent cross-product templates`);
  assert(prompt.includes("[필수 통찰 기반 검토 순서]"), `${productId} must require differentiated timeline semantics`);
  assert(prompt.includes(config.userQuestion), `${productId} must include its owned customer question`);

  for (const insight of config.requiredInsights) {
    assert(prompt.includes(insight.prompt), `${productId} must include required insight ${insight.id}`);
  }
}

const specializationPrompt = prompts.get("career-specialization")!;
assert(specializationPrompt.includes("전문성이 평가·성과·기회로 연결"), "specialization must emphasize recognition mechanism");
assert(specializationPrompt.includes("깊게 축적할 가치"), "specialization must emphasize depth accumulation");

const leakPrompt = prompts.get("money-leak-risk")!;
assert(leakPrompt.includes("지출·계약·공동 부담"), "leak risk must emphasize responsibility exposure");
assert(leakPrompt.includes("중단·재검토할 기준"), "leak risk must emphasize stop and review conditions");

const conflictPrompt = prompts.get("relationship-conflict")!;
const currentPrompt = prompts.get("relationship-current")!;
assert(conflictPrompt.includes("갈등을 시작시키는 상황·말·행동"), "conflict must emphasize triggers");
assert(conflictPrompt.includes("대화 재개, 책임 인정, 행동 변화"), "conflict must emphasize repair evidence");
assert(currentPrompt.includes("이어갈 조건과 조정할 조건"), "current relationship must emphasize continue or adjust criteria");
assert(currentPrompt.includes("연락, 약속, 대화 재개"), "current relationship must emphasize current-state signals");
assert(currentPrompt.includes("[현재 관계 상태 판단 경계]"), "current relationship must receive a current-state narrative boundary");
assert(currentPrompt.includes("현재 상태 → 상호성·후속 이행 → 최소 기준 정렬 → 관찰 창 → 유지 또는 조정"), "current relationship must keep the current-state observation spine");
assert(currentPrompt.includes("보조 증거로만 언급"), "current relationship must subordinate conflict repair evidence");
assert(currentPrompt.includes("독립된 timeline 단계, 주된 action 대상, 최종 판단 틀로 만들지 않는다"), "current relationship must not use conflict repair as its backbone");
assert(currentPrompt.includes("principal action 3개 중 최소 2개"), "current relationship must reserve principal actions for current-state ownership");
assert(conflictPrompt !== currentPrompt, "conflict and current relationship prompts must remain distinct");
assert(!conflictPrompt.includes("이어갈 조건과 조정할 조건"), "conflict must not inherit current relationship decision criteria");
assert(!currentPrompt.includes("갈등을 시작시키는 상황·말·행동"), "current relationship must not inherit conflict-trigger ownership");
assert(conflictPrompt.includes("[갈등 수습·재발 분석 보호 경계]"), "conflict must retain its repair and recurrence boundary");
assert(conflictPrompt.includes("촉발 → 직후 반응 → 확대 또는 완화 → 수습 시도 → 행동 변화 → 재발 시험"), "conflict must retain its trigger-to-recurrence spine");
assert(!conflictPrompt.includes("[현재 관계 상태 판단 경계]"), "conflict must not inherit current-state narrative ownership");

console.log("paid-analysis-v4-prompt-differentiation-regression passed ✓");