import type {
  PaidAnalysisEvidenceKey,
  ResolvedPaidAnalysisDetailV4,
} from "../app/lib/paidAnalysisDetailOutput";
import { auditPaidAnalysisV4ActualOutputTier } from "../app/lib/paidAnalysisV4ActualOutputTierQuality";
import { resolvePaidAnalysisLaunchSpecialization } from "../app/lib/paidAnalysisTopicConfig";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function makeTopicOutput(
  productId: string,
  evidenceCount: number,
  actionCount: number,
  confidenceEvidenceCount: number,
): ResolvedPaidAnalysisDetailV4 {
  const specialization = resolvePaidAnalysisLaunchSpecialization(productId);
  if (specialization.kind !== "topic") {
    throw new Error(`${productId} must be a topic product for this regression`);
  }

  const config = specialization.config;
  const evidenceKeys = [...new Set(config.evidenceFocus)].slice(
    0,
    evidenceCount,
  ) as PaidAnalysisEvidenceKey[];
  const focus = config.analysisFocus[0] ?? config.userQuestion;
  const secondaryFocus = config.analysisFocus[1] ?? focus;
  const thirdFocus = config.analysisFocus[2] ?? secondaryFocus;
  const actionFocus = config.actionFocus;
  const insightPrompts = config.requiredInsights.map((item) => item.prompt);

  return {
    schemaVersion: "v4",
    conclusion: {
      headline: `${focus}를 먼저 판단합니다`,
      direction: "조정",
      focus,
      rationale: `${focus}와 ${secondaryFocus}를 함께 비교해 현재 선택 범위를 좁힙니다.`,
      immediateAction: `${actionFocus[0] ?? focus}을 먼저 확인하고 완료 기준을 기록합니다.`,
    },
    coreProblem: {
      title: `${focus}의 우선순위`,
      description: `${focus}가 ${secondaryFocus}와 충돌할 때 무엇을 먼저 조정할지 분명하지 않은 상태를 점검합니다.`,
      whyItMatters: `${thirdFocus}까지 같은 기준으로 묶으면 상품 고유 판단이 흐려질 수 있어 분리해서 확인해야 합니다.`,
    },
    cause: {
      summary: `${focus}, ${secondaryFocus}, ${thirdFocus}의 서로 다른 작동 조건을 분리합니다.`,
      reasons: [focus, secondaryFocus, thirdFocus].map((text, index) => ({
        title: `원인 ${index + 1}: ${text}`,
        observedStructure: `명리 근거 ${index + 1}에서 확인되는 서로 다른 구조를 사용합니다.`,
        realWorldPattern: `${text}가 현실에서 반복되는 조건과 관찰 신호를 구체적으로 구분합니다.`,
        problemLinkage: `${text}가 현재 핵심 문제와 어떤 방식으로 연결되는지 설명합니다.`,
      })),
    },
    evidence: evidenceKeys.map((evidenceKey, index) => ({
      evidenceKey,
      label: `근거 ${index + 1}`,
      fact: `서버 계산 사실 ${index + 1}`,
      meaning: `${insightPrompts[index] ?? focus}를 판단하는 명리 근거입니다.`,
      linkage: `조정 방향에서 ${focus}를 확인하는 근거 ${index + 1}입니다.`,
    })),
    current: {
      summary: `${focus}를 실제 상황에서 확인할 관찰 신호를 기회와 주의로 나눕니다.`,
      opportunities: [0, 1, 2].map((index) => ({
        situation: `기회 상황 ${index + 1}에서 ${focus}를 확인합니다.`,
        implication: `기회 의미 ${index + 1}가 선택 범위를 넓히는지 확인합니다.`,
        observableSignal: `기회 관찰 신호 ${index + 1}의 반복 여부를 기록합니다.`,
      })),
      cautions: [0, 1, 2].map((index) => ({
        situation: `주의 상황 ${index + 1}에서 ${secondaryFocus}를 확인합니다.`,
        implication: `주의 의미 ${index + 1}가 선택 비용을 키우는지 확인합니다.`,
        observableSignal: `주의 관찰 신호 ${index + 1}의 반복 여부를 기록합니다.`,
      })),
    },
    timeline: [0, 1, 2, 3].map((index) => ({
      label: `검토 단계 ${index + 1}`,
      changeSignal: `${focus}의 변화 신호 ${index + 1}를 확인합니다.`,
      preparation: `${actionFocus[index % Math.max(actionFocus.length, 1)] ?? focus}의 준비 상태를 점검합니다.`,
    })),
    action: Array.from({ length: actionCount }, (_, index) => ({
      action: `${actionFocus[index] ?? `${focus} 행동 ${index + 1}`}을 실행합니다`,
      target: actionFocus[index] ?? `${focus} 대상 ${index + 1}`,
      condition: `${focus} 관련 관찰 신호 ${index + 1}가 반복될 때 실행합니다.`,
      completionCriteria: `${actionFocus[index] ?? focus}의 완료 기준 ${index + 1}을 확인하면 재검토합니다.`,
    })),
    avoid: [0, 1].map((index) => ({
      type: index === 0 ? "misjudgment" : "risky_action",
      behavior: `${focus}를 한 번의 신호만으로 결론 내리는 행동 ${index + 1}`,
      reason: `${secondaryFocus}와 비교할 근거가 부족해 판단을 왜곡할 수 있습니다.`,
    })),
    decisionCheck:
      config.decisionType === "decision"
        ? [
            `${focus}의 핵심 조건이 실제로 확인되었는가?`,
            `${secondaryFocus}의 부담이 감당 가능한 수준인가?`,
            `${thirdFocus}를 다시 검토할 신호가 정해져 있는가?`,
          ]
        : undefined,
    confidence: {
      level: "중간",
      strongestEvidence: Array.from(
        { length: confidenceEvidenceCount },
        (_, index) => `${focus}를 뒷받침하는 서로 다른 핵심 근거 ${index + 1}입니다.`,
      ),
      uncertaintyFactors: [`${secondaryFocus}의 실제 환경 조건은 추가 확인이 필요합니다.`],
      limitations: `${focus}의 미래 결과를 확정하지 않고 현재 확인 가능한 조건과 선택 기준만 제시합니다.`,
    },
  };
}

const core = makeTopicOutput("career-job-change", 3, 2, 2);
const coreAudit = auditPaidAnalysisV4ActualOutputTier("career-job-change", core);
assert(coreAudit.ok, `valid CORE fixture must pass: ${JSON.stringify(coreAudit.issues)}`);

const deep = makeTopicOutput("relationship-current", 4, 3, 2);
const deepAudit = auditPaidAnalysisV4ActualOutputTier("relationship-current", deep);
assert(deepAudit.ok, `valid DEEP fixture with canonical 2+ confidence evidence must pass: ${JSON.stringify(deepAudit.issues)}`);
assert(deepAudit.metrics.confidenceEvidenceCount === 2, "DEEP regression must exercise the canonical two-item confidence minimum");
assert(deepAudit.metrics.depthUnits > coreAudit.metrics.depthUnits, "DEEP fixture must own more actual depth units than CORE fixture");

const shallowDeep: ResolvedPaidAnalysisDetailV4 = {
  ...deep,
  evidence: deep.evidence.slice(0, 3),
};
const shallowDeepAudit = auditPaidAnalysisV4ActualOutputTier(
  "relationship-current",
  shallowDeep,
);
assert(!shallowDeepAudit.ok, "DEEP output with only three evidence axes must fail");
assert(
  shallowDeepAudit.issues.some((issue) => issue.field === "evidence"),
  "shallow DEEP failure must identify evidence depth",
);

const duplicateActionDeep: ResolvedPaidAnalysisDetailV4 = {
  ...deep,
  action: deep.action.map((item) => ({
    ...item,
    target: deep.action[0].target,
  })),
};
const duplicateActionAudit = auditPaidAnalysisV4ActualOutputTier(
  "relationship-current",
  duplicateActionDeep,
);
assert(!duplicateActionAudit.ok, "DEEP output with duplicate action targets must fail");

console.log(
  `[v4-actual-output-tier] PASS coreDepth=${coreAudit.metrics.depthUnits} deepDepth=${deepAudit.metrics.depthUnits}`,
);
