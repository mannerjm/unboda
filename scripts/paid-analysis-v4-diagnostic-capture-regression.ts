import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createPaidAnalysisV4DiagnosticArtifactStore,
  removePaidAnalysisV4DiagnosticArtifacts,
  runPaidAnalysisV4DiagnosticCapture,
  type PaidAnalysisV4DiagnosticArtifactStore,
} from "../app/lib/paidAnalysisV4DiagnosticCapture";
import { buildPaidAnalysisInputFromProfile } from "../app/lib/paidAnalysisProfileInput";
import type { PaidAnalysisDetailOutputV4 } from "../app/lib/paidAnalysisDetailOutput";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const profile = {
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

function text(value: string): string {
  return `${value} 구체적인 조건과 기준을 함께 확인한다.`;
}

function validOutput(): PaidAnalysisDetailOutputV4 {
  return {
    schemaVersion: "v4",
    conclusion: { headline: "운영 기준을 재정비할 시점", direction: "조정", focus: "현재 운영 구조", rationale: text("운영 압력이 반복된다."), immediateAction: text("운영 항목을 비교한다.") },
    coreProblem: { title: "반복 운영 압력", description: text("운영 조건이 겹치는 문제가 반복된다."), whyItMatters: text("조정하지 않으면 부담이 누적된다.") },
    cause: { summary: text("반복 조건이 부담을 만든다."), reasons: [1, 2, 3].map((index) => ({ title: `원인 ${index}`, observedStructure: text(`관찰 구조 ${index}`), realWorldPattern: text(`현실 패턴 ${index}`), problemLinkage: text(`문제 연결 ${index}`) })) },
    evidence: ["strength", "fortune_brain", "element_relations"].map((evidenceKey) => ({ evidenceKey, meaning: text(`${evidenceKey} 의미`), linkage: text(`${evidenceKey} 연결`) })) as PaidAnalysisDetailOutputV4["evidence"],
    current: { summary: text("현재 조건을 점검한다."), opportunities: [1, 2, 3].map((index) => ({ situation: text(`기회 상황 ${index}`), implication: text(`기회 의미 ${index}`), observableSignal: text(`기회 신호 ${index}`) })), cautions: [1, 2, 3].map((index) => ({ situation: text(`주의 상황 ${index}`), implication: text(`주의 의미 ${index}`), observableSignal: text(`주의 신호 ${index}`) })) },
    timeline: ["지금 이후 단기", "다음 전환 구간", "중기", "장기 준비"].map((label) => ({ label, changeSignal: text(`${label} 변화`), preparation: text(`${label} 준비`) })),
    action: [1, 2, 3].map((index) => ({ action: `운영 항목을 비교한다 ${index}`, target: `대상 ${index}`, condition: text(`조건 ${index}`), completionCriteria: text(`완료 기준 ${index}`) })),
    avoid: [{ type: "misjudgment", behavior: text("한 조건만으로 판단한다."), reason: text("다른 조건을 놓친다.") }, { type: "bad_condition", behavior: text("검토 없이 결론을 내린다."), reason: text("운영 조건의 차이를 놓친다.") }],
    confidence: { level: "중간", strongestEvidence: [text("근거 하나"), text("근거 둘")], uncertaintyFactors: [text("불확실 요인")], limitations: text("입력되지 않은 현실 정보는 판단하지 않는다.") },
  };
}

async function main(): Promise<void> {
const baseDirectory = path.join(os.tmpdir(), "unboda-v4-capture-regression");
const runId = "capture-regression";
const store = await createPaidAnalysisV4DiagnosticArtifactStore(runId, baseDirectory);
const payload = JSON.stringify(validOutput());
let attempt = 0;
const manifest = await runPaidAnalysisV4DiagnosticCapture({
  runId,
  productIds: ["career-specialization", "money-leak-risk", "relationship-conflict", "relationship-current", "relationship-current"],
  model: "test-model",
  reasoningSetting: "low",
  outputLimit: 4800,
  timeoutMs: 120000,
  retryCount: 0,
  buildInput: (productId) => buildPaidAnalysisInputFromProfile(profile, productId),
  request: async () => {
    attempt += 1;
    if (attempt === 2) throw new Error("network timeout");
    if (attempt === 3) return { requestId: "req-empty", responseStatus: "completed", rawOutput: "" };
    if (attempt === 4) return { requestId: "req-malformed", responseStatus: "completed", rawOutput: "{bad json" };
    if (attempt === 5) return { requestId: "req-schema", responseStatus: "completed", rawOutput: "{}" };
    return { requestId: "req-success", responseStatus: "completed", rawOutput: payload };
  },
  artifactStore: store,
});

assert(manifest.products.length === 5, "all attempted products must remain in manifest");
assert(manifest.products[0].schemaValidationSuccess, "successful structured response must validate");
assert(manifest.products[1].errorStage === "REQUEST", "request rejection must be classified");
assert(manifest.products[1].errorName === "REQUEST_TIMEOUT", "timeout rejection must be identified");
assert(manifest.products[2].errorStage === "TEXT_EXTRACTION", "empty text must be classified");
assert(manifest.products[3].errorStage === "STRUCTURED_PARSE", "malformed output must be classified");
assert(manifest.products[4].errorStage === "STRUCTURED_PARSE", "schema-invalid output must be classified");
assert(Boolean(manifest.products[0].artifactPath), "completed product artifact must be durable before later failures");
assert(manifest.artifactCount >= 5, "each product must produce an artifact when writing succeeds");

const manifestPath = path.join(store.artifactDirectory, `${runId}-manifest.json`);
const persistedManifest = JSON.parse(await readFile(manifestPath, "utf8"));
assert(persistedManifest.products.length === 5, "manifest must remain recoverable");
assert(!JSON.stringify(persistedManifest).includes("OPENAI_API_KEY"), "manifest must not contain secret field names");

const failingStore: PaidAnalysisV4DiagnosticArtifactStore = {
  ...store,
  writeProduct: async () => { throw new Error("artifact disk failure"); },
};
const artifactFailureManifest = await runPaidAnalysisV4DiagnosticCapture({
  runId: "artifact-write-failure",
  productIds: ["career-specialization"],
  model: "test-model",
  reasoningSetting: "low",
  outputLimit: 4800,
  timeoutMs: 120000,
  retryCount: 0,
  buildInput: (productId) => buildPaidAnalysisInputFromProfile(profile, productId),
  request: async () => ({ requestId: "req-artifact", responseStatus: "completed", rawOutput: payload }),
  artifactStore: failingStore,
});
assert(artifactFailureManifest.products[0].errorStage === "ARTIFACT_WRITE", "artifact write failure must remain diagnosable in manifest");

await removePaidAnalysisV4DiagnosticArtifacts(store.artifactDirectory);
console.log("paid-analysis-v4-diagnostic-capture-regression passed ✓");
}

void main();