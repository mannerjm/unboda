import { AI_CORE_RULES } from "./coreRules";
import { SAJU_RULES } from "./sajuRules";
import { RECOMMENDATION_RULES } from "./recommendationRules";

export function buildSystemPrompt(): string {
  return [
    AI_CORE_RULES,
    SAJU_RULES,
    RECOMMENDATION_RULES,
  ].join("\n\n");
}