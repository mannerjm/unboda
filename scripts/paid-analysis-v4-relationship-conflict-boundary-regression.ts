import {
  formatTopicConfigForPrompt,
  getPaidAnalysisTopicConfig,
} from "../app/lib/paidAnalysisTopicConfig";
import {
  getPaidAnalysisEngine,
  getPaidAnalysisEngineRules,
} from "../app/lib/paidAnalysisEngine";
import { buildPaidAnalysisDetailPromptV4 } from "../app/lib/paidAnalysisDetailPrompt";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function configOf(
  productId: "relationship-conflict" | "relationship-boundary",
) {
  const config = getPaidAnalysisTopicConfig(productId);

  if (!config) {
    throw new Error(`FAIL: missing config for ${productId}`);
  }

  return config;
}

function ids(items: { id: string }[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

const conflict = configOf("relationship-conflict");
const boundary = configOf("relationship-boundary");

for (const [productId, config] of [
  ["relationship-conflict", conflict],
  ["relationship-boundary", boundary],
] as const) {
  assert(
    getPaidAnalysisEngine(productId) === "RELATIONSHIP",
    `${productId} must map to RELATIONSHIP`,
  );
  assert(config.decisionType === "exploration", `${productId} must be exploration`);
  assert(config.requiredInsights.length === 4, `${productId} needs four requiredInsights`);
  assert((config.excludedFocus?.length ?? 0) === 3, `${productId} needs three excludedFocus items`);

  for (const insight of [...config.requiredInsights, ...(config.excludedFocus ?? [])]) {
    assert(insight.id.trim().length > 0, `${productId} insight id must not be empty`);
    assert(insight.prompt.trim().length > 0, `${productId} insight prompt must not be empty`);
  }
}

const conflictRequired = ids(conflict.requiredInsights);
const boundaryRequired = ids(boundary.requiredInsights);
assert(
  [...conflictRequired].sort().join("|") !== [...boundaryRequired].sort().join("|"),
  "conflict and boundary required insight sets must differ",
);

for (const boundaryOnly of [
  "boundary-overload-pattern",
  "role-responsibility-boundary",
  "distance-permission-standard",
  "boundary-adjustment-action",
]) {
  assert(!conflictRequired.has(boundaryOnly), `conflict must not require ${boundaryOnly}`);
}

for (const conflictOnly of [
  "conflict-trigger-pattern",
  "conflict-response-pattern",
  "repair-signal",
  "conflict-recovery-action",
]) {
  assert(!boundaryRequired.has(conflictOnly), `boundary must not require ${conflictOnly}`);
}

const conflictExcluded = ids(conflict.excludedFocus ?? []);
const boundaryExcluded = ids(boundary.excludedFocus ?? []);
assert(
  conflictExcluded.has("role-responsibility-boundary") &&
    boundaryRequired.has("role-responsibility-boundary"),
  "conflict must yield the general role and responsibility boundary",
);
assert(
  boundaryExcluded.has("conflict-trigger-pattern") &&
    boundaryRequired.has("boundary-overload-pattern"),
  "boundary must yield conflict triggers while retaining overload analysis",
);
assert(
  boundaryExcluded.has("repair-signal") && conflictRequired.has("repair-signal"),
  "boundary must yield repair signals to conflict",
);

const basePromptInput = {
  analysisType: "테스트 분석",
  birthData: "birth",
  originalChart: "chart",
  coreInterpretation: "core",
  fortuneTiming: "timing",
  sajuSummary: "summary",
  currentFortuneFlow: "flow",
};

function promptFor(productId: string): string {
  return buildPaidAnalysisDetailPromptV4({ ...basePromptInput, productId });
}

const conflictPrompt = promptFor("relationship-conflict");
const boundaryPrompt = promptFor("relationship-boundary");

for (const [productId, config, prompt] of [
  ["relationship-conflict", conflict, conflictPrompt],
  ["relationship-boundary", boundary, boundaryPrompt],
] as const) {
  assert(prompt.includes("[반드시 다룰 핵심 통찰]"), `${productId} needs required insight block`);
  assert(prompt.includes("[이 상품의 경계]"), `${productId} needs excluded focus block`);
  assert(!prompt.includes('"decisionCheck": ['), `${productId} must not request decisionCheck`);

  for (const insight of config.requiredInsights) {
    assert(prompt.includes(insight.prompt), `${productId} must include ${insight.id}`);
  }
}

assert(
  !conflictPrompt.includes(boundary.requiredInsights[0].prompt),
  "conflict prompt must not carry boundary-only required insight",
);
assert(
  !boundaryPrompt.includes(conflict.requiredInsights[0].prompt),
  "boundary prompt must not carry conflict-only required insight",
);
assert(conflictPrompt !== boundaryPrompt, "conflict and boundary prompts must differ");

const relationshipRules = getPaidAnalysisEngineRules("RELATIONSHIP");
assert(
  relationshipRules.includes("TopicConfig의 단일 질문과 반드시 다룰 핵심 통찰"),
  "RELATIONSHIP Engine must keep TopicConfig priority",
);
assert(
  relationshipRules.includes("제외한 범위를 핵심 결론이나 주된 action으로 확장하지 않는다"),
  "RELATIONSHIP Engine must keep excludedFocus rule",
);
assert(
  !relationshipRules.includes("relationship-conflict") &&
    !relationshipRules.includes("relationship-boundary"),
  "RELATIONSHIP Engine must not hardcode sibling product IDs",
);

const conflictMetadata = [
  getPremiumProduct("relationship-conflict")?.description,
  ...(getPremiumProduct("relationship-conflict")?.details ?? []),
].join("\n");
for (const boundaryPromise of ["장기 거리와 허용 기준", "일반 역할·책임 범위"]) {
  assert(
    !conflictMetadata.includes(boundaryPromise),
    `conflict metadata must not promise boundary scope: ${boundaryPromise}`,
  );
}

const boundaryMetadata = [
  getPremiumProduct("relationship-boundary")?.description,
  ...(getPremiumProduct("relationship-boundary")?.details ?? []),
].join("\n");
for (const conflictPromise of ["대화 재개", "수습과 재발 방지"]) {
  assert(
    !boundaryMetadata.includes(conflictPromise),
    `boundary metadata must not promise conflict recovery scope: ${conflictPromise}`,
  );
}

const current = getPaidAnalysisTopicConfig("relationship-current");
assert(current?.decisionType === "decision", "relationship-current must retain decision type");
const currentPrompt = promptFor("relationship-current");
assert(currentPrompt.includes('"decisionCheck": ['), "relationship-current must retain decisionCheck JSON");
assert(currentPrompt.includes("decisionCheck: 3개 이상 5개 이하"), "relationship-current must retain decisionCheck count rule");

assert(
  formatTopicConfigForPrompt(conflict) !== formatTopicConfigForPrompt(boundary),
  "conflict and boundary specialization contracts must differ",
);

console.log("paid-analysis-v4-relationship-conflict-boundary-regression passed ✓");
