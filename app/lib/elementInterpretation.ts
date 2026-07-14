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
  const items = elementOrder.map((element) => ({
    element,
    score: analysis.counts[element],
    percentage: analysis.percentages[element],
    level: getStrengthLevel(
      analysis.percentages[element]
    ),
  }));

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