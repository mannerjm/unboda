import { readFileSync } from "node:fs";
import {
  buildCompatibilityFoundation,
  COMPATIBILITY_POSITION_PAIR_WEIGHT,
  type CompatibilityEvidence,
} from "../app/lib/compatibilityEngine";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function hasEvidence(
  evidence: readonly CompatibilityEvidence[],
  kind: CompatibilityEvidence["kind"],
  relation?: string,
): boolean {
  return evidence.some((item) => item.kind === kind && (!relation || item.relation === relation));
}

const complementaryPair = buildCompatibilityFoundation(
  {
    pillars: {
      year: "甲申",
      month: "丙子",
      day: "甲子",
      hour: "戊辰",
    },
  },
  {
    pillars: {
      year: "己午",
      month: "辛酉",
      day: "己丑",
      hour: "癸未",
    },
  },
);

assert(complementaryPair.dataQuality.score === 1, "complete birth-time input must have full data quality");
assert(complementaryPair.dataQuality.level === "full", "complete birth-time input must be full quality");
assert(hasEvidence(complementaryPair.evidence, "stem_combination", "천간합"), "甲-己 must create heavenly-stem combination evidence");
assert(hasEvidence(complementaryPair.evidence, "branch_combination", "육합"), "子-丑 must create branch combination evidence");

const aToBElement = complementaryPair.evidence.find(
  (item) => item.kind === "day_stem_element" && item.metadata?.direction === "A->B",
);
assert(aToBElement?.relation === "control", "甲 day stem must control 己 day stem by element direction");

const aObservesBDay = complementaryPair.evidence.find(
  (item) => item.kind === "cross_ten_god"
    && item.metadata?.observer === "A"
    && item.participants[1]?.position === "day",
);
assert(aObservesBDay?.relation === "정재", "甲 observing 己 must resolve to 정재");

const bObservesADay = complementaryPair.evidence.find(
  (item) => item.kind === "cross_ten_god"
    && item.metadata?.observer === "B"
    && item.participants[1]?.position === "day",
);
assert(bObservesADay?.relation === "정관", "己 observing 甲 must resolve to 정관");

const clashPair = buildCompatibilityFoundation(
  {
    pillars: {
      year: "甲寅",
      month: "丙辰",
      day: "甲子",
      hour: "戊申",
    },
  },
  {
    pillars: {
      year: "庚戌",
      month: "壬申",
      day: "庚午",
      hour: "甲寅",
    },
  },
);

const dayClash = clashPair.evidence.find(
  (item) => item.kind === "branch_clash"
    && item.participants.every((participant) => participant.position === "day"),
);
assert(dayClash?.relation === "충", "子-午 day branches must create clash evidence");
assert(dayClash?.strength === 1, "day-to-day evidence must have the highest positional strength");

const clashAToB = clashPair.evidence.find(
  (item) => item.kind === "day_stem_element" && item.metadata?.direction === "A->B",
);
const clashBToA = clashPair.evidence.find(
  (item) => item.kind === "day_stem_element" && item.metadata?.direction === "B->A",
);
assert(clashAToB?.relation === "controlled_by", "甲 must be controlled by 庚 in directional element evidence");
assert(clashBToA?.relation === "control", "庚 must control 甲 in reverse directional element evidence");

const partialTimePair = buildCompatibilityFoundation(
  {
    pillars: {
      year: "甲寅",
      month: "丙辰",
      day: "戊申",
    },
  },
  {
    pillars: {
      year: "乙卯",
      month: "丁巳",
      day: "己酉",
    },
  },
);
assert(partialTimePair.dataQuality.level === "standard", "unknown birth times must remain analyzable at standard quality");
assert(partialTimePair.dataQuality.score === 0.75, "two missing hour pillars must reduce completeness deterministically");
assert(partialTimePair.dataQuality.missing.join(",") === "A.hour,B.hour", "missing-hour roles must be explicit");
assert(
  partialTimePair.evidence.every((item) => item.participants.every((participant) => participant.position !== "hour")),
  "unknown hour pillars must never create synthetic hour evidence",
);

const tripleHarmonyPair = buildCompatibilityFoundation(
  {
    pillars: {
      year: "甲申",
      month: "丙子",
      day: "戊寅",
    },
  },
  {
    pillars: {
      year: "乙巳",
      month: "丁酉",
      day: "庚辰",
    },
  },
);
const waterHarmony = tripleHarmonyPair.evidence.find(
  (item) => item.kind === "branch_triple_harmony" && item.metadata?.element === "수",
);
assert(waterHarmony !== undefined, "申-子-辰 spanning both charts must create water triple-harmony evidence");
assert(
  waterHarmony.participants.some((participant) => participant.person === "A")
    && waterHarmony.participants.some((participant) => participant.person === "B"),
  "triple harmony must represent a cross-chart relationship, not one chart alone",
);

const overlapPair = buildCompatibilityFoundation(
  {
    pillars: {
      year: "甲子",
      month: "丙辰",
      day: "戊寅",
    },
  },
  {
    pillars: {
      year: "乙丑",
      month: "丁未",
      day: "己亥",
    },
  },
);
const dayOverlap = overlapPair.evidence.filter(
  (item) => item.participants.every((participant) => participant.position === "day"),
);
assert(hasEvidence(dayOverlap, "branch_combination", "육합"), "寅-亥 must preserve combination evidence");
assert(hasEvidence(dayOverlap, "branch_break", "파"), "寅-亥 must also preserve break evidence instead of collapsing mixed signals");

assert(COMPATIBILITY_POSITION_PAIR_WEIGHT["day:day"] === 1, "day-day weighting contract changed");
assert(COMPATIBILITY_POSITION_PAIR_WEIGHT["month:month"] === 0.75, "month-month weighting contract changed");
assert(COMPATIBILITY_POSITION_PAIR_WEIGHT["year:hour"] === 0.35, "year-hour weighting contract changed");

let invalidPillarRejected = false;
try {
  buildCompatibilityFoundation(
    { pillars: { year: "invalid", month: "丙辰", day: "戊申" } },
    { pillars: { year: "乙卯", month: "丁巳", day: "己酉" } },
  );
} catch {
  invalidPillarRejected = true;
}
assert(invalidPillarRejected, "invalid pillars must fail closed instead of producing guessed evidence");

const engineSource = readFileSync("app/lib/compatibilityEngine.ts", "utf8");
assert(!engineSource.includes("openai"), "compatibility calculation foundation must not depend on an AI model");
assert(!engineSource.includes("Math.random"), "compatibility evidence must be deterministic");

console.log("compatibility-engine-foundation-regression: OK");
