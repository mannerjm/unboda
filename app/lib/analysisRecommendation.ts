import type { PaidAnalysisProductId } from "./paidAnalysisProducts";

export type AnalysisRecommendationReason = {
  id: string;
  label: string;
  explanation: string;
};

export type SecondaryAnalysisRecommendation = {
  productId: PaidAnalysisProductId;
  reason: string;
};

export type AnalysisRecommendation = {
  primaryTheme: string;
  headline: string;
  summary: string;
  userMeaning: string;
  reasons: readonly AnalysisRecommendationReason[];
  recommendedProductId: PaidAnalysisProductId;
  recommendedReason: string;
  secondaryRecommendations: readonly SecondaryAnalysisRecommendation[];
};

export type RecommendationSignal = {
  theme: PaidAnalysisProductId;
  score: number;
  confidence: number;
  reasons: readonly string[];
};

export type RecommendationEngineResult = {
  primary: RecommendationSignal;
  secondary: readonly RecommendationSignal[];
};