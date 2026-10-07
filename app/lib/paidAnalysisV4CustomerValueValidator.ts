import type { PaidAnalysisDetailOutputV4 } from "./paidAnalysisDetailOutput";
import type {
  PaidAnalysisQualityIssue,
  PaidAnalysisQualityResult,
} from "./paidAnalysisV4QualityValidators";

const CUSTOMER_JARGON_PATTERNS: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /원국/u, label: "원국" },
  { pattern: /월령/u, label: "월령" },
  { pattern: /일간/u, label: "일간" },
  { pattern: /천간/u, label: "천간" },
  { pattern: /지지\s*[자축인묘진사오미신유술해](?:\s|와|과|의|가|는|를|을|$)/u, label: "지지 글자" },
  { pattern: /지장간/u, label: "지장간" },
  { pattern: /통근/u, label: "통근" },
  { pattern: /투간/u, label: "투간" },
  { pattern: /오행/u, label: "오행" },
  { pattern: /십성/u, label: "십성" },
  { pattern: /비견|겁재|식신|편재|정재|편관|정관|편인|정인/u, label: "십성 세부 용어" },
  { pattern: /상관격|(?:^|[\s·,()])상관(?:은|을|의|이(?!\s*없)|[\s·,().]|$)/u, label: "상관" },
  { pattern: /(?:^|[\s·,()])(?:재성|관성|인성|비겁|식상)(?:이|은|을|의|과|에서|[\s·,().]|$)/u, label: "십성 묶음 용어" },
  { pattern: /신강|신약/u, label: "신강·신약" },
  { pattern: /용신|희신|기신/u, label: "용신 계열" },
  { pattern: /격국/u, label: "격국" },
  { pattern: /대운/u, label: "대운" },
  { pattern: /세운/u, label: "세운" },
  { pattern: /신살/u, label: "신살" },
  { pattern: /(?:목|화|토|금|수)\s*기운/u, label: "오행 기운" },
  { pattern: /합[·ㆍ\-/ ]*충|충[·ㆍ\-/ ]*형|형[·ㆍ\-/ ]*해/u, label: "합충형해" },
  { pattern: /[자축인묘진사오미신유술해]{2}(?:합|충|형|해|파)/u, label: "지지 관계 용어" },
  {
    pattern: /(?:원국|대운|세운|간지|연주|월주|일주|시주)\s*[갑을병정무기경신임계][자축인묘진사오미신유술해]|[갑을병정무기경신임계][자축인묘진사오미신유술해]\s*(?:대운|세운|간지|연주|월주|일주|시주)/u,
    label: "간지 이름",
  },
];

const GENERIC_CUSTOMER_VALUE_PATTERNS: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /좋은 시기(?:입니다|예요|이다)?/u, label: "좋은 시기" },
  { pattern: /주의가 필요(?:합니다|해요|하다)?/u, label: "주의가 필요" },
  { pattern: /흐름을 (?:잘 )?활용/u, label: "흐름을 활용" },
  { pattern: /기운을 (?:잘 )?활용/u, label: "기운을 활용" },
  { pattern: /균형을 (?:잘 )?맞추/u, label: "균형을 맞추" },
  { pattern: /상황에 따라 다(?:릅니다|를 수 있습니다)/u, label: "상황에 따라 다름" },
];

const DIFFICULT_CUSTOMER_LANGUAGE_PATTERNS: readonly { pattern: RegExp; label: string; replacement: string }[] = [
  { pattern: /메커니즘/u, label: "메커니즘", replacement: "왜 이런 일이 생기는지" },
  { pattern: /상호성/u, label: "상호성", replacement: "서로 주고받는 정도" },
  { pattern: /완수력/u, label: "완수력", replacement: "끝까지 해내는 힘" },
  { pattern: /지원 장치/u, label: "지원 장치", replacement: "도움받을 방법" },
  { pattern: /평가 공백/u, label: "평가 공백", replacement: "평가할 근거가 부족한 부분" },
  { pattern: /지속 가능성/u, label: "지속 가능성", replacement: "오래 이어갈 수 있는지" },
  { pattern: /변동성/u, label: "변동성", replacement: "변화가 큰 정도" },
  { pattern: /책임 압력/u, label: "책임 압력", replacement: "책임 부담" },
  { pattern: /관찰 창/u, label: "관찰 창", replacement: "확인할 기간" },
  { pattern: /후속 이행/u, label: "후속 이행", replacement: "약속한 일을 실제로 하는지" },
  { pattern: /책임 소재/u, label: "책임 소재", replacement: "누가 책임지는지" },
  { pattern: /판단 권한/u, label: "판단 권한", replacement: "스스로 결정할 수 있는 범위" },
  { pattern: /관찰 신호/u, label: "관찰 신호", replacement: "확인할 신호" },
  { pattern: /우선순위/u, label: "우선순위", replacement: "먼저 할 일" },
  { pattern: /위임/u, label: "위임", replacement: "일을 맡기는 것" },
  { pattern: /조율/u, label: "조율", replacement: "서로 맞추기" },
];

const UNEXPLAINED_CALCULATION_NUMBER_PATTERNS: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /\d+(?:\.\d+)?\s*%/u, label: "퍼센트" },
  { pattern: /(?:점수|비율|수치|강도)\s*[:：]?\s*\d+(?:\.\d+)?/u, label: "점수·비율 수치" },
  { pattern: /\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?/u, label: "기준 없는 숫자 비율" },
  { pattern: /(?:돕는 힘|누르는 힘)\s*\d+(?:\.\d+)?/u, label: "내부 힘 점수" },
  { pattern: /\d+(?:\.\d+)?\s*점/u, label: "점수" },
];

function collectCustomerFacingV4Texts(
  output: PaidAnalysisDetailOutputV4,
): [string, string][] {
  const entries: [string, string][] = [
    ["conclusion.headline", output.conclusion.headline],
    ["conclusion.focus", output.conclusion.focus],
    ["conclusion.rationale", output.conclusion.rationale],
    ["conclusion.immediateAction", output.conclusion.immediateAction],
    ["coreProblem.title", output.coreProblem.title],
    ["coreProblem.description", output.coreProblem.description],
    ["coreProblem.whyItMatters", output.coreProblem.whyItMatters],
    ["cause.summary", output.cause.summary],
    ["current.summary", output.current.summary],
    ["confidence.limitations", output.confidence.limitations],
  ];

  output.cause.reasons.forEach((reason, index) => {
    entries.push(["cause.reasons[" + index + "].title", reason.title]);
    entries.push(["cause.reasons[" + index + "].realWorldPattern", reason.realWorldPattern]);
    entries.push(["cause.reasons[" + index + "].problemLinkage", reason.problemLinkage]);
    // observedStructure is intentionally excluded: the UI keeps it inside
    // "계산 근거 펼쳐보기".
  });

  output.evidence.forEach((item, index) => {
    entries.push(["evidence[" + index + "].meaning", item.meaning]);
    entries.push(["evidence[" + index + "].linkage", item.linkage]);
  });

  output.current.opportunities.forEach((item, index) => {
    entries.push(["current.opportunities[" + index + "].situation", item.situation]);
    entries.push(["current.opportunities[" + index + "].implication", item.implication]);
    entries.push(["current.opportunities[" + index + "].observableSignal", item.observableSignal]);
  });
  output.current.cautions.forEach((item, index) => {
    entries.push(["current.cautions[" + index + "].situation", item.situation]);
    entries.push(["current.cautions[" + index + "].implication", item.implication]);
    entries.push(["current.cautions[" + index + "].observableSignal", item.observableSignal]);
  });

  output.timeline.forEach((item, index) => {
    entries.push(["timeline[" + index + "].label", item.label]);
    entries.push(["timeline[" + index + "].changeSignal", item.changeSignal]);
    entries.push(["timeline[" + index + "].preparation", item.preparation]);
  });

  output.action.forEach((item, index) => {
    entries.push(["action[" + index + "].action", item.action]);
    entries.push(["action[" + index + "].target", item.target]);
    entries.push(["action[" + index + "].condition", item.condition]);
    entries.push(["action[" + index + "].completionCriteria", item.completionCriteria]);
  });

  output.avoid.forEach((item, index) => {
    entries.push(["avoid[" + index + "].behavior", item.behavior]);
    entries.push(["avoid[" + index + "].reason", item.reason]);
  });

  output.decisionCheck?.forEach((item, index) => {
    entries.push(["decisionCheck[" + index + "]", item]);
  });

  output.confidence.strongestEvidence.forEach((item, index) => {
    entries.push(["confidence.strongestEvidence[" + index + "]", item]);
  });
  output.confidence.uncertaintyFactors.forEach((item, index) => {
    entries.push(["confidence.uncertaintyFactors[" + index + "]", item]);
  });

  if (output.periodAnalysis) {
    entries.push(["periodAnalysis.headline", output.periodAnalysis.headline]);
    output.periodAnalysis.timelineItems.forEach((item, index) => {
      // label is a deterministic strategy label and may contain the product's
      // canonical term (for example 대운), so only generated copy is checked.
      entries.push(["periodAnalysis.timelineItems[" + index + "].title", item.title]);
      entries.push(["periodAnalysis.timelineItems[" + index + "].summary", item.summary]);
      item.actions?.forEach((value, actionIndex) => {
        entries.push(["periodAnalysis.timelineItems[" + index + "].actions[" + actionIndex + "]", value]);
      });
      item.cautions?.forEach((value, cautionIndex) => {
        entries.push(["periodAnalysis.timelineItems[" + index + "].cautions[" + cautionIndex + "]", value]);
      });
    });
    output.periodAnalysis.keyPoints?.forEach((item, index) => {
      entries.push(["periodAnalysis.keyPoints[" + index + "]", item]);
    });
  }

  return entries;
}

export function validateCustomerFacingLanguage(
  output: PaidAnalysisDetailOutputV4,
): PaidAnalysisQualityResult {
  const issues: PaidAnalysisQualityIssue[] = [];

  for (const [field, value] of collectCustomerFacingV4Texts(output)) {
    for (const { pattern, label } of CUSTOMER_JARGON_PATTERNS) {
      if (pattern.test(value)) {
        issues.push({
          field,
          message:
            "고객 본문에 내부 명리 용어(" +
            label +
            ")가 남아 있습니다. 계산 근거로 옮기고 생활 언어로 다시 작성해야 합니다.",
        });
        break;
      }
    }

    for (const { pattern, label } of GENERIC_CUSTOMER_VALUE_PATTERNS) {
      if (pattern.test(value)) {
        issues.push({
          field,
          message:
            "가격 대비 가치가 낮은 추상 표현(" +
            label +
            ")이 남아 있습니다. 실제 판단 기준이나 확인 조건으로 다시 작성해야 합니다.",
        });
        break;
      }
    }

    for (const { pattern, label, replacement } of DIFFICULT_CUSTOMER_LANGUAGE_PATTERNS) {
      if (pattern.test(value)) {
        issues.push({
          field,
          message:
            "고객이 빠르게 이해하기 어려운 표현(" +
            label +
            ")이 남아 있습니다. ‘" +
            replacement +
            "’처럼 쉬운 말로 다시 작성해야 합니다.",
        });
        break;
      }
    }
  }

  output.cause.reasons.forEach((reason, index) => {
    for (const { pattern, label } of UNEXPLAINED_CALCULATION_NUMBER_PATTERNS) {
      if (pattern.test(reason.observedStructure)) {
        issues.push({
          field: "cause.reasons[" + index + "].observedStructure",
          message:
            "계산 근거에 기준을 모르면 해석할 수 없는 숫자(" +
            label +
            ")가 노출되어 있습니다. 숫자 없이 계산 결과의 뜻만 설명해야 합니다.",
        });
        break;
      }
    }
  });

  return { ok: issues.length === 0, issues };
}

function textShingles(value: string, width = 3): Set<string> {
  const normalized = value
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();
  const result = new Set<string>();
  if (normalized.length < width) return result;
  for (let index = 0; index <= normalized.length - width; index += 1) {
    result.add(normalized.slice(index, index + width));
  }
  return result;
}

function shingleSimilarity(left: string, right: string): number {
  const leftSet = textShingles(left);
  const rightSet = textShingles(right);
  if (leftSet.size === 0 || rightSet.size === 0) return 0;
  const intersection = [...leftSet].filter((item) => rightSet.has(item)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union > 0 ? intersection / union : 0;
}

export function validateCustomerFacingDistinctness(
  output: PaidAnalysisDetailOutputV4,
): PaidAnalysisQualityResult {
  const issues: PaidAnalysisQualityIssue[] = [];
  const sections: [string, string][] = [
    ["conclusion.rationale", output.conclusion.rationale],
    ["coreProblem.whyItMatters", output.coreProblem.whyItMatters],
    ["cause.summary", output.cause.summary],
    ["current.summary", output.current.summary],
    ["confidence.limitations", output.confidence.limitations],
  ];

  for (let leftIndex = 0; leftIndex < sections.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < sections.length; rightIndex += 1) {
      const [leftField, leftText] = sections[leftIndex];
      const [rightField, rightText] = sections[rightIndex];
      if (leftText.length < 28 || rightText.length < 28) continue;
      const similarity = shingleSimilarity(leftText, rightText);
      if (similarity >= 0.72) {
        issues.push({
          field: leftField + " / " + rightField,
          message:
            "서로 다른 섹션이 같은 결론을 반복하고 있습니다. 각 섹션의 판단 책임을 분리해야 합니다.",
        });
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

export function validatePremiumCustomerValue(
  output: PaidAnalysisDetailOutputV4,
): PaidAnalysisQualityResult {
  const issues: PaidAnalysisQualityIssue[] = [];

  if (output.conclusion.immediateAction.trim().length < 12) {
    issues.push({
      field: "conclusion.immediateAction",
      message:
        "유료 리포트의 즉시 행동이 너무 짧아 무엇을 해야 하는지 충분히 설명하지 못합니다.",
    });
  }

  const observableSignals = [
    ...output.current.opportunities.map((item) => item.observableSignal.trim()),
    ...output.current.cautions.map((item) => item.observableSignal.trim()),
  ];
  if (observableSignals.some((signal) => signal.length < 10)) {
    issues.push({
      field: "current.observableSignal",
      message:
        "기회·주의 항목에는 고객이 실제 생활에서 확인할 수 있는 구체적인 관찰 신호가 필요합니다.",
    });
  }

  output.action.forEach((item, index) => {
    if (
      item.condition.trim().length < 10 ||
      item.completionCriteria.trim().length < 10
    ) {
      issues.push({
        field: "action[" + index + "]",
        message:
          "행동에는 판단을 바꿀 조건과 완료 기준이 모두 구체적으로 필요합니다.",
      });
    }
  });

  if (output.confidence.limitations.trim().length < 20) {
    issues.push({
      field: "confidence.limitations",
      message:
        "현실 변수와 분석 한계를 고객이 실제 판단에 사용할 수 있을 정도로 설명해야 합니다.",
    });
  }

  return { ok: issues.length === 0, issues };
}
