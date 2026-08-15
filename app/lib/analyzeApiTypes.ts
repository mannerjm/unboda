import type { buildSajuResponse } from "./buildSajuResponse";
import type { buildFreeAnalysis } from "./buildFreeAnalysis";
import type { PaidAnalysisProductId } from "./paidAnalysisProducts";
import type { buildPremiumAnalysis } from "./buildPremiumAnalysis";
import type { AnalysisRecommendationOutput } from "./analysisRecommendationOutput";
import type {
  AnalysisProductRecommendationResult,
} from "./analysisProductRecommendations";

export type AnalyzeSajuResponse = ReturnType<typeof buildSajuResponse>;
export type AnalyzeFreeResponse = ReturnType<typeof buildFreeAnalysis>;
export type AnalyzePremiumResponse =
  ReturnType<typeof buildPremiumAnalysis>;

export type AnalyzeProfileMetadata = {
  id: string;
  // Display-only; never participates in Profile identity/fingerprint matching.
  label?: string;
  birthDate: string;
  birthTime: string;
  gender: "남성" | "여성";
  calendarType: "양력" | "음력";
  isLeapMonth: boolean;
};

export type AnalyzeRequest = {
  birthDate?: string;
  birthTime?: string;
  calendarType?: "양력" | "음력";
  isLeapMonth?: "평달" | "윤달";
  gender?: "남성" | "여성";
  profileId?: string;
  productId?: PaidAnalysisProductId;
};

export type AnalyzeSuccessResponse = {
  result: string;
  saju: AnalyzeSajuResponse;
  profile: AnalyzeProfileMetadata;
  freeAnalysis?: AnalyzeFreeResponse;
  premiumAnalysis?: AnalyzePremiumResponse;

  productRecommendations: AnalysisProductRecommendationResult;
  recommendationExplanation: AnalysisRecommendationOutput;
};

export type AnalyzeErrorResponse = {
  error: string;
};

export type AnalyzeApiResponse =
  | AnalyzeSuccessResponse
  | AnalyzeErrorResponse;