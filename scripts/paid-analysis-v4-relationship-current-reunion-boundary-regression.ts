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

function configOf(productId: "relationship-current" | "relationship-reunion") {
  const config = getPaidAnalysisTopicConfig(productId);

  if (!config) {
    throw new Error(`FAIL: missing config for ${productId}`);
  }

  return config;
}

function ids(items: { id: string }[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

const current = configOf("relationship-current");
const reunion = configOf("relationship-reunion");

for (const [productId, config] of [
  ["relationship-current", current],
  ["relationship-reunion", reunion],
] as const) {
  assert(
    getPaidAnalysisEngine(productId) === "RELATIONSHIP",
    `${productId} must map to RELATIONSHIP`,
  );
  assert(config.decisionType === "decision", `${productId} must be decision`);
  assert(config.requiredInsights.length === 4, `${productId} needs four requiredInsights`);
  assert((config.excludedFocus?.length ?? 0) === 3, `${productId} needs three excludedFocus items`);

  for (const insight of [...config.requiredInsights, ...(config.excludedFocus ?? [])]) {
    assert(insight.id.trim().length > 0, `${productId} insight id must not be empty`);
    assert(insight.prompt.trim().length > 0, `${productId} insight prompt must not be empty`);
  }
}

const currentRequired = ids(current.requiredInsights);
const reunionRequired = ids(reunion.requiredInsights);
assert(
  [...currentRequired].sort().join("|") !== [...reunionRequired].sort().join("|"),
  "current and reunion required insight sets must differ",
);

for (const reunionOnly of [
  "separation-context",
  "recontact-signal",
  "behavior-change-evidence",
  "reconnection-decision-action",
]) {
  assert(!currentRequired.has(reunionOnly), `current must not require ${reunionOnly}`);
}

for (const currentOnly of [
  "current-relationship-core-problem",
  "observable-relationship-signals",
  "continue-adjust-criteria",
  "current-relationship-action",
]) {
  assert(!reunionRequired.has(currentOnly), `reunion must not require ${currentOnly}`);
}

const reunionExcluded = ids(reunion.excludedFocus ?? []);
assert(
  reunionExcluded.has("current-relationship-routine-decision"),
  "reunion must yield ongoing relationship routine decisions to current",
);
assert(
  reunionExcluded.has("general-conflict-repair"),
  "reunion must yield conflict repair to conflict",
);
assert(
  reunionExcluded.has("marriage-or-longterm-outcome"),
  "reunion must exclude marriage and long-term outcomes",
);
assert(
  reunionRequired.has("separation-context") && reunionRequired.has("recontact-signal"),
  "reunion must make the separated state and recontact signals explicit",
);
assert(
  currentRequired.has("observable-relationship-signals") &&
    currentRequired.has("continue-adjust-criteria"),
  "current must retain ongoing observable signals and continue/adjust criteria",
);
assert(current.userQuestion !== reunion.userQuestion, "current and reunion questions must differ");
assert(
  JSON.stringify(current.actionFocus) !== JSON.stringify(reunion.actionFocus),
  "current and reunion actionFocus must differ",
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

const currentPrompt = promptFor("relationship-current");
const reunionPrompt = promptFor("relationship-reunion");

for (const [productId, config, prompt] of [
  ["relationship-current", current, currentPrompt],
  ["relationship-reunion", reunion, reunionPrompt],
] as const) {
  assert(prompt.includes("[반드시 다룰 핵심 통찰]"), `${productId} needs required insight block`);
  assert(prompt.includes("[이 상품의 경계]"), `${productId} needs excluded focus block`);
  assert(prompt.includes('"decisionCheck": ['), `${productId} must request decisionCheck JSON`);
  assert(prompt.includes("decisionCheck: 3개 이상 5개 이하"), `${productId} needs decisionCheck count rule`);

  for (const insight of config.requiredInsights) {
    assert(prompt.includes(insight.prompt), `${productId} must include ${insight.id}`);
  }
}

assert(
  !currentPrompt.includes(reunion.requiredInsights[0].prompt),
  "current prompt must not carry separated-state reunion insight",
);
assert(
  !reunionPrompt.includes(current.requiredInsights[0].prompt),
  "reunion prompt must not carry ongoing-state current insight",
);
assert(currentPrompt !== reunionPrompt, "current and reunion prompts must differ");
assert(
  reunionPrompt.includes("단절된 관계") && reunionPrompt.includes("재연결을 시도하거나 보류"),
  "reunion prompt must hold the separated-state reconnect/hold responsibility",
);
assert(
  currentPrompt.includes("현재 관계를 이어갈지 조정할지"),
  "current prompt must retain the ongoing continue/adjust responsibility",
);

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
  !relationshipRules.includes("relationship-current") &&
    !relationshipRules.includes("relationship-reunion"),
  "RELATIONSHIP Engine must not hardcode sibling product IDs",
);

const reunionMetadata = [
  getPremiumProduct("relationship-reunion")?.description,
  ...(getPremiumProduct("relationship-reunion")?.details ?? []),
].join("\n");
for (const currentPromise of ["현재 관계의 핵심 문제", "연락 빈도·약속 변경·대화 재개"]) {
  assert(
    !reunionMetadata.includes(currentPromise),
    `reunion metadata must not promise ongoing current scope: ${currentPromise}`,
  );
}
for (const outcomePromise of ["결혼 결과", "관계 결과 보장"]) {
  assert(
    !reunionMetadata.includes(outcomePromise),
    `reunion metadata must not promise outcome: ${outcomePromise}`,
  );
}

assert(
  formatTopicConfigForPrompt(current) !== formatTopicConfigForPrompt(reunion),
  "current and reunion specialization contracts must differ",
);

console.log("paid-analysis-v4-relationship-current-reunion-boundary-regression passed ✓");
