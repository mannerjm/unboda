import type { AnalysisRecommendationOutput } from "./analysisRecommendationOutput";

function extractJsonPayload(value: string): string {
  const trimmed = value.trim();

  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return fenced?.[1]?.trim() ?? trimmed;
}

export function parseAnalysisRecommendationOutput(
  value: string
): AnalysisRecommendationOutput {
const parsed: unknown = JSON.parse(extractJsonPayload(value));

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

if (
  !("cardReasons" in parsed) ||
  typeof parsed.cardReasons !== "object" ||
  parsed.cardReasons === null
) {
  throw new Error(
    "Analysis recommendation output cardReasons must be an object"
  );
}

if (
  !("first" in parsed.cardReasons) ||
  typeof parsed.cardReasons.first !== "string"
) {
  throw new Error(
    "Analysis recommendation output cardReasons.first must be a string"
  );
}

if (
  !("second" in parsed.cardReasons) ||
  typeof parsed.cardReasons.second !== "string"
) {
  throw new Error(
    "Analysis recommendation output cardReasons.second must be a string"
  );
}

if (
  !("third" in parsed.cardReasons) ||
  typeof parsed.cardReasons.third !== "string"
) {
  throw new Error(
    "Analysis recommendation output cardReasons.third must be a string"
  );
}
if (
  !("conversionGuidance" in parsed) ||
  typeof parsed.conversionGuidance !== "object" ||
  parsed.conversionGuidance === null
) {
  throw new Error(
    "Analysis recommendation output conversionGuidance must be an object"
  );
}
if (
  !("whyNow" in parsed.conversionGuidance) ||
  typeof parsed.conversionGuidance.whyNow !== "string"
) {
  throw new Error(
    "Analysis recommendation output conversionGuidance.whyNow must be a string"
  );
}
if (
  !("whatYouWillLearn" in parsed.conversionGuidance) ||
  typeof parsed.conversionGuidance.whatYouWillLearn !== "string"
) {
  throw new Error(
    "Analysis recommendation output conversionGuidance.whatYouWillLearn must be a string"
  );
}
if (
  !("riskOfDelay" in parsed.conversionGuidance) ||
  typeof parsed.conversionGuidance.riskOfDelay !== "string"
) {
  throw new Error(
    "Analysis recommendation output conversionGuidance.riskOfDelay must be a string"
  );
}
return parsed as AnalysisRecommendationOutput;
}