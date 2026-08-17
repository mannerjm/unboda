export type PaidAnalysisCompressionPolicy = {
  /** null keeps the generated description at full length. */
  timelineDescriptionMaxLength: number | null;
  actionGuideMaxLength: number;
  actionGuideMaxItems: number;
  checklistMaxLength: number;
  checklistMaxItems: number;
  avoidGuideMaxLength: number;
  avoidGuideMaxItems: number;
  actionFallbacks: readonly string[];
};

const CAREER_ACTION_FALLBACKS = [
  "핵심 결정을 앞두고 우선순위를 한 줄로 정리한다.",
  "현재 흘름에서 가장 먼저 조정할 부분을 구체적으로 정리한다.",
  "결정 이후 부담과 이익을 함께 비교해본다.",
] as const;

// 관계 상품에 커리어 문구가 주입되면 관계 품질 게이트의 actionGuide 검사가 무조건 실패한다.
const RELATIONSHIP_ACTION_FALLBACKS = [
  "갈등이 생겼을 때 감정을 해석하기 전에 상대에게 사실을 먼저 확인한다.",
  "연락과 약속의 일관성이 달라지는 시점을 기록해 관계 흘름을 확인한다.",
  "서로의 경계와 기대 수준을 대화로 확인한 뒤 다음 단계를 판단한다.",
] as const;

export const DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY: PaidAnalysisCompressionPolicy = {
  timelineDescriptionMaxLength: 92,
  actionGuideMaxLength: 108,
  actionGuideMaxItems: 3,
  checklistMaxLength: 112,
  checklistMaxItems: 5,
  avoidGuideMaxLength: 112,
  avoidGuideMaxItems: 4,
  actionFallbacks: CAREER_ACTION_FALLBACKS,
};

export const RELATIONSHIP_PAID_ANALYSIS_COMPRESSION_POLICY: PaidAnalysisCompressionPolicy = {
  ...DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY,
  actionFallbacks: RELATIONSHIP_ACTION_FALLBACKS,
};

/** Period reports keep full timeline prose and never borrow topic-style actions. */
export const PERIOD_PAID_ANALYSIS_COMPRESSION_POLICY: PaidAnalysisCompressionPolicy = {
  ...DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY,
  timelineDescriptionMaxLength: null,
  actionFallbacks: [],
};

export function getPaidAnalysisCompressionPolicy(
  plugin?: string,
  kind?: string,
): PaidAnalysisCompressionPolicy {
  if (kind === "PERIOD") {
    return PERIOD_PAID_ANALYSIS_COMPRESSION_POLICY;
  }

  if (plugin === "RELATIONSHIP") {
    return RELATIONSHIP_PAID_ANALYSIS_COMPRESSION_POLICY;
  }

  return DEFAULT_PAID_ANALYSIS_COMPRESSION_POLICY;
}
