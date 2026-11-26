import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { splitMemberOverview } from "../app/lib/freeAnalysisAIInterpretation";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const result = read("app/result/page.tsx");
const prompt = read("app/lib/mainAnalysisPrompt.ts");
const ai = read("app/lib/ai/generateAnalysisText.ts");

assert(prompt.includes("약 260~360자 내외") && prompt.includes("400자를 넘기지 마세요"), "free AI output must stay short enough for the fast-result experience");
assert(prompt.includes("정확히 2문장") && prompt.includes("정확히 3문장"), "free AI sections must have predictable compact sentence counts");
assert(prompt.includes("해결책을 절대 제시하지 마세요") && prompt.includes("불안을 과장하거나 결제 압박 문구를 쓰지 마세요"), "shortening must not turn free AI into pressure or unsupported advice");
assert(ai.includes('callType === "main-analysis"') && ai.includes("return 700;"), "main-analysis output token cap must remain 700");
assert(ai.includes('return callType === "main-analysis" ? "none" : "low";'), "free main-analysis must run without reasoning overhead");
assert(ai.includes('return "gpt-5.6-luna";'), "free AI must keep the fast Luna model");

for (const marker of [
  "운보다 AI 종합 해석",
  "핵심만 빠르게",
  "지금 결과의 핵심",
  "나를 설명하는 핵심",
  "왜 이렇게 보이는지",
  "여기서부터 질문이 갈립니다.",
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

// Keep first anonymous result presentation and conversion path intact.
assert(result.includes("const memberResult = !providedResult"));
assert(result.includes("data-member-summary") && result.includes("data-member-recommendation"));
assert(result.includes('memberResult ? "운보다 종합 해석" : "운보다 AI 종합 해석"'));
assert(result.includes("나의 타고난 사주와 이번 달 운의 흐름") && result.includes("나의 추천 분석 보기") && result.includes("홈으로 돌아가기"));
assert(result.includes('setStoredResultStale(body.freshness === "STALE")') && result.includes("조회 당시 운세"));
assert(result.includes('href={providedResult ? "/recommendations" : `/recommendations?profileId=${currentProfileId}`}'));
assert(read("app/guest-result/page.tsx").includes("<ResultViewerContext.Provider"));
assert.deepEqual(splitMemberOverview("첫 문장입니다. 둘째 문장입니다. 셋째 문장입니다."), {lead:"첫 문장입니다.", situation:"둘째 문장입니다.", focus:"셋째 문장입니다."});
assert.deepEqual(splitMemberOverview("끊기지 않는 하나의 문장"), {lead:"끊기지 않는 하나의 문장", situation:"", focus:""});
assert.equal(splitMemberOverview("첫 문장. 두 번째 문장. 세 번째 문장. 마지막 문장.").situation,"두 번째 문장. 세 번째 문장.");
