import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const result = read("app/result/page.tsx");
const prompt = read("app/lib/mainAnalysisPrompt.ts");
const ai = read("app/lib/ai/generateAnalysisText.ts");

assert(prompt.includes("약 260~360자 내외") && prompt.includes("400자를 넘기지 마세요"), "free AI output must stay short enough for the fast-result experience");
assert(prompt.includes("정확히 2문장") && prompt.includes("정확히 3문장"), "free AI sections must have predictable compact sentence counts");
assert(prompt.includes("해결책을 절대 제시하지 마세요") && prompt.includes("불안을 과장하거나 결제 압박 문구를 쓰지 마세요"), "shortening must not turn free AI into pressure or unsupported advice");
assert(ai.includes('callType === "main-analysis"') && ai.includes("return 900;"), "main-analysis output token cap must remain 900");
assert(ai.includes('return "gpt-5.6-luna";'), "free AI must keep the fast Luna model");

for (const marker of [
  "운보다 AI 종합 해석",
  "핵심만 빠르게",
  "지금 가장 먼저 보이는 흐름",
  "나를 설명하는 핵심",
  "지금 가장 걸리는 흐름",
  "여기까지는 ‘무슨 흐름인지’까지예요.",
  "현재 결과를 바탕으로 추천 분석으로 이어집니다.",
]) {
  assert(result.includes(marker), `free AI conversion presentation missing: ${marker}`);
}

assert(result.includes("splitAIOverviewHighlight") && result.includes("aiOverviewHighlight.lead"), "overview first sentence must become the visual lead without another AI call");
assert(result.includes("text-[22px]") && result.includes("sm:text-[28px]"), "AI lead must be materially larger than the old small body copy");
assert(result.includes("sm:text-[17px]"), "supporting AI interpretation must remain readable");
assert(result.includes("legacyAISummarySections"), "stored legacy AI results must remain display-compatible");
assert(result.includes("내 결과에서 이어지는 질문 보기") && result.includes("/recommendations?profileId=${currentProfileId}"), "existing recommendation route must remain unchanged");
assert(!result.includes("buildAnalysisProductRecommendations"), "result page must not add a new recommendation computation or AI call");

console.log("free AI result conversion regression passed");
