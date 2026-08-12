import type { RecommendationSignalKey } from "./premiumProductRegistry";

export type NormalizedRecommendationSignal = {
  key: RecommendationSignalKey;
  score: number;
  reason: string;
  source: string;
};

export type RecommendationSignalBundle = {
  signals: NormalizedRecommendationSignal[];
};

function pushSignal(
  signals: NormalizedRecommendationSignal[],
  signal: NormalizedRecommendationSignal,
): void {
  if (!signals.some((entry) => entry.key === signal.key)) {
    signals.push(signal);
  }
}

function hasConflictRelation(
  relations: ReadonlyArray<{ type: string }>,
): boolean {
  return relations.some((entry) =>
    entry.type === "충" || entry.type === "형" || entry.type === "파" || entry.type === "해",
  );
}

function hasSupportiveRelation(
  relations: ReadonlyArray<{ type: string }>,
): boolean {
  return relations.some((entry) => entry.type === "합");
}

function hasGrowthRelation(
  relationHighlights: ReadonlyArray<{ type: string; strength: string }>,
): boolean {
  return relationHighlights.some((entry) => entry.type === "생조");
}

export function normalizeRecommendationSignals(input: {
  strengthLevel: string;
  strongestElements: readonly string[];
  weakestElements: readonly string[];
  flowLabel: string | null | undefined;
  relationHighlights: ReadonlyArray<{ type: string; strength: string }>;
  fortuneFlowRelations: ReadonlyArray<{ type: string }>;
}): RecommendationSignalBundle {
  const signals: NormalizedRecommendationSignal[] = [];

  if (input.strengthLevel.includes("신강")) {
    pushSignal(signals, {
      key: "career_stability",
      score: 1.0,
      reason: "신강 수준이 높아 직업·역할 안정에 대한 관심이 강합니다.",
      source: "strengthAnalysis",
    });

    pushSignal(signals, {
      key: "relationship_commitment",
      score: 0.8,
      reason: "신강 기조와 함께 관계 안정성과 장기적 책임을 염두에 둘 수 있습니다.",
      source: "strengthAnalysis",
    });

    pushSignal(signals, {
      key: "growth_learning",
      score: 0.7,
      reason: "강한 기질은 배우고 익히는 흐름과 연결되어 학습적 성장에 대한 반응이 나타납니다.",
      source: "strengthAnalysis",
    });
  }

  if (input.strengthLevel.includes("신약")) {
    pushSignal(signals, {
      key: "health_recovery",
      score: 1.0,
      reason: "신약 흐름이 형성돼 에너지 회복과 생활 리듬 점검이 유효합니다.",
      source: "strengthAnalysis",
    });

    pushSignal(signals, {
      key: "career_independence",
      score: 0.7,
      reason: "신약 흐름은 독립적·자기주도적 방식의 역할 정리와 맞닿아 있습니다.",
      source: "strengthAnalysis",
    });
  }

  if (input.strongestElements.includes("목") || input.strongestElements.includes("화")) {
    pushSignal(signals, {
      key: "wealth_growth",
      score: 0.8,
      reason: "오행 강세가 성장과 확장 쪽으로 이어질 가능성이 있습니다.",
      source: "elementAnalysis",
    });

    pushSignal(signals, {
      key: "business_growth",
      score: 0.75,
      reason: "강한 오행은 사업·성과형 기회와 연결될 확실한 기반이 됩니다.",
      source: "elementAnalysis",
    });
  }

  if (input.weakestElements.includes("금") || input.weakestElements.includes("수")) {
    pushSignal(signals, {
      key: "wealth_risk",
      score: 0.9,
      reason: "약한 오행이 지출·손실·정리 부담으로 연결될 수 있습니다.",
      source: "elementAnalysis",
    });

    pushSignal(signals, {
      key: "wealth_control",
      score: 0.85,
      reason: "약한 오행은 자산과 지출을 조절하고 관리하는 흐름이 더 중요해집니다.",
      source: "elementAnalysis",
    });
  }

  if (input.flowLabel === "기회 우세") {
    pushSignal(signals, {
      key: "career_change",
      score: 1.1,
      reason: "현재 흐름이 기회 우세로 나타나 변화와 확장의 맥락이 큽니다.",
      source: "fortuneFlowAnalysis",
    });

    pushSignal(signals, {
      key: "growth_transition",
      score: 0.9,
      reason: "기회 우세 흐름은 전환·이동·변화의 흐름이 선명하게 드러납니다.",
      source: "fortuneFlowAnalysis",
    });
  }

  if (input.relationHighlights.some((entry) => entry.type === "극함")) {
    pushSignal(signals, {
      key: "health_stress",
      score: 1.0,
      reason: "강한 제어 관계가 있어 스트레스와 부담 관리가 중요합니다.",
      source: "elementRelations",
    });
  }

  if (hasConflictRelation(input.fortuneFlowRelations)) {
    pushSignal(signals, {
      key: "relationship_conflict",
      score: 1.0,
      reason: "충·형·파·해와 같은 갈등 관계가 확인되어 관계 리스크를 살펴볼 필요가 있습니다.",
      source: "fortuneFlowAnalysis",
    });
  }

  if (hasSupportiveRelation(input.fortuneFlowRelations)) {
    pushSignal(signals, {
      key: "relationship_recovery",
      score: 0.8,
      reason: "합으로 연결되는 관계는 회복과 재정립이 가능한 흐름으로 해석됩니다.",
      source: "fortuneFlowAnalysis",
    });
  }

  if (hasGrowthRelation(input.relationHighlights)) {
    pushSignal(signals, {
      key: "relationship_new",
      score: 0.8,
      reason: "생조 관계가 강하면 새로운 인연과 협력 기회가 이어질 수 있습니다.",
      source: "elementRelations",
    });
  }

  if (
    hasConflictRelation(input.fortuneFlowRelations) &&
    (input.weakestElements.includes("금") || input.weakestElements.includes("수"))
  ) {
    pushSignal(signals, {
      key: "business_control",
      score: 0.75,
      reason: "갈등 관계와 약한 오행이 겹쳐 관리·통제 중심의 사업 판단이 중요합니다.",
      source: "fortuneFlowAnalysis",
    });
  }

  return { signals };
}
