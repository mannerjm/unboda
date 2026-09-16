import type { Element } from "./elements";
import type {
  CompatibilityDomainLevel,
  CompatibilityResultDomain,
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

export const FAMILY_SIBLING_DOMAINS = [
  "emotional_bond",
  "communication",
  "comparison_competition",
  "roles_boundaries",
  "recovery",
] as const;

export type FamilySiblingDomain = (typeof FAMILY_SIBLING_DOMAINS)[number];

export const FAMILY_OTHER_DOMAINS = [
  "emotional_distance",
  "communication",
  "role_expectations",
  "boundaries_contact",
  "recovery",
] as const;

export type FamilyOtherDomain = (typeof FAMILY_OTHER_DOMAINS)[number];

export const FAMILY_OTHER_RELATIONSHIP_KINDS = [
  "grandparent_grandchild",
  "aunt_uncle_niece_nephew",
  "cousins",
  "in_laws",
  "other_relatives",
] as const;

export type FamilyOtherRelationshipKind = (typeof FAMILY_OTHER_RELATIONSHIP_KINDS)[number];
export type FamilyOtherRole =
  | "grandparent"
  | "grandchild"
  | "aunt_uncle"
  | "niece_nephew"
  | "cousin"
  | "in_law"
  | "relative";

export type FamilyExtendedPressure = Readonly<{
  support: number;
  tension: number;
  mixed: number;
  context: number;
  total: number;
}>;

export type FamilyExtendedDirectionalInfluence = Readonly<{
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

type FamilyDomainResult<TDomain extends string> = Readonly<{
  domain: TDomain;
  score: number | null;
  level: CompatibilityDomainLevel;
  confidence: number;
  pressure: FamilyExtendedPressure;
  sourceDomains: readonly CompatibilityResultDomain[];
  evidenceIds: readonly string[];
}>;

export type FamilySiblingDomainResult = FamilyDomainResult<FamilySiblingDomain>;
export type FamilyOtherDomainResult = FamilyDomainResult<FamilyOtherDomain>;

export type FamilySiblingCompatibilityResult = Readonly<{
  relationshipType: "siblings";
  dataQuality: CompatibilityTimingResult["base"]["dataQuality"];
  domains: Readonly<Record<FamilySiblingDomain, FamilySiblingDomainResult>>;
  directions: Readonly<{
    userToSibling: FamilyExtendedDirectionalInfluence;
    siblingToUser: FamilyExtendedDirectionalInfluence;
  }>;
  currentTiming: Readonly<{
    evaluationYear: number;
    dataQuality: CompatibilityTimingDataQuality;
    pairPattern: CompatibilityPairTimingPattern;
    userLoad: CompatibilityIndividualTimingResult;
    siblingLoad: CompatibilityIndividualTimingResult;
    domains: Readonly<Record<FamilySiblingDomain, FamilySiblingDomainResult>>;
  }>;
}>;

export type FamilyOtherCompatibilityResult = Readonly<{
  relationshipType: "other_family";
  relationshipKind: FamilyOtherRelationshipKind;
  roleSemantics: Readonly<{
    user: FamilyOtherRole;
    familyMember: FamilyOtherRole;
  }>;
  dataQuality: CompatibilityTimingResult["base"]["dataQuality"];
  domains: Readonly<Record<FamilyOtherDomain, FamilyOtherDomainResult>>;
  directions: Readonly<{
    userToFamily: FamilyExtendedDirectionalInfluence;
    familyToUser: FamilyExtendedDirectionalInfluence;
  }>;
  currentTiming: Readonly<{
    evaluationYear: number;
    dataQuality: CompatibilityTimingDataQuality;
    pairPattern: CompatibilityPairTimingPattern;
    userLoad: CompatibilityIndividualTimingResult;
    familyLoad: CompatibilityIndividualTimingResult;
    domains: Readonly<Record<FamilyOtherDomain, FamilyOtherDomainResult>>;
  }>;
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

const SIBLING_DOMAIN_SOURCES: Readonly<Record<FamilySiblingDomain, readonly WeightedSource[]>> = {
  emotional_bond: [
    { domain: "intimacy", weight: 0.45 },
    { domain: "recovery", weight: 0.3 },
    { domain: "communication", weight: 0.25 },
  ],
  communication: [
    { domain: "communication", weight: 0.7 },
    { domain: "conflict", weight: 0.3 },
  ],
  comparison_competition: [
    { domain: "conflict", weight: 0.45 },
    { domain: "long_term", weight: 0.35 },
    { domain: "communication", weight: 0.2 },
  ],
  roles_boundaries: [
    { domain: "long_term", weight: 0.4 },
    { domain: "conflict", weight: 0.35 },
    { domain: "communication", weight: 0.25 },
  ],
  recovery: [
    { domain: "recovery", weight: 0.7 },
    { domain: "conflict", weight: 0.15 },
    { domain: "communication", weight: 0.15 },
  ],
};

const OTHER_DOMAIN_SOURCES: Readonly<Record<FamilyOtherDomain, readonly WeightedSource[]>> = {
  emotional_distance: [
    { domain: "intimacy", weight: 0.4 },
    { domain: "long_term", weight: 0.25 },
    { domain: "recovery", weight: 0.2 },
    { domain: "communication", weight: 0.15 },
  ],
  communication: [
    { domain: "communication", weight: 0.7 },
    { domain: "conflict", weight: 0.3 },
  ],
  role_expectations: [
    { domain: "long_term", weight: 0.45 },
    { domain: "conflict", weight: 0.35 },
    { domain: "communication", weight: 0.2 },
  ],
  boundaries_contact: [
    { domain: "conflict", weight: 0.5 },
    { domain: "long_term", weight: 0.3 },
    { domain: "communication", weight: 0.2 },
  ],
  recovery: [
    { domain: "recovery", weight: 0.65 },
    { domain: "communication", weight: 0.2 },
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

function scoreFromPressure(pressure: FamilyExtendedPressure): number | null {
  const active = pressure.support + pressure.tension + pressure.mixed;
  if (active < SCORE_EVIDENCE_MINIMUM) return null;
  const balance = (pressure.support - pressure.tension) / active;
  return Math.round(clamp(50 + (balance * 50), 0, 100));
}

function classifyLevel(score: number | null, pressure: FamilyExtendedPressure): CompatibilityDomainLevel {
  if (score === null) return "insufficient_evidence";
  const active = pressure.support + pressure.tension + pressure.mixed;
  const mixedShare = active > 0 ? pressure.mixed / active : 0;
  const competing = pressure.support >= CONFLICTING_SIDE_THRESHOLD
    && pressure.tension >= CONFLICTING_SIDE_THRESHOLD;
  if (mixedShare >= MIXED_SHARE_THRESHOLD || (competing && Math.abs(score - 50) <= 18)) return "mixed";
  if (score >= 68) return "supportive";
  if (score <= 32) return "adjustment_needed";
  return "steady";
}

function aggregateDomain<TDomain extends string>(
  domain: TDomain,
  sources: readonly WeightedSource[],
  source: Readonly<Record<CompatibilityResultDomain, SourceDomainResult>>,
): FamilyDomainResult<TDomain> {
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

  const pressure: FamilyExtendedPressure = {
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

function buildSiblingDomains(
  source: Readonly<Record<CompatibilityResultDomain, SourceDomainResult>>,
): Readonly<Record<FamilySiblingDomain, FamilySiblingDomainResult>> {
  return Object.fromEntries(FAMILY_SIBLING_DOMAINS.map((domain) => [
    domain,
    aggregateDomain(domain, SIBLING_DOMAIN_SOURCES[domain], source),
  ])) as Record<FamilySiblingDomain, FamilySiblingDomainResult>;
}

function buildOtherDomains(
  source: Readonly<Record<CompatibilityResultDomain, SourceDomainResult>>,
): Readonly<Record<FamilyOtherDomain, FamilyOtherDomainResult>> {
  return Object.fromEntries(FAMILY_OTHER_DOMAINS.map((domain) => [
    domain,
    aggregateDomain(domain, OTHER_DOMAIN_SOURCES[domain], source),
  ])) as Record<FamilyOtherDomain, FamilyOtherDomainResult>;
}

function toDirection(influence: CompatibilityDirectionalStructureInfluence): FamilyExtendedDirectionalInfluence {
  return {
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

function userToCounterpart(result: CompatibilityTimingResult): FamilyExtendedDirectionalInfluence {
  return toDirection(result.base.directionalInfluence.BReceivesFromA);
}

function counterpartToUser(result: CompatibilityTimingResult): FamilyExtendedDirectionalInfluence {
  return toDirection(result.base.directionalInfluence.AReceivesFromB);
}

export function buildFamilySiblingCompatibility(result: CompatibilityTimingResult): FamilySiblingCompatibilityResult {
  return {
    relationshipType: "siblings",
    dataQuality: result.base.dataQuality,
    domains: buildSiblingDomains(result.base.domains),
    directions: {
      userToSibling: userToCounterpart(result),
      siblingToUser: counterpartToUser(result),
    },
    currentTiming: {
      evaluationYear: result.evaluationYear,
      dataQuality: result.timingDataQuality,
      pairPattern: result.pairTimingPattern,
      userLoad: result.individualTiming.A,
      siblingLoad: result.individualTiming.B,
      domains: buildSiblingDomains(result.relationshipTimingDomains),
    },
  };
}

export function buildFamilyOtherCompatibility(
  result: CompatibilityTimingResult,
  relationshipKind: FamilyOtherRelationshipKind,
  roleSemantics: Readonly<{ user: FamilyOtherRole; familyMember: FamilyOtherRole }>,
): FamilyOtherCompatibilityResult {
  return {
    relationshipType: "other_family",
    relationshipKind,
    roleSemantics,
    dataQuality: result.base.dataQuality,
    domains: buildOtherDomains(result.base.domains),
    directions: {
      userToFamily: userToCounterpart(result),
      familyToUser: counterpartToUser(result),
    },
    currentTiming: {
      evaluationYear: result.evaluationYear,
      dataQuality: result.timingDataQuality,
      pairPattern: result.pairTimingPattern,
      userLoad: result.individualTiming.A,
      familyLoad: result.individualTiming.B,
      domains: buildOtherDomains(result.relationshipTimingDomains),
    },
  };
}

export function resolveFamilyOtherRolePair(
  relationshipKind: FamilyOtherRelationshipKind,
  userRole: FamilyOtherRole,
): Readonly<{ user: FamilyOtherRole; familyMember: FamilyOtherRole }> | null {
  if (relationshipKind === "grandparent_grandchild") {
    if (userRole === "grandparent") return { user: "grandparent", familyMember: "grandchild" };
    if (userRole === "grandchild") return { user: "grandchild", familyMember: "grandparent" };
    return null;
  }
  if (relationshipKind === "aunt_uncle_niece_nephew") {
    if (userRole === "aunt_uncle") return { user: "aunt_uncle", familyMember: "niece_nephew" };
    if (userRole === "niece_nephew") return { user: "niece_nephew", familyMember: "aunt_uncle" };
    return null;
  }
  if (relationshipKind === "cousins" && userRole === "cousin") return { user: "cousin", familyMember: "cousin" };
  if (relationshipKind === "in_laws" && userRole === "in_law") return { user: "in_law", familyMember: "in_law" };
  if (relationshipKind === "other_relatives" && userRole === "relative") return { user: "relative", familyMember: "relative" };
  return null;
}

export function getFamilyOtherRelationshipLabel(kind: FamilyOtherRelationshipKind): string {
  switch (kind) {
    case "grandparent_grandchild": return "조부모·손주";
    case "aunt_uncle_niece_nephew": return "삼촌·이모·고모·조카";
    case "cousins": return "사촌";
    case "in_laws": return "인척";
    case "other_relatives": return "기타 친족";
  }
}

export function getFamilyOtherRoleLabel(role: FamilyOtherRole): string {
  switch (role) {
    case "grandparent": return "조부모";
    case "grandchild": return "손주";
    case "aunt_uncle": return "삼촌·이모·고모";
    case "niece_nephew": return "조카";
    case "cousin": return "사촌";
    case "in_law": return "인척";
    case "relative": return "가족";
  }
}
