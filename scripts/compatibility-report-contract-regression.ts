import { readFileSync } from "node:fs";
import { buildCompatibilityTiming } from "../app/lib/compatibilityTiming";
import {
  COMPATIBILITY_REPORT_CONTRACT_VERSION,
  COMPATIBILITY_REPORT_SECTION_ORDER,
  buildCompatibilityReportContext,
  buildCompatibilityReportJsonContract,
  buildCompatibilityReportPrompt,
  validateCompatibilityReportOutput,
} from "../app/lib/compatibilityReportContract";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const personA = {
  pillars: {
    year: "甲子",
    month: "丙寅",
    day: "甲子",
    hour: "乙卯",
  },
};

const personB = {
  pillars: {
    year: "己丑",
    month: "癸亥",
    day: "己午",
    hour: "丁未",
  },
};

const timing = buildCompatibilityTiming(personA, personB, {
  evaluationYear: 2026,
  A: { daeunGanji: "갑자", seunGanji: "丙子" },
  B: { daeunGanji: "己丑", seunGanji: "정오" },
});

const first = buildCompatibilityReportContext(timing);
const second = buildCompatibilityReportContext(timing);

assert(JSON.stringify(first) === JSON.stringify(second), "report context must be deterministic");
assert(first.contractVersion === COMPATIBILITY_REPORT_CONTRACT_VERSION, "report contract version must be explicit");
assert(first.roleSemantics.A === "user" && first.roleSemantics.B === "partner", "A/B role meaning must be fixed before AI explanation");
assert(first.evaluationYear === 2026, "report context must preserve explicit evaluation year");
assert(first.allowedEvidenceRefs.length === first.evidenceFacts.length, "every fact must be addressable by one allowed ref");
assert(new Set(first.allowedEvidenceRefs).size === first.allowedEvidenceRefs.length, "evidence refs must be unique");
assert(first.evidenceFacts.some((fact) => fact.family === "natal_domain"), "context must include natal domain facts");
assert(first.evidenceFacts.some((fact) => fact.family === "natal_relation"), "context must include natal relation facts");
assert(first.evidenceFacts.some((fact) => fact.family === "personal_structure"), "context must include personal structure facts");
assert(first.evidenceFacts.some((fact) => fact.family === "timing_load"), "context must include individual timing load facts");
assert(first.evidenceFacts.some((fact) => fact.family === "timing_domain"), "context must include timing domain facts");
assert(first.evidenceFacts.some((fact) => fact.family === "timing_relation"), "context must include timing relationship facts");
assert(!("score" in first), "report context must not create one overall compatibility score");
assert(!("overallScore" in first), "report context must not expose an overall score field");

const validOutput = {
  relationshipCore: {
    headline: "서로 다른 반응 속도를 조율하면 강점이 살아나는 관계",
    summary: "두 사람은 가까워지는 힘과 서로를 자극하는 힘이 함께 나타납니다. 관계를 좋고 나쁨 하나로 판단하기보다, 반응 속도와 기대 차이를 어떻게 조율하는지가 핵심입니다.",
    evidenceRefs: ["report:natal-domain:intimacy", "report:natal-domain:communication"],
  },
  strengths: [
    {
      title: "가까워지는 힘",
      body: "서로에게 관심을 유지하고 다시 연결하려는 흐름을 관계의 강점으로 활용할 수 있습니다.",
      evidenceRefs: ["report:natal-domain:intimacy", "report:natal-domain:recovery"],
    },
    {
      title: "서로를 보완하는 자극",
      body: "상대가 가진 특성이 내 구조에 들어올 때 생기는 보완과 부담을 구분하면 관계 운영 기준을 더 선명하게 잡을 수 있습니다.",
      evidenceRefs: ["report:structure:B-to-A", "report:structure:A-to-B"],
    },
  ],
  conflict: {
    summary: "갈등은 감정 자체보다 말의 속도와 기대가 어긋날 때 커질 수 있습니다. 같은 상황을 다르게 받아들이는 순간을 먼저 알아차리는 것이 중요합니다.",
    keyPoints: ["답을 재촉하기보다 서로의 반응 시간을 확인해보세요."],
    evidenceRefs: ["report:natal-domain:communication", "report:natal-domain:conflict"],
  },
  recovery: {
    summary: "관계가 흔들렸을 때는 누가 맞는지 결론을 서두르기보다 다시 대화를 시작할 조건을 만드는 편이 도움이 됩니다.",
    keyPoints: ["갈등 뒤 대화를 다시 시작할 기준을 두 사람이 미리 정해두세요."],
    evidenceRefs: ["report:natal-domain:recovery"],
  },
  longTerm: {
    summary: "장기적으로는 서로의 차이를 없애려 하기보다 역할과 기대를 조정하는 방식이 관계의 안정성을 좌우합니다.",
    keyPoints: ["중요한 결정에서는 각자가 원하는 기준을 먼저 말로 확인하세요."],
    evidenceRefs: ["report:natal-domain:long_term"],
  },
  currentTiming: {
    headline: "올해는 두 사람의 반응 차이를 더 세심하게 볼 시기",
    summary: "현재 운의 흐름은 각자에게 다른 부담과 여유를 만들 수 있습니다. 기본 관계와 현재의 일시적인 압력을 구분해서 보는 것이 좋습니다.",
    keyPoints: ["평소보다 예민하게 반응하는 주제가 무엇인지 함께 확인해보세요."],
    evidenceRefs: ["report:timing-load:A", "report:timing-load:B", "report:timing-domain:conflict"],
  },
  actionGuide: {
    doNext: [
      {
        action: "갈등이 생긴 날에는 시작된 주제와 서로의 첫 반응을 짧게 기록해보세요.",
        reason: "반복되는 충돌이 성격 전체의 문제인지 특정 상황의 반응 차이인지 구분하는 데 도움이 됩니다.",
        evidenceRefs: ["report:natal-domain:conflict"],
      },
      {
        action: "중요한 결정을 할 때 각자가 원하는 속도와 기준을 먼저 말로 맞춰보세요.",
        reason: "관계에서 반복되는 소통 차이를 줄이고 서로의 강점을 살리는 데 도움이 됩니다.",
        evidenceRefs: ["report:natal-domain:communication", "report:natal-domain:intimacy"],
      },
    ],
    avoid: [
      {
        action: "현재 시기의 예민함을 관계 전체의 결론으로 확대해서 해석하지 마세요.",
        reason: "기본 궁합과 지금의 대운·세운 압력은 서로 다른 근거층으로 계산되기 때문입니다.",
        evidenceRefs: ["report:timing-load:A", "report:timing-load:B"],
      },
    ],
  },
};

const parsed = validateCompatibilityReportOutput(validOutput, first);
assert(parsed.strengths.length === 2, "valid report must preserve two or three strengths");
assert(parsed.currentTiming !== null, "available timing must require a current timing section");

let unknownRefRejected = false;
try {
  validateCompatibilityReportOutput({
    ...validOutput,
    relationshipCore: {
      ...validOutput.relationshipCore,
      evidenceRefs: ["report:not-real"],
    },
  }, first);
} catch {
  unknownRefRejected = true;
}
assert(unknownRefRejected, "unknown evidence refs must fail closed");

let timingLeakRejected = false;
try {
  validateCompatibilityReportOutput({
    ...validOutput,
    conflict: {
      ...validOutput.conflict,
      evidenceRefs: ["report:timing-domain:conflict"],
    },
  }, first);
} catch {
  timingLeakRejected = true;
}
assert(timingLeakRejected, "base conflict section must not use timing evidence as natal evidence");

let natalTimingRejected = false;
try {
  validateCompatibilityReportOutput({
    ...validOutput,
    currentTiming: {
      ...validOutput.currentTiming,
      evidenceRefs: ["report:natal-domain:conflict"],
    },
  }, first);
} catch {
  natalTimingRejected = true;
}
assert(natalTimingRejected, "current timing section must use only timing evidence families");

let scoreLanguageRejected = false;
try {
  validateCompatibilityReportOutput({
    ...validOutput,
    relationshipCore: {
      ...validOutput.relationshipCore,
      headline: "두 사람 궁합은 92점으로 매우 좋은 편입니다",
    },
  }, first);
} catch {
  scoreLanguageRejected = true;
}
assert(scoreLanguageRejected, "customer-visible numeric compatibility scores must be rejected");

let deterministicOutcomeRejected = false;
try {
  validateCompatibilityReportOutput({
    ...validOutput,
    longTerm: {
      ...validOutput.longTerm,
      summary: "두 사람은 반드시 결혼한다는 결론으로 이어지는 관계입니다. 장기 흐름도 같은 결론을 뒷받침합니다.",
    },
  }, first);
} catch {
  deterministicOutcomeRejected = true;
}
assert(deterministicOutcomeRejected, "fixed relationship outcomes must be rejected");

const unavailableTiming = buildCompatibilityTiming(personA, personB, {
  evaluationYear: 2026,
  A: {},
  B: {},
});
const unavailableContext = buildCompatibilityReportContext(unavailableTiming);
assert(unavailableContext.timingDataQuality.level === "unavailable", "fixture must have unavailable timing data");

const withoutTiming = {
  ...validOutput,
  currentTiming: null,
};
validateCompatibilityReportOutput(withoutTiming, unavailableContext);

let inventedTimingRejected = false;
try {
  validateCompatibilityReportOutput(validOutput, unavailableContext);
} catch {
  inventedTimingRejected = true;
}
assert(inventedTimingRejected, "report must not invent current timing when timing data is unavailable");

const prompt = buildCompatibilityReportPrompt(first);
assert(prompt.system.includes("계산하거나 추측하지 말고"), "system prompt must constrain the model to supplied evidence");
assert(prompt.system.includes("전체 궁합 점수"), "prompt must prohibit one overall compatibility score");
assert(prompt.system.includes("evidenceRefs"), "prompt must require evidence references");
assert(prompt.user.includes("[ENGINE_CONTEXT]"), "prompt must include the deterministic engine context");
assert(prompt.user.includes("[OUTPUT_JSON_CONTRACT]"), "prompt must include the structured JSON contract");
assert(prompt.user.includes(COMPATIBILITY_REPORT_SECTION_ORDER.join(" -> ")), "prompt must fix the customer report section order");

const jsonContract = buildCompatibilityReportJsonContract();
assert(jsonContract.includes('"relationshipCore"'), "JSON contract must include relationship core");
assert(jsonContract.includes('"strengths"'), "JSON contract must include strengths");
assert(jsonContract.includes('"conflict"'), "JSON contract must include conflict");
assert(jsonContract.includes('"recovery"'), "JSON contract must include recovery");
assert(jsonContract.includes('"longTerm"'), "JSON contract must include long-term relationship section");
assert(jsonContract.includes('"currentTiming"'), "JSON contract must include current timing");
assert(jsonContract.includes('"actionGuide"'), "JSON contract must include action guidance");

const source = readFileSync("app/lib/compatibilityReportContract.ts", "utf8");
assert(source.includes("CompatibilityReportOutputSchema"), "Phase 5 must define a runtime output schema");
assert(source.includes("validateCompatibilityReportOutput"), "Phase 5 must validate model output against context");
assert(source.includes("allowedEvidenceRefs"), "report context must expose a closed evidence reference set");
assert(!source.includes("Math.random"), "report contract construction must be deterministic");
assert(!source.includes("new Date("), "report contract must use the supplied evaluation year rather than current server time");
assert(!source.includes("Date.now"), "report contract must not depend on the hidden current time");
assert(!source.includes("openai"), "Phase 5 contract must not call an AI provider directly");

console.log("compatibility-report-contract-regression: OK");
