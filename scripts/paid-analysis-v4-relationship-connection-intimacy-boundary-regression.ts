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
  productId: "relationship-new-connection" | "relationship-intimacy",
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

const connection = configOf("relationship-new-connection");
const intimacy = configOf("relationship-intimacy");

for (const [productId, config] of [
  ["relationship-new-connection", connection],
  ["relationship-intimacy", intimacy],
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

const connectionRequired = ids(connection.requiredInsights);
const intimacyRequired = ids(intimacy.requiredInsights);
assert(
  [...connectionRequired].sort().join("|") !== [...intimacyRequired].sort().join("|"),
  "connection and intimacy required insight sets must differ",
);

for (const intimacyOnly of [
  "intimacy-pace-pattern",
  "emotional-opening-boundary",
  "closeness-stress-response",
  "intimacy-adjustment-action",
]) {
  assert(!connectionRequired.has(intimacyOnly), `connection must not require ${intimacyOnly}`);
}

for (const connectionOnly of [
  "connection-opportunity-pattern",
  "initial-contact-style",
  "early-trust-signal",
  "new-connection-action",
]) {
  assert(!intimacyRequired.has(connectionOnly), `intimacy must not require ${connectionOnly}`);
}

const connectionExcluded = ids(connection.excludedFocus ?? []);
const intimacyExcluded = ids(intimacy.excludedFocus ?? []);
assert(
  connectionExcluded.has("intimacy-pace-pattern") &&
    connectionExcluded.has("emotional-opening-boundary"),
  "connection must yield intimacy pace and emotional opening",
);
assert(
  intimacyRequired.has("intimacy-pace-pattern") &&
    intimacyRequired.has("emotional-opening-boundary"),
  "intimacy must require pace and emotional opening",
);
assert(
  intimacyExcluded.has("connection-opportunity-pattern") &&
    intimacyExcluded.has("initial-contact-style"),
  "intimacy must yield connection opportunity and initial contact",
);
assert(
  connectionRequired.has("connection-opportunity-pattern") &&
    connectionRequired.has("initial-contact-style"),
  "connection must require opportunity and initial contact",
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

const connectionPrompt = promptFor("relationship-new-connection");
const intimacyPrompt = promptFor("relationship-intimacy");

for (const [productId, config, prompt] of [
  ["relationship-new-connection", connection, connectionPrompt],
  ["relationship-intimacy", intimacy, intimacyPrompt],
] as const) {
  assert(prompt.includes("[반드시 다룰 핵심 통찰]"), `${productId} needs required insight block`);
  assert(prompt.includes("[이 상품의 경계]"), `${productId} needs excluded focus block`);
  assert(!prompt.includes('"decisionCheck": ['), `${productId} must not request decisionCheck`);

  for (const insight of config.requiredInsights) {
    assert(prompt.includes(insight.prompt), `${productId} must include ${insight.id}`);
  }
}

assert(
  !connectionPrompt.includes(intimacy.requiredInsights[0].prompt),
  "connection prompt must not carry intimacy-only required insight",
);
assert(
  !intimacyPrompt.includes(connection.requiredInsights[0].prompt),
  "intimacy prompt must not carry connection-only required insight",
);
assert(connectionPrompt !== intimacyPrompt, "connection and intimacy prompts must differ");
assert(
  connectionPrompt.includes("초기 신뢰 진입 전") &&
    connectionPrompt.includes("계속·보류"),
  "connection prompt must retain acquisition and early-entry review ownership",
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
  !relationshipRules.includes("relationship-new-connection") &&
    !relationshipRules.includes("relationship-intimacy"),
  "RELATIONSHIP Engine must not hardcode sibling product IDs",
);

const connectionMetadata = [
  getPremiumProduct("relationship-new-connection")?.description,
  ...(getPremiumProduct("relationship-new-connection")?.details ?? []),
].join("\n");
for (const intimacyPromise of ["친밀감이 형성되는 속도", "감정 개방의 깊이"]) {
  assert(
    !connectionMetadata.includes(intimacyPromise),
    `connection metadata must not promise intimacy scope: ${intimacyPromise}`,
  );
}

const intimacyMetadata = [
  getPremiumProduct("relationship-intimacy")?.description,
  ...(getPremiumProduct("relationship-intimacy")?.details ?? []),
].join("\n");
for (const connectionPromise of ["새로운 인연이 형성", "첫 연락·만남·접점"]) {
  assert(
    !intimacyMetadata.includes(connectionPromise),
    `intimacy metadata must not promise connection scope: ${connectionPromise}`,
  );
}

assert(
  formatTopicConfigForPrompt(connection) !== formatTopicConfigForPrompt(intimacy),
  "connection and intimacy specialization contracts must differ",
);

console.log("paid-analysis-v4-relationship-connection-intimacy-boundary-regression passed ✓");
