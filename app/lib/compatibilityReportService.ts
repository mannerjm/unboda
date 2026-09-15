import { generateAnalysisText } from "./ai";
import {
  buildCompatibilityReportContext,
  buildCompatibilityReportPrompt,
  validateCompatibilityReportOutput,
  type CompatibilityReportContext,
  type CompatibilityReportOutput,
} from "./compatibilityReportContract";
import type { CompatibilityTimingResult } from "./compatibilityTiming";

export type GeneratedCompatibilityReport = {
  report: CompatibilityReportOutput;
  context: CompatibilityReportContext;
};

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/iu, "")
    .replace(/\s*```$/u, "")
    .trim();
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");

  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new Error("궁합 리포트 응답에서 JSON을 찾지 못했습니다.");
  }

  return JSON.parse(withoutFence.slice(firstBrace, lastBrace + 1)) as unknown;
}

export async function generateCompatibilityReport(
  timingResult: CompatibilityTimingResult,
): Promise<GeneratedCompatibilityReport> {
  const context = buildCompatibilityReportContext(timingResult);
  const prompt = buildCompatibilityReportPrompt(context);
  const outputText = await generateAnalysisText(
    `[SYSTEM]\n${prompt.system}\n\n[USER]\n${prompt.user}`,
    { callType: "recommendation-analysis" },
  );
  const parsed = extractJsonObject(outputText);
  const report = validateCompatibilityReportOutput(parsed, context);

  return { report, context };
}
