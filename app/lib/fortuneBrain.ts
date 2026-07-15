import type { StrengthAnalysis } from "./strength";
import type { ElementInterpretation } from "./elementInterpretation";
import type { ElementRelationsAnalysis } from "./elementRelations";

export type FortuneBrainResult = {
  structure: string;

  strengths: string[];

  weaknesses: string[];

  recommendations: string[];

  summary: string;
};

export type FortuneBrainInput = {
  strength: StrengthAnalysis;

  elements: ElementInterpretation;

  relations: ElementRelationsAnalysis;
};

export function analyzeFortuneBrain(
  input: FortuneBrainInput
): FortuneBrainResult {
  const {
    strength,
    elements,
    relations,
  } = input;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  const strongElements = elements.items.filter(
    (item) =>
      item.level === "강함" ||
      item.level === "매우 강함"
  );

  const weakElements = elements.items.filter(
    (item) =>
      item.level === "약함" ||
      item.level === "매우 약함"
  );

  for (const item of strongElements) {
    strengths.push(
      `${item.element} 기운이 ${item.level}`
    );
  }

  for (const item of weakElements) {
    weaknesses.push(
      `${item.element} 기운이 ${item.level}`
    );

    recommendations.push(
      `${item.element}의 성질을 일상에서 의식적으로 보완하기`
    );
  }

  if (
    strength.level === "신강" ||
    strength.level === "매우 신강"
  ) {
    strengths.push("자기 주도성과 버티는 힘이 강한 편");

    recommendations.push(
      "혼자 밀어붙이기보다 주변의 의견을 함께 확인하기"
    );
  }

  if (
    strength.level === "신약" ||
    strength.level === "매우 신약"
  ) {
    weaknesses.push(
      "외부 환경이나 관계의 영향을 크게 받을 수 있음"
    );

    recommendations.push(
      "체력과 생활 리듬을 안정적으로 유지하기"
    );
  }

  if (strength.level === "중화") {
    strengths.push(
      "자기 힘과 외부 환경의 균형이 비교적 안정적"
    );
  }

  const strongRelations = relations.highlights.filter(
    (relation) => relation.strength === "강함"
  );

  for (const relation of strongRelations) {
    if (relation.type === "생조") {
      strengths.push(
        `${relation.source}가 ${relation.target}을 돕는 흐름`
      );
    }

    if (relation.type === "극함") {
      weaknesses.push(
        `${relation.source}가 ${relation.target}을 강하게 제어하는 흐름`
      );
    }
  }

  const uniqueStrengths = [...new Set(strengths)];
  const uniqueWeaknesses = [...new Set(weaknesses)];
  const uniqueRecommendations = [
    ...new Set(recommendations),
  ];

  const strongestText =
    elements.strongest.length > 0
      ? elements.strongest.join(", ")
      : "확인되지 않음";

  const weakestText =
    elements.weakest.length > 0
      ? elements.weakest.join(", ")
      : "확인되지 않음";

  const structure =
    `${strength.level} 구조이며, ` +
    `강한 오행은 ${strongestText}, ` +
    `약한 오행은 ${weakestText}입니다.`;

  return {
    structure,
    strengths: uniqueStrengths,
    weaknesses: uniqueWeaknesses,
    recommendations: uniqueRecommendations,
    summary:
      `${structure} ` +
      `강한 기운은 장점으로 활용하고, ` +
      `약한 기운은 생활 습관과 환경을 통해 보완하는 것이 중요합니다.`,
  };
}