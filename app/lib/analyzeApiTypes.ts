import type { buildSajuResponse } from "./buildSajuResponse";

export type AnalyzeSajuResponse = ReturnType<typeof buildSajuResponse>;

export type AnalyzeSuccessResponse = {
  result: string;
  saju: AnalyzeSajuResponse;
};

export type AnalyzeErrorResponse = {
  error: string;
};

export type AnalyzeApiResponse =
  | AnalyzeSuccessResponse
  | AnalyzeErrorResponse;