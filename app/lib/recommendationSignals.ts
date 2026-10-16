import type { RecommendationSignalKey } from "./premiumProductRegistry";
import type { Element } from "./elements";

export type NormalizedRecommendationSignal = {
  key: RecommendationSignalKey;
  score: number;
  reason: string;
  source: string;
};

export type RecommendationSignalBundle = {
  signals: NormalizedRecommendationSignal[];
};

/** Mid-month pillar uses the existing solar-term calendar, not the birth month. */
export type MonthlyRecommendationCycle = {
  year: number;
  month: number;
  representativePillar: string;
  stemElement: string;
  branchElement: string;
  relations: ReadonlyArray<{
    target: "year" | "month" | "day" | "hour";
    type: "합" | "충" | "형" | "파" | "해";
  }>;
};

const round = (value: number) => Number(value.toFixed(3));
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

const hasConflict = (type: string) => ["충", "형", "파", "해"].includes(type);

export function normalizeRecommendationSignals(input: {
  strengthLevel: string;
  strengthSupportScore?: number;
  dayElement?: Element | "";
  resourceElement?: Element | "";
  elementPercentages?: Record<Element, number>;
  strongestElements: readonly string[];
  weakestElements: readonly string[];
  flowLabel: string | null | undefined;
  relationHighlights: ReadonlyArray<{ type: string; strength: string }>;
  fortuneFlowRelations: ReadonlyArray<{ type: string }>;
  monthlyCycle?: MonthlyRecommendationCycle;
}): RecommendationSignalBundle {
  const signals: NormalizedRecommendationSignal[] = [];
  const support = input.strengthSupportScore ?? 50;
  const distribution = input.elementPercentages;
  const month = input.monthlyCycle;
  const monthTag = month ? `${month.year}년 ${month.month}월 중순 기준` : "현재";
  const annualConflictCount = input.fortuneFlowRelations.filter((r) => hasConflict(r.type)).length;
  const annualHarmonyCount = input.fortuneFlowRelations.filter((r) => r.type === "합").length;
  const monthlyConflictCount = month?.relations.filter((r) => hasConflict(r.type)).length ?? 0;
  const monthlyHarmonyCount = month?.relations.filter((r) => r.type === "합").length ?? 0;
  const monthElements = [month?.stemElement, month?.branchElement].filter(Boolean);
  const monthSupportsSelf = Boolean(input.dayElement && monthElements.includes(input.dayElement))
    || Boolean(input.resourceElement && monthElements.includes(input.resourceElement));
  const monthAmplifiesWeaker = Boolean(distribution && monthElements.some((e) =>
    Number(distribution[e as Element] ?? 100) < 15
  ));

  const add = (key: RecommendationSignalKey, score: number, reason: string, source: string) => {
    if (!signals.some((s) => s.key === key) && score > 0) {
      signals.push({ key, score: round(score), reason, source });
    }
  };

  if (input.strengthLevel.includes("신강")) {
    const intensity = clamp((support - 50) / 35, 0.2, 1.4);
    add("career_stability", 0.65 + intensity * 0.35,
      `사주에서 스스로 감당하는 힘의 비중이 ${support}%로 계산돼 역할과 진로의 안정성을 살펴봅니다.`, "strengthAnalysis");
    add("relationship_commitment", 0.55 + intensity * 0.24,
      "본래 사주의 버티는 힘을 바탕으로 오래 이어갈 관계와 책임을 함께 점검합니다.", "strengthAnalysis");
    add("growth_learning", 0.53 + intensity * 0.2,
      "사주의 실행력을 바탕으로 지금 쌓아갈 역량과 학습 방향을 살펴봅니다.", "strengthAnalysis");
  }
  if (input.strengthLevel.includes("신약")) {
    const intensity = clamp((50 - support) / 30, 0.2, 1.4);
    add("health_recovery", 0.68 + intensity * 0.38 + (monthSupportsSelf ? 0.12 : 0),
      `사주에서 스스로 감당하는 힘의 비중이 ${support}%로 나타나 회복과 생활 균형을 점검합니다.`, "strengthAnalysis");
    add("career_independence", 0.58 + intensity * 0.23,
      "기존 역할의 부담을 줄이고 자신에게 맞는 일의 방식을 살펴봅니다.", "strengthAnalysis");
  }
  if (input.strongestElements.includes("목") || input.strongestElements.includes("화")) {
    const high = Math.max(distribution?.목 ?? 0, distribution?.화 ?? 0);
    const intensity = clamp((high - 20) / 40, 0, 1);
    add("wealth_growth", 0.64 + intensity * 0.3,
      `사주의 목·화 기운 비중(최대 ${high || "강세"}%)을 바탕으로 성장 기회를 검토합니다.`, "elementAnalysis");
    add("business_growth", 0.61 + intensity * 0.33,
      "강하게 나타나는 확장 성향을 사업과 성과 방향에서도 살펴봅니다.", "elementAnalysis");
  }
  if (input.weakestElements.includes("금") || input.weakestElements.includes("수")) {
    const low = Math.min(distribution?.금 ?? 20, distribution?.수 ?? 20);
    const intensity = clamp((21 - low) / 21, 0, 1);
    add("wealth_risk", 0.72 + intensity * 0.28 + (monthAmplifiesWeaker ? 0.12 : 0),
      `사주에서 금·수 기운의 균형(낮은 비중 ${low}%)을 근거로 자산 관리와 지출 점검을 제안합니다.`, "elementAnalysis");
    add("wealth_control", 0.7 + intensity * 0.22,
      "타고난 오행의 불균형을 바탕으로 지출과 재정적 판단 기준을 살펴봅니다.", "elementAnalysis");
  }
  if (input.flowLabel === "기회 우세") {
    add("career_change", 0.94 + (monthSupportsSelf ? 0.16 : 0),
      `${monthTag} 연·대운 흐름에서 변화의 기회가 상대적으로 두드러져 진로 선택을 점검합니다.`, "fortuneFlowAnalysis");
    add("growth_transition", 0.79 + (monthSupportsSelf ? 0.12 : 0),
      "연·대운의 기회 흐름을 바탕으로 지금 조정할 일과 중장기 방향을 확인합니다.", "fortuneFlowAnalysis");
  }
  if (input.relationHighlights.some((r) => r.type === "극함")) {
    add("health_stress", 0.72 + clamp(input.relationHighlights.filter((r) => r.type === "극함").length * 0.09, 0, 0.36)
      + monthlyConflictCount * 0.05,
      "오행 간 제어 관계와 현재 관계 흐름을 함께 고려해 부담과 생활 리듬을 점검합니다.", "elementRelations");
  }
  if (annualConflictCount || monthlyConflictCount) {
    add("relationship_conflict", 0.68 + clamp(annualConflictCount * 0.105, 0, 0.48)
      + clamp(monthlyConflictCount * 0.18, 0, 0.48),
      `연·대운 갈등 신호 ${annualConflictCount}건과 ${monthTag} 갈등 관계 ${monthlyConflictCount}건을 반영해 의사소통 문제를 살펴봅니다.`, monthlyConflictCount ? "monthlyCycle" : "fortuneFlowAnalysis");
  }
  if (annualHarmonyCount || monthlyHarmonyCount) {
    add("relationship_recovery", 0.57 + clamp(annualHarmonyCount * 0.12, 0, 0.48)
      + clamp(monthlyHarmonyCount * 0.17, 0, 0.51),
      `연·대운의 협력 관계 ${annualHarmonyCount}건과 ${monthTag} 조화 관계 ${monthlyHarmonyCount}건을 반영합니다.`, monthlyHarmonyCount ? "monthlyCycle" : "fortuneFlowAnalysis");
    add("social_support", 0.50 + clamp(monthlyHarmonyCount * 0.15 + annualHarmonyCount * 0.08, 0, 0.5),
      "협력과 지지의 관계가 확인되어 주변 사람과의 연결도 살펴봅니다.", "fortuneFlowAnalysis");
  }
  if (input.relationHighlights.some((r) => r.type === "생조")) {
    const intensity = input.relationHighlights.filter((r) => r.type === "생조").length;
    add("relationship_new", 0.61 + clamp(intensity * 0.075 + monthlyHarmonyCount * 0.06, 0, 0.4),
      "오행의 상생 구조를 바탕으로 새로운 인연과 협력의 가능성을 점검합니다.", "elementRelations");
  }
  if ((annualConflictCount || monthlyConflictCount)
      && (input.weakestElements.includes("금") || input.weakestElements.includes("수"))) {
    add("business_control", 0.57 + clamp(annualConflictCount * 0.045 + monthlyConflictCount * 0.1, 0, 0.4),
      "사주의 오행 불균형과 시기별 갈등 흐름을 함께 고려해 사업 위험 관리를 살펴봅니다.", "fortuneFlowAnalysis");
  }
  return { signals };
}
