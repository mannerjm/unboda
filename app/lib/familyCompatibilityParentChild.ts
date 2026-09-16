import type { Element } from "./elements";
import type {
  CompatibilityResultDomain,
  CompatibilityDomainLevel,
} from "./compatibilityDomainAggregation";
import type {
  CompatibilityDirectionalStructureInfluence,
  CompatibilityElementInfluence,
} from "./compatibilityPersonalStructure";
import type {
  CompatibilityIndividualTimingResult,
  CompatibilityPairTimingPattern,
  CompatibilityTimingDataQuality,
  CompatibilityTimingResult,
} from "./compatibilityTiming";

export const FAMILY_PARENT_CHILD_DOMAINS = [
  "emotional_connection",
  "communication",
  "expectations_autonomy",
  "boundaries_pressure",
  "recovery",
] as const;

export type FamilyParentChildDomain = (typeof FAMILY_PARENT_CHILD_DOMAINS)[number];
export type FamilyParentChildRole = "parent" | "child";

export type FamilyParentChildPressure = Readonly<{
  support: number;
  tension: number;
  mixed: number;
  context: number;
  total: number;
}>;

export type FamilyParentChildDomainResult = Readonly<{
  domain: FamilyParentChildDomain;
  score: number | null;
  level: CompatibilityDomainLevel;
  confidence: number;
  pressure: FamilyParentChildPressure;
  sourceDomains: readonly CompatibilityResultDomain[];
  evidenceIds: readonly string[];
}>;

export type FamilyParentChildDirectionalInfluence = Readonly<{
  fromRole: FamilyParentChildRole;
  toRole: FamilyParentChildRole;
  level: CompatibilityDirectionalStructureInfluence["level"];
  confidence: number;
  supportPressure: number;
  burdenPressure: number;
  neutralPressure: number;
  leadingSupport: readonly CompatibilityElementInfluence[];
  leadingBurden: readonly CompatibilityElementInfluence[];
  leadingSupportElements: readonly Element[];
  leadingBurdenElements: readonly Element[];
}>;

export type FamilyParentChildTimingResult = Readonly<{
  evaluationYear: number;
  dataQuality: CompatibilityTimingDataQuality;
  pairPattern: CompatibilityPairTimingPattern;
  parentLoad: CompatibilityIndividualTimingResult;
  childLoad: CompatibilityIndividualTimingResult;
  domains: Readonly<Record<FamilyParentChildDomain, FamilyParentChildDomainResult>>;
}>;

export type FamilyParentChildCompatibilityResult = Readonly<{
  relationshipType: "parent_child";
  roleSemantics: Readonly<{
    A: FamilyParentChildRole;
    B: FamilyParentChildRole;
  }>;
  dataQuality: CompatibilityTimingResult["base"]["dataQuality"];
  domains: Readonly<Record<FamilyParentChildDomain, FamilyParentChildDomainResult>>;
  directions: Readonly<{
    parentToChild: FamilyParentChildDirectionalInfluence;
    childToParent: FamilyParentChildDirectionalInfluence;
  }>;
  currentTiming: FamilyParentChildTimingResult;
}>;

type WeightedSource = Readonly<{
  domain: CompatibilityResultDomain;
  weight: number;
}>;

type SourceDomainResult = Readonly<{
  level: string;
  confidence: number;
  pressure: Readonly<{
    support: number;
    tension: number;
    mixed: number;
    context: number;
  }>;
  evidenceIds: readonly string[];
}>;

const FAMILY_DOMAIN_SOURCES: Readonly<Record<FamilyParentChildDomain, readonly WeightedSource[]>> = {
  emotional_connection: [
    { domain: "intimacy", weight: 0.5 },
    { domain: "recovery", weight: 0.3 },
    { domain: "communication", weight: 0.2 },
  ],
  communication: [
    { domain: "communication", weight: 0.75 },
    { domain: "conflict", weight: 0.25 },
  ],
  expectations_autonomy: [
    { domain: "long_term", weight: 0.45 },
    { domain: "conflict", weight: 0.35 },
    { domain: "communication", weight: 0.2 },
  ],
  boundaries_pressure: [
    { domain: "conflict", weight: 0.55 },
    { domain: "long_term", weight: 0.25 },
    { domain: "communication", weight: 0.2 },
  ],
  recovery: [
    { domain: "recovery", weight: 0.7 },
    { domain: "communication", weight: 0.15 },
    { domain: "conflict", weight: 0.15 },
  ],
};

const SCORE_EVIDENCE_MINIMUM = 0.08;
const MIXED_SHARE_THRESHOLD = 0.45;
const CONFLICTING_SIDE_THRESHOLD = 0.12;

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function scoreFromPressure(pressure: FamilyParentChildPressure): number | null {
  const active = pressure.support + pressure.tension + pressure.mixed;
  if (active < SCORE_EVIDENCE_MINIMUM) return null;
  const balance = (pressure.support - pressure.tension) / active;
  return Math.round(clamp(50 + (balance * 50), 0, 100));
}

function classifyLevel(
  score: number | null,
  pressure: FamilyParentChildPressure,
): CompatibilityDomainLevel {
  if (score === null) return "insufficient_evidence";

  const active = pressure.support + pressure.tension + pressure.mixed;
  const mixedShare = active > 0 ? pressure.mixed / active : 0;
  const competing = pressure.support >= CONFLICTING_SIDE_THRESHOLD
    && pressure.tension >= CONFLICTING_SIDE_THRESHOLD;

  if (mixedShare >= MIXED_SHARE_THRESHOLD || (competing && Math.abs(score - 50) <= 18)) {
    return "mixed";
  }
  if (score >= 68) return "supportive";
  if (score <= 32) return "adjustment_needed";
  return "steady";
}

function aggregateDomain(
  domain: FamilyParentChildDomain,
  source: Readonly<Record<CompatibilityResultDomain, SourceDomainResult>>,
): FamilyParentChildDomainResult {
  const sources = FAMILY_DOMAIN_SOURCES[domain];
  let support = 0;
  let tension = 0;
  let mixed = 0;
  let context = 0;
  let confidence = 0;
  let confidenceWeight = 0;
  const evidenceIds = new Set<string>();

  for (const item of sources) {
    const value = source[item.domain];
    support += value.pressure.support * item.weight;
    tension += value.pressure.tension * item.weight;
    mixed += value.pressure.mixed * item.weight;
    context += value.pressure.context * item.weight;
    confidence += value.confidence * item.weight;
    confidenceWeight += item.weight;
    value.evidenceIds.forEach((id) => evidenceIds.add(id));
  }

  const pressure: FamilyParentChildPressure = {
    support: round(support),
    tension: round(tension),
    mixed: round(mixed),
    context: round(context),
    total: round(support + tension + mixed + context),
  };
  const score = scoreFromPressure(pressure);

  return {
    domain,
    score,
    level: classifyLevel(score, pressure),
    confidence: round(confidenceWeight > 0 ? confidence / confidenceWeight : 0),
    pressure,
    sourceDomains: sources.map((item) => item.domain),
    evidenceIds: [...evidenceIds].sort(),
  };
}

function buildDomains(
  source: Readonly<Record<CompatibilityResultDomain, SourceDomainResult>>,
): Readonly<Record<FamilyParentChildDomain, FamilyParentChildDomainResult>> {
  return Object.fromEntries(
    FAMILY_PARENT_CHILD_DOMAINS.map((domain) => [domain, aggregateDomain(domain, source)]),
  ) as Record<FamilyParentChildDomain, FamilyParentChildDomainResult>;
}

function otherRole(role: FamilyParentChildRole): FamilyParentChildRole {
  return role === "parent" ? "child" : "parent";
}

function directionFromInfluence(
  influence: CompatibilityDirectionalStructureInfluence,
  fromRole: FamilyParentChildRole,
  toRole: FamilyParentChildRole,
): FamilyParentChildDirectionalInfluence {
  return {
    fromRole,
    toRole,
    level: influence.level,
    confidence: influence.confidence,
    supportPressure: influence.supportPressure,
    burdenPressure: influence.burdenPressure,
    neutralPressure: influence.neutralPressure,
    leadingSupport: influence.leadingSupport,
    leadingBurden: influence.leadingBurden,
    leadingSupportElements: influence.leadingSupport.map((item) => item.element),
    leadingBurdenElements: influence.leadingBurden.map((item) => item.element),
  };
}

function roleInfluence(
  result: CompatibilityTimingResult,
  sourcePerson: "A" | "B",
): CompatibilityDirectionalStructureInfluence {
  return sourcePerson === "A"
    ? result.base.directionalInfluence.BReceivesFromA
    : result.base.directionalInfluence.AReceivesFromB;
}

function timingLoadForRole(
  result: CompatibilityTimingResult,
  roleSemantics: Readonly<{ A: FamilyParentChildRole; B: FamilyParentChildRole }>,
  role: FamilyParentChildRole,
): CompatibilityIndividualTimingResult {
  return roleSemantics.A === role
    ? result.individualTiming.A
    : result.individualTiming.B;
}

export function buildFamilyParentChildCompatibility(
  result: CompatibilityTimingResult,
  userRole: FamilyParentChildRole,
): FamilyParentChildCompatibilityResult {
  const roleSemantics = {
    A: userRole,
    B: otherRole(userRole),
  } as const;

  const parentPerson = roleSemantics.A === "parent" ? "A" : "B";
  const childPerson = parentPerson === "A" ? "B" : "A";

  const parentToChild = directionFromInfluence(
    roleInfluence(result, parentPerson),
    "parent",
    "child",
  );
  const childToParent = directionFromInfluence(
    roleInfluence(result, childPerson),
    "child",
    "parent",
  );

  return {
    relationshipType: "parent_child",
    roleSemantics,
    dataQuality: result.base.dataQuality,
    domains: buildDomains(result.base.domains),
    directions: {
      parentToChild,
      childToParent,
    },
    currentTiming: {
      evaluationYear: result.evaluationYear,
      dataQuality: result.timingDataQuality,
      pairPattern: result.pairTimingPattern,
      parentLoad: timingLoadForRole(result, roleSemantics, "parent"),
      childLoad: timingLoadForRole(result, roleSemantics, "child"),
      domains: buildDomains(result.relationshipTimingDomains),
    },
  };
}
