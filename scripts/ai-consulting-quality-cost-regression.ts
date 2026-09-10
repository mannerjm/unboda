import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const quality = read("app/lib/aiConsulting/qualityCost.ts");
const page = read("app/admin/ai-consulting/page.tsx");
const answerPipeline = read("app/lib/aiConsulting/answerPipeline.ts");
const modelResolver = read("app/lib/ai/generateAnalysisText.ts");

for (const heading of [
  "확인된 사용자 사실",
  "운보다 명리 해석",
  "AI 상담 해석",
  "지금 확인할 점",
]) {
  assert.ok(quality.includes(heading), `quality report must check answer heading: ${heading}`);
}

assert.ok(
  answerPipeline.includes('resolveModel("ai-consulting")'),
  "AI consulting must resolve through its dedicated model boundary",
);
assert.ok(
  modelResolver.includes('callType === "ai-consulting"')
    && modelResolver.includes('return "gpt-5.6-terra";'),
  "AI consulting must use gpt-5.6-terra",
);
assert.ok(
  modelResolver.includes('callType === "paid-analysis-detail" || callType === "paid-analysis-detail-v4"')
    && modelResolver.includes('return "gpt-5.6-sol";'),
  "paid analysis must use gpt-5.6-sol",
);
assert.ok(
  quality.includes('"gpt-5": { inputUsdPerMillion: 1.25, outputUsdPerMillion: 10 }'),
  "legacy GPT-5 API rate must remain explicit for historical telemetry",
);
assert.ok(
  quality.includes('"gpt-5.6-luna": { inputUsdPerMillion: 0.2, outputUsdPerMillion: 1.2 }')
    && quality.includes('"gpt-5.6-terra": { inputUsdPerMillion: 2, outputUsdPerMillion: 12 }')
    && quality.includes('"gpt-5.6-sol": { inputUsdPerMillion: 4, outputUsdPerMillion: 20 }'),
  "current GPT-5.6 pricing references must remain explicit",
);
assert.ok(
  quality.includes('checkedAt: "2026-09-09"'),
  "pricing snapshot must carry an explicit review date",
);
assert.ok(
  quality.includes("uncached upper-bound estimate"),
  "cost estimate must disclose that cached-input detail is unavailable",
);

for (const forbidden of [".insert(", ".update(", ".delete(", ".rpc("]) {
  assert.ok(!quality.includes(forbidden), `Phase 12A quality helper must remain read-only: ${forbidden}`);
}
assert.ok(
  quality.includes('.eq("role", "assistant")')
    && quality.includes('.eq("role", "user")')
    && quality.includes("reply_to_message_id"),
  "quality report must inspect persisted completed answers and their source questions",
);
assert.ok(
  quality.includes("Math.min(200, Math.max(1"),
  "operator sampling must stay bounded",
);

assert.ok(page.includes("requireOperator"), "AI quality dashboard must require operator authorization");
assert.ok(
  page.includes("자동 검사는 답변 형식·길이·토큰 기록만 확인")
    && page.includes("별도 수동 검토가 필요합니다"),
  "dashboard must not present structural checks as semantic quality proof",
);
assert.ok(
  page.includes("캐시 할인 미반영 상한 추정")
    && page.includes("가격 기준일"),
  "dashboard must disclose cost-estimate limitations and pricing date",
);
assert.ok(
  !page.includes("getOpenAIClient") && !page.includes("responses.create"),
  "opening the operator dashboard must never call OpenAI",
);

console.log("AI consulting quality/cost regression passed");
