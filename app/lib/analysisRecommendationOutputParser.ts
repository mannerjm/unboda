import type { AnalysisRecommendationOutput } from "./analysisRecommendationOutput";

export function parseAnalysisRecommendationOutput(
  value: string
): AnalysisRecommendationOutput {
const parsed: unknown = JSON.parse(value);

if (typeof parsed !== "object" || parsed === null) {
  throw new Error("Analysis recommendation output must be an object");
}

if (
  !("headline" in parsed) ||
  typeof parsed.headline !== "string"
) {
  throw new Error(
    "Analysis recommendation output headline must be a string"
  );
}

if (
  !("summary" in parsed) ||
  typeof parsed.summary !== "string"
) {
  throw new Error(
    "Analysis recommendation output summary must be a string"
  );
}

if (
  !("userMeaning" in parsed) ||
  typeof parsed.userMeaning !== "string"
) {
  throw new Error(
    "Analysis recommendation output userMeaning must be a string"
  );
}

return parsed as AnalysisRecommendationOutput;
}