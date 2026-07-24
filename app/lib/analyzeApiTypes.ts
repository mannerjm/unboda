import type { buildSajuResponse } from "./buildSajuResponse";
import type { buildFreeAnalysis } from "./buildFreeAnalysis";

export type AnalyzeSajuResponse = ReturnType<typeof buildSajuResponse>;
export type AnalyzeFreeResponse = ReturnType<typeof buildFreeAnalysis>;

export type AnalyzeSuccessResponse = {
  result: string;
  saju: AnalyzeSajuResponse;
  freeAnalysis?: AnalyzeFreeResponse;
};

export type AnalyzeErrorResponse = {
  error: string;
};

export type AnalyzeApiResponse =
  | AnalyzeSuccessResponse
  | AnalyzeErrorResponse;