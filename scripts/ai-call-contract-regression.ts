import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const openAIClient = read("app/lib/ai/openAIClient.ts");
const generateAnalysisText = read("app/lib/ai/generateAnalysisText.ts");

assert(openAIClient.includes("maxRetries: 0"), "OpenAI client must explicitly disable SDK retries");
assert(!generateAnalysisText.includes("Promise.race"), "generateAnalysisText must not use Promise.race for request timeout");
assert(generateAnalysisText.includes("new AbortController()"), "generateAnalysisText must create an AbortController");
assert(generateAnalysisText.includes("signal: controller.signal"), "the created AbortSignal must be passed through the request options object");
assert(generateAnalysisText.includes("controller.abort()"), "timeout path must abort the in-flight request");
assert(generateAnalysisText.includes("clearTimeout(timeoutId)"), "timeout timer must be cleared in a finally block");
assert(generateAnalysisText.includes("response.status === \"incomplete\""), "incomplete response status must be handled explicitly");
assert(generateAnalysisText.includes("incomplete_details?.reason"), "incomplete reason must be surfaced when handling incomplete responses");
assert(generateAnalysisText.includes("trim()"), "output_text must be trimmed before emptiness check");
assert(generateAnalysisText.includes("if (!outputText)"), "empty output text must fail explicitly");
assert(generateAnalysisText.includes('const model = resolveModel(callType)'), "model must be resolved per callType");
assert(generateAnalysisText.includes('return "gpt-5.6-luna";'), "main-analysis must use gpt-5.6-luna");
assert(!generateAnalysisText.includes('const model = "gpt-5"'), "model must not be hardcoded to gpt-5 for every callType");
assert(generateAnalysisText.includes("return 6000;"), "main-analysis max output tokens must be 6000");
assert(generateAnalysisText.includes("return 4800;"), "paid-analysis-detail max output tokens must remain 4800");
assert(generateAnalysisText.includes("return 3200;"), "default max output tokens must remain 3200");
assert(!generateAnalysisText.includes('callType === "main-analysis" || callType === "paid-analysis-detail"'), "main-analysis and paid-analysis-detail token budgets must be resolved separately");
assert(generateAnalysisText.includes("? 120000"), "main-analysis timeout must remain 120000ms");
assert(generateAnalysisText.includes('effort: "low"'), "reasoning.effort must remain low for this step");

console.log("ai-call-contract-regression passed ✓");
