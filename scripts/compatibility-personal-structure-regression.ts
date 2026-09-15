import { readFileSync } from "node:fs";
import { buildCompatibilityDomains } from "../app/lib/compatibilityDomainAggregation";
import {
  buildCompatibilityPersonalStructure,
  scoreCompatibilityElementSupply,
} from "../app/lib/compatibilityPersonalStructure";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const woodDominant = {
  pillars: {
    year: "甲寅",
    month: "甲寅",
    day: "甲寅",
    hour: "甲寅",
  },
};

const waterDominant = {
  pillars: {
    year: "壬子",
    month: "癸亥",
    day: "壬子",
    hour: "癸亥",
  },
};

const first = buildCompatibilityPersonalStructure(woodDominant, waterDominant);
const second = buildCompatibilityPersonalStructure(woodDominant, waterDominant);

assert(
  JSON.stringify(first) === JSON.stringify(second),
  "personal-structure compatibility must be deterministic",
);
assert(first.people.A.role === "A" && first.people.B.role === "B", "person roles must remain explicit");
assert(first.people.A.hourKnown && first.people.B.hourKnown, "known hour pillars must be retained");
assert(first.people.A.includedPillars.length === 4, "complete A chart must use all four pillars");
assert(first.people.B.includedPillars.length === 4, "complete B chart must use all four pillars");
assert(first.people.A.strength.level.includes("신강"), "wood-dominant fixture should exercise strong-chart logic");
assert(first.people.A.yongshin.primary.length > 0, "personal structure must reuse the existing yongshin engine");

const absentButLowUsefulness = scoreCompatibilityElementSupply({
  element: "수",
  providerShare: 0.8,
  receiverOwnShare: 0,
  usefulnessScore: 20,
});
assert(absentButLowUsefulness.receiverOwnShare === 0, "scarcity guard fixture must represent an absent element");
assert(absentButLowUsefulness.supportContribution === 0, "scarcity alone must not create support");
assert(absentButLowUsefulness.burdenContribution > 0, "an absent low-usefulness element must be allowed to create burden");

const abundantButHighUsefulness = scoreCompatibilityElementSupply({
  element: "목",
  providerShare: 0.4,
  receiverOwnShare: 0.45,
  usefulnessScore: 90,
});
assert(abundantButHighUsefulness.receiverOwnShare > 0.4, "abundance guard fixture must represent a substantial natal share");
assert(abundantButHighUsefulness.supportContribution > 0, "abundance alone must not suppress a high-usefulness element");
assert(abundantButHighUsefulness.burdenContribution === 0, "high usefulness must remain supportive even when already present");

for (const direction of [
  first.directionalInfluence.AReceivesFromB,
  first.directionalInfluence.BReceivesFromA,
]) {
  assert(direction.confidence >= 0 && direction.confidence <= 1, "direction confidence must stay normalized");
  assert(direction.supportPressure >= 0, "support pressure cannot be negative");
  assert(direction.burdenPressure >= 0, "burden pressure cannot be negative");
  assert(direction.neutralPressure >= 0, "neutral pressure cannot be negative");
  assert(direction.elements.length === 5, "all five elements must be represented directionally");

  for (const item of direction.elements) {
    assert(item.providerShare >= 0 && item.providerShare <= 1, "provider share must be normalized");
    assert(item.receiverOwnShare >= 0 && item.receiverOwnShare <= 1, "receiver share must be normalized");
    assert(item.usefulnessScore >= 0 && item.usefulnessScore <= 100, "usefulness must come from normalized yongshin scores");
    assert(item.preference >= -1 && item.preference <= 1, "preference must stay in signed normalized range");

    if (item.preference > 0 && item.providerShare > 0) {
      assert(item.supportContribution > 0, "positive usefulness must map supplied element to support");
      assert(item.burdenContribution === 0, "positive usefulness must not simultaneously create burden");
    }

    if (item.preference < 0 && item.providerShare > 0) {
      assert(item.burdenContribution > 0, "negative usefulness must map supplied element to burden");
      assert(item.supportContribution === 0, "negative usefulness must not simultaneously create support");
    }
  }
}

assert(
  JSON.stringify(first.directionalInfluence.AReceivesFromB.elements)
    !== JSON.stringify(first.directionalInfluence.BReceivesFromA.elements),
  "A receiving B and B receiving A must remain directional rather than symmetric by force",
);

const swapped = buildCompatibilityPersonalStructure(waterDominant, woodDominant);
function influenceNumbers(value: typeof first.directionalInfluence.AReceivesFromB) {
  return {
    balanceScore: value.balanceScore,
    level: value.level,
    confidence: value.confidence,
    supportPressure: value.supportPressure,
    burdenPressure: value.burdenPressure,
    neutralPressure: value.neutralPressure,
    elements: value.elements,
  };
}
assert(
  JSON.stringify(influenceNumbers(first.directionalInfluence.AReceivesFromB))
    === JSON.stringify(influenceNumbers(swapped.directionalInfluence.BReceivesFromA)),
  "swapping people must preserve the same B-to-A structural influence under swapped role labels",
);
assert(
  JSON.stringify(influenceNumbers(first.directionalInfluence.BReceivesFromA))
    === JSON.stringify(influenceNumbers(swapped.directionalInfluence.AReceivesFromB)),
  "swapping people must preserve the reverse structural influence under swapped role labels",
);

const phase2 = buildCompatibilityDomains(woodDominant, waterDominant);
assert(
  JSON.stringify(first.domains) === JSON.stringify(phase2.domains),
  "Phase 3 must not silently rewrite Phase 2 natal-domain scores",
);
assert(!("score" in first), "personal-structure result must not introduce one overall compatibility score");
assert(!("overallScore" in first), "overall compatibility score must remain absent");

const partial = buildCompatibilityPersonalStructure(
  {
    pillars: {
      year: "甲寅",
      month: "甲寅",
      day: "甲寅",
    },
  },
  {
    pillars: {
      year: "壬子",
      month: "癸亥",
      day: "壬子",
    },
  },
);
assert(partial.dataQuality.level === "standard", "missing hours must remain standard-quality analyzable input");
assert(partial.dataQuality.score === 0.75, "two missing hours must keep the existing completeness contract");
assert(!partial.people.A.hourKnown && !partial.people.B.hourKnown, "unknown hours must stay unknown");
assert(
  !partial.people.A.includedPillars.includes("hour") && !partial.people.B.includedPillars.includes("hour"),
  "personal structure must never synthesize hour pillars",
);
assert(
  partial.directionalInfluence.AReceivesFromB.confidence <= partial.dataQuality.score,
  "directional confidence cannot exceed data completeness",
);
assert(
  partial.directionalInfluence.BReceivesFromA.confidence <= partial.dataQuality.score,
  "reverse directional confidence cannot exceed data completeness",
);

let invalidRejected = false;
try {
  buildCompatibilityPersonalStructure(
    { pillars: { year: "甲寅", month: "甲寅", day: "invalid" } },
    waterDominant,
  );
} catch {
  invalidRejected = true;
}
assert(invalidRejected, "invalid pillars must fail closed in the personal-structure layer");

const source = readFileSync("app/lib/compatibilityPersonalStructure.ts", "utf8");
assert(source.includes("calculateWeightedElements"), "Phase 3 must reuse the existing weighted-element engine");
assert(source.includes("calculateStrength"), "Phase 3 must reuse the existing strength engine");
assert(source.includes("analyzeYongshin"), "Phase 3 must reuse the existing yongshin engine");
assert(source.includes("yongshin.normalizedScores"), "partner influence must be keyed to receiver-specific usefulness");
assert(
  source.includes("receiverOwnShare is deliberately absent from the preference formula"),
  "the source must document that scarcity is explanatory rather than a scoring shortcut",
);
assert(!source.includes("openai"), "personal-structure calculation must not depend on an AI model");
assert(!source.includes("Math.random"), "personal-structure calculation must be deterministic");

console.log("compatibility-personal-structure-regression: OK");
