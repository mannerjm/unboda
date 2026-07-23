import type { Element } from "./elements";
import { analyzeFortuneFlow } from "./fortuneFlow";
import { analyzeFortuneElementFlow } from "./fortuneElementFlow";
import { analyzeFortuneYongshinFlow } from "./fortuneYongshinFlow";

export interface FortuneFlowAnalysisInput {
  originalPillars: string[];
  daeunGanji: string;
  seunGanji: string;

  originalElements: Record<Element, number>;
  addedElements: Element[];

  primaryYongshin: Element;
  secondaryYongshin: Element[];
}

export function analyzeFullFortuneFlow(
  input: FortuneFlowAnalysisInput
) {
  const relationAnalysis = analyzeFortuneFlow({
    originalPillars: input.originalPillars,
    daeunGanji: input.daeunGanji,
    seunGanji: input.seunGanji,
  });

  const elementFlow = analyzeFortuneElementFlow(
    input.originalElements,
    input.addedElements
  );

  const yongshinFlow = analyzeFortuneYongshinFlow(
    input.primaryYongshin,
    input.secondaryYongshin,
    input.addedElements
  );

const opportunityScore =
  relationAnalysis.relations.filter(
    (relation) => relation.type === "합"
  ).length +
  (yongshinFlow.level === "강함" ? 2 : yongshinFlow.level === "보통" ? 1 : 0);

const cautionScore =
  relationAnalysis.relations.filter(
    (relation) =>
      relation.type === "충" ||
      relation.type === "형" ||
      relation.type === "파" ||
      relation.type === "해"
  ).length;

const currentFlow =
  opportunityScore > cautionScore
    ? "기회 우세"
    : cautionScore > opportunityScore
      ? "주의 우세"
      : "균형";

const daeunRelations = relationAnalysis.relations.filter(
  (relation) => relation.target === "대운"
);

const seunRelations = relationAnalysis.relations.filter(
  (relation) => relation.target === "세운"
);

const daeunCautionScore = daeunRelations.filter(
  (relation) =>
    relation.type === "충" ||
    relation.type === "형" ||
    relation.type === "파" ||
    relation.type === "해"
).length;

const seunCautionScore = seunRelations.filter(
  (relation) =>
    relation.type === "충" ||
    relation.type === "형" ||
    relation.type === "파" ||
    relation.type === "해"
).length;

const daeunFlow =
  daeunRelations.some((relation) => relation.type === "합") &&
  daeunCautionScore === 0
    ? "우호적"
    : daeunCautionScore > 0
      ? "변동성 있음"
      : "중립";

const seunFlow =
  seunRelations.some((relation) => relation.type === "합") &&
  seunCautionScore === 0
    ? "우호적"
    : seunCautionScore > 0
      ? "변동성 있음"
      : "중립";

const opportunities = relationAnalysis.relations
  .filter((relation) => relation.type === "합")
  .map(
    (relation) =>
      `${relation.source} ${relation.sourceGanji}의 ${relation.category} ${relation.sourceChar}와 ${relation.target} ${relation.targetGanji}의 ${relation.category} ${relation.targetChar}의 ${relation.type}`
  );

const cautions = relationAnalysis.relations
  .filter(
    (relation) =>
      relation.type === "충" ||
      relation.type === "형" ||
      relation.type === "파" ||
      relation.type === "해"
  )
  .map(
    (relation) =>
     `${relation.source} ${relation.sourceGanji}의 ${relation.category} ${relation.sourceChar}와 ${relation.target} ${relation.targetGanji}의 ${relation.category} ${relation.targetChar}의 ${relation.type}`
  );

const summaryParts: string[] = [];

summaryParts.push(
  `현재 대운은 ${daeunFlow}, 현재 세운은 ${seunFlow} 흐름입니다.`
);

if (opportunities.length > 0) {
  summaryParts.push(
    `기회 요인은 ${opportunities.join(", ")}입니다.`
  );
}

if (cautions.length > 0) {
  summaryParts.push(
    `주의 요인은 ${cautions.join(", ")}입니다.`
  );
}

summaryParts.push(
  `용신 활성도는 ${yongshinFlow.level}이며, 전체 흐름은 ${currentFlow}입니다.`
);

const summary = summaryParts.join(" ");

const topicGuides = {
  career:
    currentFlow === "기회 우세"
      ? "직업에서는 확장, 이동, 역할 확대 가능성을 우선적으로 살펴볼 시기"
      : currentFlow === "주의 우세"
        ? "직업에서는 무리한 변화보다 리스크 관리와 기존 기반 점검이 필요한 시기"
        : "직업에서는 큰 방향 전환보다 균형 있게 기회를 선택할 시기",

  wealth:
    yongshinFlow.level === "강함"
      ? "재물에서는 유리한 기운을 활용할 수 있으나 과도한 확장은 피하고 실질 수익성을 점검할 시기"
      : "재물에서는 공격적 투자보다 현금흐름과 지출 관리가 중요한 시기",

  relationship:
    seunFlow === "우호적"
      ? "관계에서는 협력과 연결이 비교적 자연스럽게 형성될 수 있는 시기"
      : seunFlow === "변동성 있음"
        ? "관계에서는 오해와 충돌 가능성을 고려해 의사소통을 분명히 할 필요가 있는 시기"
        : "관계에서는 급격한 변화보다 현재 관계를 안정적으로 다듬을 시기",

  health:
    cautionScore > opportunityScore
      ? "건강에서는 과로와 스트레스 누적을 경계하고 생활 리듬을 안정적으로 관리할 시기"
      : "건강에서는 활동성을 살리되 무리하지 않고 회복 리듬을 함께 챙길 시기",
};


 return {
  relations: relationAnalysis.relations,
  elementFlow,
  yongshinFlow,
  currentFlow,
  opportunityScore,
  cautionScore,
  daeunFlow,
seunFlow,
opportunities,
cautions,
summary,
topicGuides,
};
}