import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { PaidAnalysisDetailOutputV4 } from "../app/lib/paidAnalysisDetailOutput";
import { buildPaidAnalysisDetailPromptV4 } from "../app/lib/paidAnalysisDetailPrompt";
import { getPaidAnalysisEngine } from "../app/lib/paidAnalysisEngine";
import { getLaunchProductIds } from "../app/lib/paidAnalysisTopicConfig";
import {
  validateCustomerFacingDistinctness,
  validateCustomerFacingLanguage,
  validatePremiumCustomerValue,
} from "../app/lib/paidAnalysisV4CustomerValueValidator";

const read = (path: string): string => readFileSync(path, "utf8");

function makePlainOutput(): PaidAnalysisDetailOutputV4 {
  return {
    schemaVersion: "v4",
    conclusion: {
      headline: "지금은 옮길지보다 새 자리의 조건을 먼저 비교할 때입니다",
      direction: "조정",
      focus: "현재 자리와 새 제안의 책임·보상·성장 조건",
      rationale: "변화를 서두르기보다 두 선택지의 책임 범위와 보상 조건이 실제로 더 나아지는지 먼저 확인해야 판단이 선명해집니다.",
      immediateAction: "현재 자리와 새 제안의 업무 범위·보상·성장 가능성을 같은 표에 적어 비교하세요.",
    },
    coreProblem: {
      title: "이동 자체보다 이동 조건이 아직 충분히 분리되지 않았습니다",
      description: "변화 욕구가 커질수록 현재 자리의 불편함과 새 자리의 실제 조건을 한꺼번에 판단하기 쉬워집니다.",
      whyItMatters: "퇴사 여부와 새 자리의 적합성을 따로 확인해야 불만을 피하는 선택과 더 나은 조건을 고르는 선택을 구분할 수 있습니다.",
    },
    cause: {
      summary: "성과를 만들고 싶은 힘, 책임이 늘어날 때의 부담, 익숙한 방식을 바꾸려는 압력이 서로 다른 방향으로 작동해 조건 비교가 중요해집니다.",
      reasons: [
        {
          title: "성과와 보상의 연결이 중요합니다",
          observedStructure: "정재격과 신약 구조가 함께 보여 성과·보상과 책임 부담을 같이 봅니다.",
          realWorldPattern: "성과 기준과 보상이 분명한 자리는 동기가 살아날 수 있지만 책임만 늘어나는 자리는 만족도가 빠르게 떨어질 수 있습니다.",
          problemLinkage: "따라서 새 자리의 이름보다 실제 업무 범위와 보상이 함께 좋아지는지 확인해야 합니다.",
        },
        {
          title: "책임 범위가 모호하면 이동 이점이 줄어듭니다",
          observedStructure: "현재 장기 흐름의 계산에서는 역할 재편 압력이 확인됩니다.",
          realWorldPattern: "새 역할이 매력적으로 보여도 담당 업무와 결정권이 불분명하면 이전 자리와 비슷한 부담이 반복될 수 있습니다.",
          problemLinkage: "이동 전에는 역할 설명과 최종 책임 범위를 문서나 면접 답변으로 확인하는 것이 중요합니다.",
        },
        {
          title: "변화의 속도보다 선택의 품질이 중요합니다",
          observedStructure: "올해 계산 흐름에는 변화 자극과 실행 부담이 동시에 나타납니다.",
          realWorldPattern: "기회가 여러 개 보일수록 빠르게 고르기보다 조건을 나눠 비교할 때 선택 실수가 줄어들 수 있습니다.",
          problemLinkage: "한 번에 여러 선택지를 추진하기보다 우선순위를 정해 가장 중요한 조건부터 확인해야 합니다.",
        },
      ],
    },
    evidence: [
      {
        evidenceKey: "strength",
        meaning: "책임이 빠르게 커지는 선택보다 감당 가능한 업무 범위를 확인하는 것이 중요하다는 뜻입니다.",
        linkage: "조정 방향을 유지하려면 새 자리의 책임 범위가 현재보다 명확한지 먼저 확인해야 합니다.",
      },
      {
        evidenceKey: "fortune_flow",
        meaning: "변화를 검토할 동력은 있지만 서두른 결정이 항상 유리한 것은 아니라는 뜻입니다.",
        linkage: "이동 여부보다 실제 제안의 조건을 먼저 비교하는 현재 판단을 뒷받침합니다.",
      },
      {
        evidenceKey: "element_balance",
        meaning: "성과를 내는 속도와 장기적으로 버틸 수 있는 업무 방식의 균형을 함께 봐야 한다는 뜻입니다.",
        linkage: "보상만 좋아진 선택보다 업무 방식과 지속 가능성까지 나아지는지를 확인해야 합니다.",
      },
    ],
    current: {
      summary: "새로운 선택지가 보이더라도 이동 자체보다 실제 조건이 얼마나 선명한지가 지금 판단의 질을 좌우합니다.",
      opportunities: [
        {
          situation: "새 제안의 역할과 평가 기준이 구체적으로 설명되는 경우",
          implication: "현재 자리와 비교할 수 있는 근거가 생겨 이동 판단이 훨씬 선명해질 수 있습니다.",
          observableSignal: "담당 업무, 의사결정 범위, 평가 기준을 구체적인 문장으로 확인할 수 있습니다.",
        },
        {
          situation: "보상 조건과 책임 증가 폭을 함께 확인할 수 있는 경우",
          implication: "연봉만 보고 판단하는 실수를 줄이고 실제 교환 조건을 비교할 수 있습니다.",
          observableSignal: "기본 보상, 변동 보상, 추가 책임을 같은 기준으로 적어 비교할 수 있습니다.",
        },
        {
          situation: "새 자리에서 쌓을 경험이 다음 선택에도 남는 경우",
          implication: "단기 이동이 아니라 경력의 다음 폭을 넓히는 선택인지 판단할 수 있습니다.",
          observableSignal: "새 업무에서 얻을 기술·경험·책임이 다음 경력에도 설명 가능한 형태로 남습니다.",
        },
      ],
      cautions: [
        {
          situation: "직함은 좋아지지만 실제 업무 설명이 모호한 경우",
          implication: "이동 후 책임만 늘고 기대했던 변화는 적을 수 있습니다.",
          observableSignal: "면접이나 제안 과정에서 담당 범위와 최종 책임자를 명확하게 답하지 못합니다.",
        },
        {
          situation: "현재 불만을 빨리 끝내는 것이 결정의 가장 큰 이유가 되는 경우",
          implication: "새 자리의 단점을 충분히 비교하지 못하고 이동 자체를 해결책으로 볼 수 있습니다.",
          observableSignal: "새 자리의 장점보다 현재 회사를 떠나고 싶은 이유를 더 많이 적게 됩니다.",
        },
        {
          situation: "여러 제안을 동시에 비교하면서 핵심 기준이 자주 바뀌는 경우",
          implication: "무엇이 중요한지 흐려져 조건이 비슷한 선택지 사이에서 피로가 커질 수 있습니다.",
          observableSignal: "보상·업무·성장 중 우선순위가 대화할 때마다 달라집니다.",
        },
      ],
    },
    timeline: [
      {
        label: "조건을 분리하는 단계",
        changeSignal: "현재 자리의 불만과 새 자리의 실제 조건을 서로 다른 항목으로 적을 수 있게 됩니다.",
        preparation: "업무 범위·보상·성장·지속 가능성을 각각 비교할 기준을 정합니다.",
      },
      {
        label: "제안의 구체성을 확인하는 단계",
        changeSignal: "새 자리의 역할과 책임이 말이 아니라 구체적인 업무 설명으로 확인됩니다.",
        preparation: "면접이나 제안 과정에서 반드시 확인할 질문을 미리 정리합니다.",
      },
      {
        label: "비교 결과를 좁히는 단계",
        changeSignal: "어떤 선택이 더 나은지보다 어떤 조건이 반드시 충족돼야 하는지가 분명해집니다.",
        preparation: "양보할 수 없는 조건과 조정 가능한 조건을 나눠 적습니다.",
      },
      {
        label: "이동 여부를 결정하는 단계",
        changeSignal: "새 자리가 현재보다 나아지는 이유를 책임·보상·성장 기준으로 설명할 수 있습니다.",
        preparation: "결정 후 생길 공백과 적응 부담까지 감당 가능한지 마지막으로 확인합니다.",
      },
    ],
    action: [
      {
        action: "현재 자리와 새 제안의 조건을 업무 범위·보상·성장·지속 가능성 네 항목으로 비교하세요.",
        target: "현재 자리와 새 제안의 실제 조건",
        condition: "새 제안의 담당 업무와 보상 조건을 구체적으로 확인할 수 있을 때 비교합니다.",
        completionCriteria: "네 항목에서 현재보다 좋아지는 부분과 나빠지는 부분을 각각 설명할 수 있으면 완료입니다.",
      },
      {
        action: "새 자리에서 맡을 책임과 결정권을 질문 목록으로 만들어 제안 과정에서 확인하세요.",
        target: "새 역할의 책임 범위와 의사결정권",
        condition: "직함이나 연봉은 제시됐지만 실제 역할 설명이 충분하지 않을 때 확인합니다.",
        completionCriteria: "담당 업무, 최종 책임, 평가 기준을 각각 한 문장으로 정리할 수 있으면 완료입니다.",
      },
    ],
    avoid: [
      {
        type: "misjudgment",
        behavior: "현재 불만을 빨리 끝내기 위해 새 제안의 조건을 충분히 확인하지 않고 결정하기",
        reason: "떠나는 이유는 분명해도 새 자리가 실제로 더 나은 이유가 확인되지 않을 수 있습니다.",
      },
      {
        type: "bad_condition",
        behavior: "직함이나 연봉 하나만 좋아졌다는 이유로 역할 범위와 지속 가능성을 생략하기",
        reason: "이동 후 만족도는 보상뿐 아니라 실제 책임과 업무 방식이 함께 달라질 때 높아질 수 있습니다.",
      },
    ],
    decisionCheck: [
      "새 자리의 실제 업무와 책임 범위를 한 문장으로 설명할 수 있는가?",
      "보상 증가가 추가 책임과 비교해 충분한지 확인했는가?",
      "이 이동에서 얻을 경험이 다음 경력에도 남는지 설명할 수 있는가?",
    ],
    confidence: {
      level: "중간",
      strongestEvidence: [
        "지금은 이동 여부보다 책임·보상·성장 조건을 나눠 비교하는 판단이 가장 분명합니다.",
        "새 제안의 역할이 구체적일수록 이동 판단의 불확실성을 줄일 수 있습니다.",
      ],
      uncertaintyFactors: [
        "실제 채용 조건, 조직 내부 상황, 상사와 팀의 업무 방식은 제안 과정에서 별도로 확인해야 합니다.",
      ],
      limitations: "이 분석만으로 채용 결과나 입사 후 만족도를 확정할 수는 없습니다. 실제 직무 내용, 계약 조건, 팀 환경을 함께 확인해야 최종 결정을 내릴 수 있습니다.",
    },
  };
}

const plain = makePlainOutput();
assert.equal(validateCustomerFacingLanguage(plain).ok, true, "plain customer copy should pass");
assert.equal(validateCustomerFacingDistinctness(plain).ok, true, "distinct report sections should pass");
assert.equal(validatePremiumCustomerValue(plain).ok, true, "specific decision support should pass");

const jargonInTechnicalDetail = makePlainOutput();
jargonInTechnicalDetail.cause.reasons[0].observedStructure = "정재격·신약·대운 계산을 함께 확인합니다.";
assert.equal(
  validateCustomerFacingLanguage(jargonInTechnicalDetail).ok,
  true,
  "technical jargon must remain allowed only inside collapsed calculation evidence",
);

const jargonInCustomerCopy = makePlainOutput();
jargonInCustomerCopy.current.summary = "정재격과 신약한 일간 때문에 지금은 이직 조건을 봐야 합니다.";
const jargonResult = validateCustomerFacingLanguage(jargonInCustomerCopy);
assert.equal(jargonResult.ok, false, "jargon in customer-facing copy must fail");
assert(
  jargonResult.issues.some((issue) => issue.field === "current.summary"),
  "jargon failure must identify the customer-facing field",
);

const ganjiInCustomerCopy = makePlainOutput();
ganjiInCustomerCopy.timeline[0].changeSignal = "병오 세운이 강해져 이동 신호가 나타납니다.";
assert.equal(
  validateCustomerFacingLanguage(ganjiInCustomerCopy).ok,
  false,
  "ganji and seun names must not leak into customer timeline copy",
);

const genericCopy = makePlainOutput();
genericCopy.conclusion.rationale = "좋은 시기입니다. 흐름을 잘 활용하세요.";
assert.equal(
  validateCustomerFacingLanguage(genericCopy).ok,
  false,
  "generic paid-report filler must fail customer value validation",
);

const repeated = makePlainOutput();
repeated.current.summary = repeated.cause.summary;
assert.equal(
  validateCustomerFacingDistinctness(repeated).ok,
  false,
  "semantically repeated section summaries must fail",
);

const shallow = makePlainOutput();
shallow.conclusion.immediateAction = "확인하세요.";
assert.equal(
  validatePremiumCustomerValue(shallow).ok,
  false,
  "shallow generic immediate action must fail",
);

const launchIds = getLaunchProductIds();
assert.equal(launchIds.length, 57, "all 57 paid-analysis products must remain covered");
for (const productId of launchIds) {
  const engine = getPaidAnalysisEngine(productId);
  assert(engine, productId + " must resolve to a paid analysis engine");
  const prompt = buildPaidAnalysisDetailPromptV4({
    productId,
    analysisType: productId,
    birthData: "test",
    originalChart: "test",
    coreInterpretation: "test",
    fortuneTiming: "test",
    sajuSummary: "test",
    currentFortuneFlow: "test",
  });
  assert(
    prompt.includes("[고객용 본문과 전문 계산 근거 분리]") &&
      prompt.includes("전문용어 자체를 계산 근거 영역으로 분리") &&
      prompt.includes("고객이 리포트를 다 읽고 나면"),
    productId + " must receive the strict premium customer-value contract",
  );
}

const engine = read("app/lib/paidAnalysisEngine.ts");
for (const phrase of [
  "역할 범위, 책임, 보상 조건",
  "수입 안정성, 고정 지출, 변동 지출",
  "연락의 일관성, 약속 이행, 상호성",
  "수면·기상 시각, 일정 밀도",
  "집중이 유지되는 시간대, 학습량 배분",
  "확장 속도, 현금 여유, 고객 의존도",
  "이번 달·다음 달·올해·내년",
]) {
  assert(engine.includes(phrase), "category-specific real-world translation rule missing: " + phrase);
}

const service = read("app/lib/paidAnalysisDetailService.ts");
for (const symbol of [
  "validateCustomerFacingLanguage",
  "validateCustomerFacingDistinctness",
  "validatePremiumCustomerValue",
  "auditPaidAnalysisV4ActualOutputTier",
]) {
  assert(service.includes(symbol), "live V4 generation must enforce " + symbol);
}
assert(
  service.includes("가격 단계 품질 기준"),
  "paid-tier depth failures must block storage instead of becoming customer reports",
);

const retry = read("app/lib/paidAnalysisV4ConsistencyRetry.ts");
assert(
  retry.includes("PAID_ANALYSIS_V4_CONSISTENCY_RETRY_LIMIT = 2") &&
    retry.includes("품질 기준을 충족하지 못했습니다") &&
    retry.includes("가격 단계 품질 기준을 충족하지 못했습니다"),
  "customer value failures must receive bounded automatic regeneration",
);

const report = read("app/paid-analysis/[productId]/PaidAnalysisV4Report.tsx");
assert(!report.includes("자주 나오는 사주 용어 쉽게 보기"), "primary report flow must not teach jargon");
assert(!report.includes("신뢰도 {detail.confidence.level}"), "internal confidence level must not look like a product score");
for (const phrase of [
  "이 판단을 뒷받침하는 근거",
  "비교적 분명하게 볼 수 있는 부분",
  "현실에서 추가로 확인해야 할 부분",
  "이 분석만으로 정할 수 없는 것",
]) {
  assert(report.includes(phrase), "customer decision-support UI missing: " + phrase);
}

console.log("premium-report-v4-customer-value-regression: PASS (57/57 products)");
