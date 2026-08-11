export type AnalysisRecommendationReason = {
  id: string;
  label: string;
  explanation: string;
};

export type RecommendationEvidenceItem = {
  signal: string;
  source: string;
  contribution: number;
};

export type SecondaryAnalysisRecommendation = {
  productId: string;
  reason: string;
};

export type RecommendationProductContext = {
  productId: string;
  title?: string;
  category?: string;
  plugin?: string;
  analysisFocus?: readonly string[];
  expectedOutcome?: readonly string[];
  score?: number;
  evidence?: readonly RecommendationEvidenceItem[];
};

export type AnalysisRecommendation = {
  primaryTheme: string;
  headline: string;
  summary: string;
  userMeaning: string;
  reasons: readonly AnalysisRecommendationReason[];
  recommendedProductId: string;
  recommendedReason: string;
  secondaryRecommendations: readonly SecondaryAnalysisRecommendation[];
  recommendationContext?: readonly RecommendationProductContext[];
};

export type RecommendationSignal = {
  theme: string;
  score: number;
  confidence: number;
  reasons: readonly string[];
};

export type RecommendationEngineResult = {
  primary: RecommendationSignal;
  secondary: readonly RecommendationSignal[];
};