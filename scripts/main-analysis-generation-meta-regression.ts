import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

// freeAnalysisPipeline/server.ts is "server-only" and cannot be imported outside
// Next's build, so this regression verifies the wiring statically (matching the
// existing pattern used by other regressions that inspect this file's source).
const pipeline = read("app/lib/freeAnalysisPipeline/server.ts");
const analyzeTypes = read("app/lib/analyzeApiTypes.ts");
const analysisAIService = read("app/lib/analysisAIService.ts");

assert(analysisAIService.includes("export type MainAnalysisGenerationResult") && analysisAIService.includes('status: "completed" | "failed"'), "generateMainAnalysis must expose a typed { text, status } result");
assert(analysisAIService.includes("if (!text) throw new Error("), "an empty/falsy AI text must be treated as a failure inside generateMainAnalysis, not passed through as completed");
assert(analysisAIService.includes('return { text, status: "completed" };'), "a successful generation must report status completed only when a real, non-empty text was produced");
assert(analysisAIService.includes('return { text: "AI 분석 결과를 생성하지 못했습니다.", status: "failed" };'), "a failed generation (including empty text) must keep the existing fallback copy and report status failed");

// The fallback literal must never appear alongside a completed-status return: the
// only place it can occur is the single catch-path return, keeping text/status consistent.
const fallbackLiteralOccurrences = analysisAIService.match(/AI 분석 결과를 생성하지 못했습니다\./g) ?? [];
assert(fallbackLiteralOccurrences.length === 1, `the fallback copy must appear exactly once (the failed-status return), got ${fallbackLiteralOccurrences.length}`);

assert(analyzeTypes.includes("generationMeta?:") && analyzeTypes.includes('mainAnalysisStatus: "completed" | "failed";'), "AnalyzeSuccessResponse must expose optional generationMeta.mainAnalysisStatus");

assert(pipeline.includes("const [mainAnalysis, recommendationExplanation] = await Promise.all([") && pipeline.includes("generateMainAnalysis(buildMainAnalysisPrompt({ compactFacts })),") && pipeline.includes("generateRecommendationExplanation(recommendation),"), "the parallel Promise.all structure for main-analysis and recommendation-analysis must be unchanged");
assert(pipeline.includes("result: mainAnalysis.text,") && pipeline.includes("mainAnalysisStatus: mainAnalysis.status,"), "the response must pass through the typed main-analysis text/status as-is");
assert(!pipeline.includes("mainAnalysis.text ||"), "buildFreeAnalysisResponse must not re-guard against empty text now that generateMainAnalysis already guarantees the text/status invariant");
assert(pipeline.includes("freeAnalysis,") && pipeline.includes("productRecommendations,") && pipeline.includes("recommendationExplanation,") && pipeline.includes("saju: buildSajuResponse(saju),") && pipeline.includes("profile: input.profile,"), "the rest of the response fields must remain intact regardless of the AI outcome");

console.log("main-analysis-generation-meta-regression passed ✓");
