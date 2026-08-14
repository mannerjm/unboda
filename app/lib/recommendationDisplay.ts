import { getPremiumProduct } from "./premiumProductRegistry";

const signalLabels: Record<string, string> = {
  career_change: "변화와 이동의 흐름",
  career_stability: "직업과 역할의 안정 흐름",
  career_independence: "독립적 역할과 주도성",
  wealth_growth: "성장과 확장의 흐름",
  wealth_risk: "재정 관리가 필요한 흐름",
  wealth_control: "지출과 자산 관리 기준",
  relationship_new: "새로운 관계와 협력의 흐름",
  relationship_commitment: "관계의 안정과 책임",
  relationship_conflict: "관계 조정이 필요한 흐름",
  relationship_recovery: "관계 회복과 재정립의 흐름",
  social_support: "주변의 도움과 연결",
  health_recovery: "회복과 생활 리듬 점검",
  health_stress: "부담과 스트레스 관리",
  business_growth: "성과와 확장 가능성",
  business_control: "판단과 관리 기준",
  growth_learning: "학습과 역량 강화",
  growth_transition: "전환과 변화의 흐름",
};

const internalTokenPattern = /\b[a-z][a-z0-9_-]*:[A-Za-z][A-Za-z0-9]*\b/g;
const productSlugPattern = /\b[a-z][a-z0-9-]*-[a-z0-9-]+\b/g;

export function getRecommendationProductDisplayName(productId: string): string {
  return getPremiumProduct(productId)?.title ?? "추천 심층 분석";
}

export function formatRecommendationEvidence(value: string): string {
  const labels = value
    .split(/[\s,]+/)
    .map((entry) => entry.split(":")[0] ?? "")
    .map((signal) => signalLabels[signal])
    .filter((label): label is string => Boolean(label));

  const uniqueLabels = [...new Set(labels)];

  return uniqueLabels.length > 0
    ? `${uniqueLabels.join(", ")}을 바탕으로 확인이 필요합니다.`
    : "현재 사주와 운의 흐름을 바탕으로 우선 점검이 필요합니다.";
}

/** Removes internal recommendation identifiers before any user-facing render. */
export function formatRecommendationPresentationText(value: string | undefined): string {
  if (!value) {
    return "현재 사주와 운의 흐름을 바탕으로 우선 점검이 필요합니다.";
  }

  if (internalTokenPattern.test(value)) {
    internalTokenPattern.lastIndex = 0;
    return formatRecommendationEvidence(value);
  }
  internalTokenPattern.lastIndex = 0;

  return value.replace(productSlugPattern, (productId) =>
    getRecommendationProductDisplayName(productId),
  );
}
