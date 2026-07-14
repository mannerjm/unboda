import type {
  Element,
  ElementAnalysis,
} from "./elements";

export type ElementRelationType =
  | "생조"
  | "설기"
  | "극함"
  | "극받음";

export type ElementRelationItem = {
  source: Element;
  target: Element;
  type: ElementRelationType;
  sourcePercentage: number;
  targetPercentage: number;
  strength: "강함" | "보통" | "약함";
  description: string;
};

export type ElementRelationsAnalysis = {
  relations: ElementRelationItem[];
  summary: string;
};

const generates: Record<Element, Element> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

const controls: Record<Element, Element> = {
  목: "토",
  화: "금",
  토: "수",
  금: "목",
  수: "화",
};

const elementOrder: Element[] = [
  "목",
  "화",
  "토",
  "금",
  "수",
];

function getRelationStrength(
  sourcePercentage: number
): "강함" | "보통" | "약함" {
  if (sourcePercentage >= 25) {
    return "강함";
  }

  if (sourcePercentage >= 15) {
    return "보통";
  }

  return "약함";
}

export function analyzeElementRelations(
  analysis: ElementAnalysis
): ElementRelationsAnalysis {
  const relations: ElementRelationItem[] = [];

  for (const source of elementOrder) {
    const generatedTarget = generates[source];
    const controlledTarget = controls[source];

    const sourcePercentage =
      analysis.percentages[source];

    const generatedPercentage =
      analysis.percentages[generatedTarget];

    const controlledPercentage =
      analysis.percentages[controlledTarget];

    relations.push({
      source,
      target: generatedTarget,
      type: "생조",
      sourcePercentage,
      targetPercentage: generatedPercentage,
      strength: getRelationStrength(sourcePercentage),
      description:
        `${source} 기운은 ${generatedTarget} 기운을 생합니다. ` +
        `${source}의 비율은 ${sourcePercentage}%이고 ` +
        `${generatedTarget}의 비율은 ${generatedPercentage}%입니다.`,
    });

    relations.push({
      source,
      target: controlledTarget,
      type: "극함",
      sourcePercentage,
      targetPercentage: controlledPercentage,
      strength: getRelationStrength(sourcePercentage),
      description:
        `${source} 기운은 ${controlledTarget} 기운을 제어합니다. ` +
        `${source}의 비율은 ${sourcePercentage}%이고 ` +
        `${controlledTarget}의 비율은 ${controlledPercentage}%입니다.`,
    });
  }

  const strongestText =
    analysis.strongest.length > 0
      ? analysis.strongest.join(", ")
      : "없음";

  const weakestText =
    analysis.weakest.length > 0
      ? analysis.weakest.join(", ")
      : "없음";

  return {
    relations,
    summary:
      `가장 강한 오행은 ${strongestText}, ` +
      `가장 약한 오행은 ${weakestText}입니다. ` +
      `상생과 상극 관계를 함께 살펴 균형을 판단합니다.`,
  };
}