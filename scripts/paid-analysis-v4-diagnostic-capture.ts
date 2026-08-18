import { readFileSync } from "node:fs";
import path from "node:path";
import { getOpenAIClient } from "../app/lib/ai/openAIClient";
import { resolveMaxOutputTokens } from "../app/lib/ai/generateAnalysisText";
import { buildPaidAnalysisInputFromProfile } from "../app/lib/paidAnalysisProfileInput";
import {
  createPaidAnalysisV4DiagnosticArtifactStore,
  runPaidAnalysisV4DiagnosticCapture,
} from "../app/lib/paidAnalysisV4DiagnosticCapture";

const PROFILE_FIXTURE = {
  id: "00000000-0000-0000-0000-000000000000",
  label: "테스트",
  relationshipType: "self" as const,
  birthDate: "1995-05-20",
  birthTime: "09:00",
  calendarType: "양력" as const,
  isLeapMonth: false,
  gender: "남성" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const PRODUCT_IDS = [
  "career-specialization",
  "money-leak-risk",
  "relationship-conflict",
  "relationship-current",
];
const MODEL = "gpt-5.6-luna";
const TIMEOUT_MS = 120000;
const MAX_OUTPUT_TOKENS = resolveMaxOutputTokens("paid-analysis-detail");

function loadApiKey(): string | undefined {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;

  const raw = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  const line = raw.split(/\r?\n/).find((value) => value.trim().startsWith("OPENAI_API_KEY="));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
}

async function main(): Promise<void> {
  const apiKey = loadApiKey();
  if (!apiKey) throw new Error("OPENAI_API_KEY is unavailable");
  process.env.OPENAI_API_KEY = apiKey;

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const artifactStore = await createPaidAnalysisV4DiagnosticArtifactStore(runId);
  const manifest = await runPaidAnalysisV4DiagnosticCapture({
    runId,
    productIds: PRODUCT_IDS,
    model: MODEL,
    reasoningSetting: "low",
    outputLimit: MAX_OUTPUT_TOKENS,
    timeoutMs: TIMEOUT_MS,
    retryCount: 0,
    buildInput: (productId) => buildPaidAnalysisInputFromProfile(PROFILE_FIXTURE, productId),
    request: async (prompt) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const response = await getOpenAIClient().responses.create(
          { model: MODEL, input: prompt, max_output_tokens: MAX_OUTPUT_TOKENS, reasoning: { effort: "low" } },
          { signal: controller.signal },
        );
        return {
          requestId: response._request_id ?? undefined,
          responseStatus: response.status,
          rawOutput: response.output_text ?? "",
        };
      } finally {
        clearTimeout(timeout);
      }
    },
    artifactStore,
  });

  console.log(`RUN ID: ${manifest.runId}`);
  console.log(`ARTIFACT DIRECTORY: ${artifactStore.artifactDirectory}`);
  console.log(`CALLS ATTEMPTED: ${manifest.callsAttempted}`);
  console.log(`CALLS COMPLETED: ${manifest.callsCompleted}`);
  console.log(`SUCCESSFUL CALLS: ${manifest.successfulCalls}`);
  console.log(`FAILED CALLS: ${manifest.failedCalls}`);
  console.log(`PARSE FAILURES: ${manifest.parseFailures}`);
  console.log(`ARTIFACT COUNT: ${manifest.artifactCount}`);
}

void main();