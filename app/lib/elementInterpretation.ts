import type {
  Element,
  ElementAnalysis,
} from "./elements";

export type ElementStrengthLevel =
  | "매우 강함"
  | "강함"
  | "보통"
  | "약함"
  | "매우 약함";

export type ElementInterpretationItem = {
  element: Element;
  score: number;
  percentage: number;
  level: ElementStrengthLevel;
  description: string;
};

export type ElementInterpretation = {
  items: ElementInterpretationItem[];
  strongest: Element[];
  weakest: Element[];
  summary: string;
};

const elementOrder: Element[] = [
  "목",
  "화",
  "토",
  "금",
  "수",
];
const elementDescriptions: Record<
  Element,
  Record<ElementStrengthLevel, string>
> = {
  목: {
    "매우 강함":
      "성장과 확장 욕구가 매우 강합니다. 추진력은 좋지만 방향을 자주 넓히지 않도록 선택과 집중이 필요합니다.",
    강함:
      "성장 의지와 새로운 일을 시작하는 힘이 비교적 강합니다.",
    보통:
      "성장성과 유연성이 비교적 균형 있게 나타납니다.",
    약함:
      "새로운 시작이나 장기적인 성장 계획을 의식적으로 보완하는 것이 좋습니다.",
    "매우 약함":
      "변화와 확장보다 익숙한 환경을 선호할 수 있어, 작은 도전부터 시작하는 것이 도움이 됩니다.",
  },

  화: {
    "매우 강함":
      "표현력과 실행력이 매우 강합니다. 빠른 추진력이 장점이지만 성급한 판단과 과열은 조절할 필요가 있습니다.",
    강함:
      "활동성·표현력·추진력이 비교적 강하게 나타납니다.",
    보통:
      "열정과 표현력이 무리 없이 균형을 이루는 편입니다.",
    약함:
      "자신을 드러내거나 행동으로 옮기는 힘을 의식적으로 키우는 것이 좋습니다.",
    "매우 약함":
      "생각을 행동으로 전환하는 데 시간이 걸릴 수 있어 명확한 실행 계획이 도움이 됩니다.",
  },

  토: {
    "매우 강함":
      "안정성과 책임감이 매우 강합니다. 신중함은 장점이지만 변화에 지나치게 보수적이지 않도록 주의해야 합니다.",
    강함:
      "현실 감각과 책임감, 꾸준함이 비교적 강합니다.",
    보통:
      "안정성과 변화 수용력이 비교적 균형을 이루는 편입니다.",
    약함:
      "계획을 지속하고 생활 기반을 안정시키는 습관을 보완하는 것이 좋습니다.",
    "매우 약함":
      "일의 중심을 잡거나 꾸준히 유지하는 데 어려움을 느낄 수 있어 규칙적인 생활이 도움이 됩니다.",
  },

  금: {
    "매우 강함":
      "판단력과 원칙 의식이 매우 강합니다. 결단력은 좋지만 지나친 완벽주의나 냉정함은 조절할 필요가 있습니다.",
    강함:
      "분석력·판단력·결단력이 비교적 강하게 나타납니다.",
    보통:
      "원칙과 유연성이 비교적 균형을 이루는 편입니다.",
    약함:
      "우선순위를 정하고 분명하게 결정하는 연습이 도움이 됩니다.",
    "매우 약함":
      "경계를 설정하거나 결정을 내리는 데 어려움을 느낄 수 있어 명확한 기준을 만드는 것이 좋습니다.",
  },

  수: {
    "매우 강함":
      "사고력과 감수성이 매우 강합니다. 통찰력은 좋지만 생각이 지나치게 많아지지 않도록 행동과 균형을 맞춰야 합니다.",
    강함:
      "관찰력·사고력·적응력이 비교적 강하게 나타납니다.",
    보통:
      "사고와 행동의 흐름이 비교적 균형을 이루는 편입니다.",
    약함:
      "충분히 생각하고 정보를 받아들이는 시간을 의식적으로 확보하는 것이 좋습니다.",
    "매우 약함":
      "상황을 유연하게 받아들이거나 깊이 숙고하는 힘을 보완하기 위해 휴식과 기록이 도움이 됩니다.",
  },
};

function getStrengthLevel(
  percentage: number
): ElementStrengthLevel {
  if (percentage >= 30) {
    return "매우 강함";
  }

  if (percentage >= 24) {
    return "강함";
  }

  if (percentage >= 16) {
    return "보통";
  }

  if (percentage >= 10) {
    return "약함";
  }

  return "매우 약함";
}

export function interpretElementAnalysis(
  analysis: ElementAnalysis
): ElementInterpretation {
  const items = elementOrder.map((element) => {
    const percentage = analysis.percentages[element];
    const level = getStrengthLevel(percentage);

    return {
      element,
      score: analysis.counts[element],
      percentage,
      level,
      description: elementDescriptions[element][level],
    };
  });

  const strongestText =
    analysis.strongest.length > 0
      ? analysis.strongest.join(", ")
      : "없음";

  const weakestText =
    analysis.weakest.length > 0
      ? analysis.weakest.join(", ")
      : "없음";

  return {
    items,
    strongest: analysis.strongest,
    weakest: analysis.weakest,
    summary: `가장 강한 오행은 ${strongestText}, 가장 약한 오행은 ${weakestText}입니다.`,
  };
}

 
