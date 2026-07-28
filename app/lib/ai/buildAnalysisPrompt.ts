import { buildSystemPrompt } from "./buildSystemPrompt";

export function buildAnalysisPrompt(
  userPrompt: string
): string {
  return [
    buildSystemPrompt(),
    userPrompt,
  ].join("\n\n");
}