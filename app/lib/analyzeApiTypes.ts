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
  // Tracks the main-analysis AI call's own success/failure, kept separate from
  // the user-facing `result` fallback string so callers never need to compare
  // against fallback copy to detect a degraded generation.
  generationMeta?: {
    mainAnalysisStatus: "completed" | "failed";
    // Absent/undefined is equivalent to "idle"; only "generating" marks an
    // in-flight retry claim (used as an atomic lock, never as a display value).
    mainAnalysisRetryStatus?: "idle" | "generating";
    // Absent/undefined is equivalent to 0. Counts only claim-won retry
    // attempts (see claimMainAnalysisRetry), never raw button clicks.
    mainAnalysisRetryCount?: number;
  };

  productRecommendations: AnalysisProductRecommendationResult;
  recommendationExplanation: AnalysisRecommendationOutput;
};

export type AnalyzeErrorResponse = {
  error: string;
};

export type AnalyzeApiResponse =
  | AnalyzeSuccessResponse
  | AnalyzeErrorResponse;

// Shared by server claim logic and the client retry UI so the cap only lives
// in one place. Safe for client bundles: this file has no server-only imports.
export const MAX_MAIN_ANALYSIS_RETRY_COUNT = 2;