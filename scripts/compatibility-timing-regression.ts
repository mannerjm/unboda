import { readFileSync } from "node:fs";
import { buildCompatibilityPersonalStructure } from "../app/lib/compatibilityPersonalStructure";
import { buildCompatibilityTiming } from "../app/lib/compatibilityTiming";

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

const fullTiming = {
  evaluationYear: 2026,
  A: { daeunGanji: "갑자", seunGanji: "丙子" },
  B: { daeunGanji: "己丑", seunGanji: "정오" },
};

const first = buildCompatibilityTiming(personA, personB, fullTiming);
const second = buildCompatibilityTiming(personA, personB, fullTiming);

assert(JSON.stringify(first) === JSON.stringify(second), "timing layer must be deterministic");
assert(first.evaluationYear === 2026, "timing layer must preserve the explicitly supplied evaluation year");
assert(first.timingDataQuality.level === "full", "four supplied cycles must produce full timing quality");
assert(first.timingDataQuality.score === 1, "full timing quality must equal 1");
assert(first.timingDataQuality.missing.length === 0, "full timing input must not report missing cycles");
assert(first.individualTiming.A.cycles.length === 2, "A must retain both supplied current cycles");
assert(first.individualTiming.B.cycles.length === 2, "B must retain both supplied current cycles");
assert(first.individualTiming.A.cycles[0]?.ganji === "甲子", "Hangul cycle input must normalize to Hanja");
assert(first.individualTiming.B.cycles[1]?.ganji === "丁午", "mixed-script cycle input must normalize deterministically");

for (const individual of [first.individualTiming.A, first.individualTiming.B]) {
  assert(individual.confidence >= 0 && individual.confidence <= 1, "individual timing confidence must stay normalized");
  assert(individual.supportPressure >= 0, "timing support pressure cannot be negative");
  assert(individual.burdenPressure >= 0, "timing burden pressure cannot be negative");
  assert(individual.neutralPressure >= 0, "timing neutral pressure cannot be negative");
  assert(individual.signals.length === 4, "two cycles must create stem and branch signals for each person");
}

assert(
  first.evidence.some((item) => item.kind === "cycle_to_partner_natal"),
  "timing must compare current cycles with the partner natal chart",
);
assert(
  first.evidence.some((item) => item.kind === "cycle_alignment"),
  "timing must compare same-horizon current cycles across the pair",
);
assert(
  first.evidence.some((item) => item.relation === "충" && item.tone === "mixed"),
  "cycle clashes must remain mixed rather than becoming automatically bad",
);
assert(
  first.evidence.some((item) => item.relation === "합" && item.tone === "support"),
  "cycle combinations must be retained as support evidence",
);

for (const domain of Object.values(first.relationshipTimingDomains)) {
  assert(domain.confidence >= 0 && domain.confidence <= 1, "timing domain confidence must stay normalized");
  assert(domain.pressure.support >= 0, "domain support pressure cannot be negative");
  assert(domain.pressure.tension >= 0, "domain tension pressure cannot be negative");
  assert(domain.pressure.mixed >= 0, "domain mixed pressure cannot be negative");
  assert(domain.pressure.context >= 0, "domain context pressure cannot be negative");
}

const phase3 = buildCompatibilityPersonalStructure(personA, personB);
assert(
  JSON.stringify(first.base) === JSON.stringify(phase3),
  "Phase 4 must preserve the full Phase 3 base result instead of rewriting natal compatibility",
);
assert(!("score" in first), "timing result must not introduce one overall compatibility score");
assert(!("overallScore" in first), "overall compatibility score must remain absent");

const allHanja = buildCompatibilityTiming(personA, personB, {
  evaluationYear: 2026,
  A: { daeunGanji: "甲子", seunGanji: "丙子" },
  B: { daeunGanji: "己丑", seunGanji: "丁午" },
});
assert(
  JSON.stringify(first) === JSON.stringify(allHanja),
  "Hangul and Hanja cycle inputs must normalize to the same timing result",
);

const partial = buildCompatibilityTiming(personA, personB, {
  evaluationYear: 2026,
  A: { seunGanji: "병자" },
  B: {},
});
assert(partial.timingDataQuality.level === "limited", "one supplied timing slot must be limited quality");
assert(partial.timingDataQuality.score === 0.25, "one of four timing slots must produce 0.25 quality");
assert(partial.timingDataQuality.missing.includes("A.daeun"), "missing A daeun must remain explicit");
assert(partial.timingDataQuality.missing.includes("B.daeun"), "missing B daeun must remain explicit");
assert(partial.timingDataQuality.missing.includes("B.seun"), "missing B seun must remain explicit");
assert(partial.individualTiming.A.cycles.length === 1, "partial input must not synthesize A daeun");
assert(partial.individualTiming.B.cycles.length === 0, "missing B timing must remain absent");
assert(partial.individualTiming.B.level === "unavailable", "missing B timing must be unavailable rather than invented");
assert(partial.pairTimingPattern === "insufficient", "pair timing summary requires both people to have timing data");
assert(
  Object.values(partial.relationshipTimingDomains).every((domain) => domain.confidence <= partial.timingDataQuality.score),
  "timing domain confidence cannot exceed timing data completeness",
);

const unavailable = buildCompatibilityTiming(personA, personB, {
  evaluationYear: 2026,
  A: {},
  B: {},
});
assert(unavailable.timingDataQuality.level === "unavailable", "no cycles must produce unavailable timing quality");
assert(unavailable.timingDataQuality.score === 0, "no cycles must have zero timing completeness");
assert(unavailable.evidence.length === 0, "no cycles must not manufacture relationship timing evidence");
assert(
  Object.values(unavailable.relationshipTimingDomains).every(
    (domain) => domain.score === null && domain.level === "insufficient_evidence" && domain.confidence === 0,
  ),
  "no timing evidence must keep all timing domains insufficient",
);

let invalidGanjiRejected = false;
try {
  buildCompatibilityTiming(personA, personB, {
    evaluationYear: 2026,
    A: { seunGanji: "invalid" },
    B: {},
  });
} catch {
  invalidGanjiRejected = true;
}
assert(invalidGanjiRejected, "invalid current-cycle ganji must fail closed");

let invalidYearRejected = false;
try {
  buildCompatibilityTiming(personA, personB, {
    evaluationYear: 0,
    A: {},
    B: {},
  });
} catch {
  invalidYearRejected = true;
}
assert(invalidYearRejected, "invalid evaluation year must fail closed");

const source = readFileSync("app/lib/compatibilityTiming.ts", "utf8");
assert(source.includes("findBranchCombination"), "timing layer must reuse the existing fortune relation rules");
assert(source.includes("scoreCompatibilityElementSupply"), "timing load must reuse receiver-specific element usefulness scoring");
assert(source.includes("buildCompatibilityPersonalStructure"), "timing layer must build on the existing Phase 3 result");
assert(!source.includes("new Date("), "timing calculation must not silently depend on server current time");
assert(!source.includes("Date.now"), "timing calculation must use explicit evaluation year input");
assert(!source.includes("openai"), "timing calculation must not depend on an AI model");
assert(!source.includes("Math.random"), "timing calculation must remain deterministic");

console.log("compatibility-timing-regression: OK");
