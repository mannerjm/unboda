import { readFileSync } from "node:fs";
import {
  aggregateCompatibilityDomains,
  buildCompatibilityDomains,
  COMPATIBILITY_RESULT_DOMAINS,
  type CompatibilityDomainAggregation,
} from "../app/lib/compatibilityDomainAggregation";
import type {
  CompatibilityEvidence,
  CompatibilityFoundation,
} from "../app/lib/compatibilityEngine";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function evidence(
  overrides: Partial<CompatibilityEvidence> & Pick<CompatibilityEvidence, "id" | "kind" | "relation" | "tone" | "domains">,
): CompatibilityEvidence {
  return {
    strength: 1,
    participants: [
      { person: "A", position: "day", component: "branch", value: "寅" },
      { person: "B", position: "day", component: "branch", value: "亥" },
    ],
    ...overrides,
  };
}

function foundation(
  evidenceItems: readonly CompatibilityEvidence[],
  dataQualityScore = 1,
): CompatibilityFoundation {
  return {
    dataQuality: {
      score: dataQualityScore,
      level: dataQualityScore === 1 ? "full" : "standard",
      missing: dataQualityScore === 1 ? [] : ["B.hour"],
    },
    evidence: evidenceItems,
  };
}

const supportive = aggregateCompatibilityDomains(foundation([
  evidence({
    id: "support-day-combination",
    kind: "branch_combination",
    relation: "육합",
    tone: "support",
    domains: ["foundation", "intimacy", "recovery", "long_term"],
  }),
]));

assert(supportive.domains.intimacy.score === 100, "pure support evidence must produce a high internal domain score");
assert(supportive.domains.intimacy.level === "supportive", "pure support evidence must classify as supportive");
assert(supportive.domains.intimacy.pressure.support === 1, "intimacy must use the full day-day combination contribution");
assert(supportive.domains.intimacy.leadingSupport[0]?.evidenceId === "support-day-combination", "leading support evidence must remain auditable");

const tension = aggregateCompatibilityDomains(foundation([
  evidence({
    id: "tension-punishment",
    kind: "branch_punishment",
    relation: "형",
    tone: "tension",
    domains: ["conflict", "long_term"],
  }),
]));

assert(tension.domains.conflict.score === 0, "pure tension evidence must lower the internal conflict-domain balance");
assert(tension.domains.conflict.level === "adjustment_needed", "pure tension evidence must classify as adjustment needed");
assert(tension.domains.conflict.leadingTension[0]?.relation === "형", "tension evidence relation must be preserved");

const mixed = aggregateCompatibilityDomains(foundation([
  evidence({
    id: "mixed-clash",
    kind: "branch_clash",
    relation: "충",
    tone: "mixed",
    domains: ["communication", "conflict", "change"],
  }),
]));

assert(mixed.domains.conflict.score === 50, "pure mixed evidence must not be forced into positive or negative polarity");
assert(mixed.domains.conflict.level === "mixed", "clash-only conflict evidence must remain mixed");
assert(mixed.domains.conflict.pressure.mixed === 1, "mixed pressure must remain separate from tension pressure");

const overlapping = aggregateCompatibilityDomains(foundation([
  evidence({
    id: "overlap-combination",
    kind: "branch_combination",
    relation: "육합",
    tone: "support",
    domains: ["foundation", "intimacy", "recovery", "long_term"],
  }),
  evidence({
    id: "overlap-break",
    kind: "branch_break",
    relation: "파",
    tone: "mixed",
    domains: ["recovery", "long_term", "change"],
  }),
]));

assert(overlapping.domains.recovery.pressure.support > 0, "recovery must retain supportive evidence when relations overlap");
assert(overlapping.domains.recovery.pressure.mixed > 0, "recovery must retain mixed evidence when relations overlap");
assert(overlapping.domains.recovery.level === "mixed", "support plus substantial mixed pressure must stay mixed instead of collapsing to good/bad");
assert(overlapping.domains.recovery.evidenceIds.length === 2, "overlapping signals must keep both evidence ids");

const contextOnly = aggregateCompatibilityDomains(foundation([
  evidence({
    id: "context-ten-god",
    kind: "cross_ten_god",
    relation: "정인",
    tone: "context",
    domains: ["foundation", "communication", "intimacy", "long_term"],
    participants: [
      { person: "A", position: "day", component: "stem", value: "甲" },
      { person: "B", position: "day", component: "stem", value: "癸" },
    ],
  }),
]));

assert(contextOnly.domains.communication.score === null, "context evidence alone must not manufacture a compatibility score");
assert(contextOnly.domains.communication.level === "insufficient_evidence", "context-only domains must remain insufficient for directional judgment");
assert(contextOnly.domains.communication.pressure.context > 0, "context evidence must still be retained for later interpretation");

const fullQuality = aggregateCompatibilityDomains(foundation([
  evidence({
    id: "confidence-combination",
    kind: "branch_combination",
    relation: "육합",
    tone: "support",
    domains: ["intimacy", "recovery", "long_term"],
  }),
], 1));
const standardQuality = aggregateCompatibilityDomains(foundation([
  evidence({
    id: "confidence-combination",
    kind: "branch_combination",
    relation: "육합",
    tone: "support",
    domains: ["intimacy", "recovery", "long_term"],
  }),
], 0.875));

assert(
  standardQuality.domains.intimacy.confidence < fullQuality.domains.intimacy.confidence,
  "missing birth-time data must lower confidence without inventing replacement evidence",
);
assert(
  standardQuality.domains.intimacy.score === fullQuality.domains.intimacy.score,
  "data completeness must affect confidence, not rewrite identical evidence balance",
);

const personA = {
  pillars: {
    year: "甲申",
    month: "丙子",
    day: "甲子",
    hour: "戊辰",
  },
};
const personB = {
  pillars: {
    year: "己午",
    month: "辛酉",
    day: "己丑",
    hour: "癸未",
  },
};

const integratedA = buildCompatibilityDomains(personA, personB);
const integratedB = buildCompatibilityDomains(personA, personB);
assert(JSON.stringify(integratedA) === JSON.stringify(integratedB), "domain aggregation must be deterministic for identical pillar inputs");
assert(
  Object.keys(integratedA.domains).join(",") === COMPATIBILITY_RESULT_DOMAINS.join(","),
  "aggregation must expose exactly the five relationship result domains",
);

for (const domain of COMPATIBILITY_RESULT_DOMAINS) {
  const result = integratedA.domains[domain];
  assert(result.domain === domain, `${domain} result must preserve its domain key`);
  assert(result.confidence >= 0 && result.confidence <= 1, `${domain} confidence must remain bounded`);
  if (result.score !== null) {
    assert(result.score >= 0 && result.score <= 100, `${domain} score must remain internally bounded`);
  }
}

assert(!("overallScore" in (integratedA as CompatibilityDomainAggregation & { overallScore?: number })), "phase 2 must not introduce one simplistic overall compatibility score");

const aggregationSource = readFileSync("app/lib/compatibilityDomainAggregation.ts", "utf8");
assert(!aggregationSource.includes("openai"), "domain aggregation must remain independent of AI generation");
assert(!aggregationSource.includes("Math.random"), "domain aggregation must remain deterministic");
assert(aggregationSource.includes("support"), "domain aggregation must preserve support pressure");
assert(aggregationSource.includes("tension"), "domain aggregation must preserve tension pressure");
assert(aggregationSource.includes("mixed"), "domain aggregation must preserve mixed pressure");
assert(aggregationSource.includes("context"), "domain aggregation must preserve contextual evidence separately");

console.log("compatibility-domain-aggregation-regression: OK");
