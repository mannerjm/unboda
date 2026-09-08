import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(process.cwd(), "app/lib/aiConsulting/answerPipeline.ts"),
  "utf-8",
);

assert(source.includes("evaluateAiConsultingScope"), "scope classifier must run in answer pipeline");
assert(source.includes('if (scope.decision !== "ALLOW")'), "non-ALLOW path must bypass model call");
assert(source.includes("reserveAiConsultingQuestion"), "ALLOW path must reserve before model call");
assert(source.includes("completeAiConsultingAnswer"), "successful answer must finalize atomically");
assert(source.includes("releaseAiConsultingQuestionReservation"), "failed answer must release reservation");
assert(source.includes("getAiConsultingContextMemories"), "bounded long-term memories must be loaded");
assert(source.includes("AI_CONSULTING_CONTEXT_LIMITS.recentMessages"), "recent message context must be bounded");
assert(source.includes("AI_CONSULTING_CONTEXT_LIMITS.longTermMemories"), "long-term memory context must be bounded");
assert(source.includes("getPaidReport"), "purchased report must ground the answer");
assert(source.includes('paidReport.status !== "completed"'), "only completed paid reports may ground answers");
assert(source.includes("USER_STATED"), "prompt must distinguish user-stated facts");
assert(source.includes("ANALYSIS_DERIVED"), "prompt must distinguish analysis-derived interpretation");
assert(source.includes("SYSTEM_SUMMARY"), "prompt must distinguish system summaries");
assert(source.includes("확인된 사용자 사실"), "answer format must label user facts");
assert(source.includes("운보다 명리 해석"), "answer format must label fortune interpretation");
assert(source.includes("AI 상담 해석"), "answer format must label AI interpretation");
assert(source.includes("현재 구매 분석만으로는 근거가 부족하다"), "prompt must fail closed on missing evidence");
assert(source.includes("AI_CONSULTING_ANSWER_LENGTH_OUT_OF_RANGE"), "invalid output length must not be charged");
assert(source.includes("AI_CONSULTING_ANSWER_FORMAT_INVALID"), "invalid output format must not be charged");
assert(!source.includes("saveAiConsultingMemory("), "Phase 8 must not auto-promote model output into long-term memory");
assert(!source.includes("from(\"purchases\").insert"), "answer pipeline must not create purchases");
assert(!source.includes("from(\"entitlements\").insert"), "answer pipeline must not create entitlements");

console.log("AI consulting answer pipeline regression passed");
