import {
  branchElementMap,
  calculateWeightedElements,
  stemElementMap,
  type Element,
  type ElementAnalysis,
} from "./elements";
import { calculateStrength, type StrengthAnalysis } from "./strength";
import { analyzeYongshin, type YongshinResult } from "./yongshin";
import {
  buildCompatibilityDomains,
  type CompatibilityDomainAggregation,
} from "./compatibilityDomainAggregation";
import {
  type CompatibilityDataQuality,
  type CompatibilityPersonInput,
  type CompatibilityPersonRole,
  type CompatibilityPillarPosition,
} from "./compatibilityEngine";

const ELEMENTS: readonly Element[] = ["목", "화", "토", "금", "수"];
const TOP_ELEMENT_LIMIT = 3;
const MIN_DIRECTIONAL_PRESSURE = 0.05;

export type CompatibilityStructureSnapshot = {
  role: CompatibilityPersonRole;
  includedPillars: readonly CompatibilityPillarPosition[];
  hourKnown: boolean;
  dayStem: string;
  monthBranch: string;
  elements: ElementAnalysis;
  strength: Pick<
    StrengthAnalysis,
    "dayElement" | "resourceElement" | "supportScore" | "opposingScore" | "level"
  >;
  yongshin: Pick<YongshinResult, "primary" | "secondary" | "scores" | "normalizedScores">;
};

export type CompatibilityElementInfluence = {
  element: Element;
  providerShare: number;
  receiverOwnShare: number;
  usefulnessScore: number;
  preference: number;
  supportContribution: number;
  burdenContribution: number;
  neutralContribution: number;
};

export type CompatibilityDirectionalStructureLevel =
  | "supportive"
  | "mixed"
  | "burdensome"
  | "neutral";

export type CompatibilityDirectionalStructureInfluence = {
  from: CompatibilityPersonRole;
  to: CompatibilityPersonRole;
  balanceScore: number | null;
  level: CompatibilityDirectionalStructureLevel;
  confidence: number;
  supportPressure: number;
  burdenPressure: number;
  neutralPressure: number;
  elements: readonly CompatibilityElementInfluence[];
  leadingSupport: readonly CompatibilityElementInfluence[];
  leadingBurden: readonly CompatibilityElementInfluence[];
};

export type CompatibilityPersonalStructureResult = {
  dataQuality: CompatibilityDataQuality;
  domains: CompatibilityDomainAggregation["domains"];
  people: Readonly<{
    A: CompatibilityStructureSnapshot;
    B: CompatibilityStructureSnapshot;
  }>;
  directionalInfluence: Readonly<{
    AReceivesFromB: CompatibilityDirectionalStructureInfluence;
    BReceivesFromA: CompatibilityDirectionalStructureInfluence;
  }>;
};

type ParsedStructureInput = {
  stems: string[];
  branches: string[];
  includedPillars: CompatibilityPillarPosition[];
  dayStem: string;
  monthBranch: string;
};

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function parseStructureInput(input: CompatibilityPersonInput): ParsedStructureInput {
  const ordered: Array<readonly [CompatibilityPillarPosition, string | null | undefined]> = [
    ["year", input.pillars.year],
    ["month", input.pillars.month],
    ["day", input.pillars.day],
    ["hour", input.pillars.hour],
  ];

  const stems: string[] = [];
  const branches: string[] = [];
  const includedPillars: CompatibilityPillarPosition[] = [];
  let dayStem = "";
  let monthBranch = "";

  for (const [position, raw] of ordered) {
    if (!raw) {
      if (position === "hour") continue;
      throw new Error(`Compatibility personal structure requires ${position} pillar`);
    }

    const chars = Array.from(raw.trim());
    const stem = chars[0];
    const branch = chars[1];

    if (
      chars.length !== 2
      || !stem
      || !branch
      || !stemElementMap[stem]
      || !branchElementMap[branch]
    ) {
      throw new Error(`Invalid ${position} pillar for compatibility personal structure: ${raw}`);
    }

    stems.push(stem);
    branches.push(branch);
    includedPillars.push(position);

    if (position === "day") dayStem = stem;
    if (position === "month") monthBranch = branch;
  }

  if (!dayStem || !monthBranch) {
    throw new Error("Compatibility personal structure requires day stem and month branch");
  }

  return { stems, branches, includedPillars, dayStem, monthBranch };
}

function buildStructureSnapshot(
  role: CompatibilityPersonRole,
  input: CompatibilityPersonInput,
): CompatibilityStructureSnapshot {
  const parsed = parseStructureInput(input);
  const elements = calculateWeightedElements(parsed.stems, parsed.branches);
  const strength = calculateStrength(parsed.dayStem, elements);
  const yongshin = analyzeYongshin(
    parsed.dayStem,
    parsed.monthBranch,
    strength,
    elements,
  );

  return {
    role,
    includedPillars: parsed.includedPillars,
    hourKnown: parsed.includedPillars.includes("hour"),
    dayStem: parsed.dayStem,
    monthBranch: parsed.monthBranch,
    elements,
    strength: {
      dayElement: strength.dayElement,
      resourceElement: strength.resourceElement,
      supportScore: strength.supportScore,
      opposingScore: strength.opposingScore,
      level: strength.level,
    },
    yongshin: {
      primary: yongshin.primary,
      secondary: yongshin.secondary,
      scores: yongshin.scores,
      normalizedScores: yongshin.normalizedScores,
    },
  };
}

export function scoreCompatibilityElementSupply(input: {
  element: Element;
  providerShare: number;
  receiverOwnShare: number;
  usefulnessScore: number;
}): CompatibilityElementInfluence {
  const providerShare = round(clamp(input.providerShare, 0, 1));
  const receiverOwnShare = round(clamp(input.receiverOwnShare, 0, 1));
  const usefulnessScore = round(clamp(input.usefulnessScore, 0, 100), 1);

  // Only receiver-specific usefulness sets direction. Scarcity is recorded for explanation,
  // but receiverOwnShare is deliberately absent from the preference formula.
  const preference = round(clamp((usefulnessScore - 50) / 50, -1, 1));
  const signedImpact = round(providerShare * preference);

  return {
    element: input.element,
    providerShare,
    receiverOwnShare,
    usefulnessScore,
    preference,
    supportContribution: round(Math.max(0, signedImpact)),
    burdenContribution: round(Math.max(0, -signedImpact)),
    neutralContribution: round(providerShare * (1 - Math.abs(preference))),
  };
}

function calculateElementInfluence(
  receiver: CompatibilityStructureSnapshot,
  provider: CompatibilityStructureSnapshot,
): CompatibilityElementInfluence[] {
  return ELEMENTS.map((element) => scoreCompatibilityElementSupply({
    element,
    providerShare: provider.elements.percentages[element] / 100,
    receiverOwnShare: receiver.elements.percentages[element] / 100,
    usefulnessScore: receiver.yongshin.normalizedScores[element],
  }));
}

function classifyDirectionalInfluence(
  balanceScore: number | null,
  supportPressure: number,
  burdenPressure: number,
): CompatibilityDirectionalStructureLevel {
  if (balanceScore === null) return "neutral";

  const competing = supportPressure > 0 && burdenPressure > 0;
  if (competing && Math.abs(balanceScore - 50) <= 15) return "mixed";
  if (balanceScore >= 62) return "supportive";
  if (balanceScore <= 38) return "burdensome";
  return "mixed";
}

function sortInfluence(
  items: readonly CompatibilityElementInfluence[],
  key: "supportContribution" | "burdenContribution",
): CompatibilityElementInfluence[] {
  return [...items]
    .filter((item) => item[key] > 0)
    .sort((left, right) => {
      if (right[key] !== left[key]) return right[key] - left[key];
      return ELEMENTS.indexOf(left.element) - ELEMENTS.indexOf(right.element);
    });
}

function buildDirectionalInfluence(
  receiver: CompatibilityStructureSnapshot,
  provider: CompatibilityStructureSnapshot,
  dataQuality: CompatibilityDataQuality,
): CompatibilityDirectionalStructureInfluence {
  const elements = calculateElementInfluence(receiver, provider);
  const supportPressure = round(
    elements.reduce((sum, item) => sum + item.supportContribution, 0),
  );
  const burdenPressure = round(
    elements.reduce((sum, item) => sum + item.burdenContribution, 0),
  );
  const neutralPressure = round(
    elements.reduce((sum, item) => sum + item.neutralContribution, 0),
  );
  const active = supportPressure + burdenPressure;

  const balanceScore = active < MIN_DIRECTIONAL_PRESSURE
    ? null
    : Math.round(clamp(50 + (((supportPressure - burdenPressure) / active) * 50), 0, 100));

  const coverage = clamp(active + (neutralPressure * 0.25), 0, 1);
  const confidence = round(dataQuality.score * coverage);

  return {
    from: provider.role,
    to: receiver.role,
    balanceScore,
    level: classifyDirectionalInfluence(balanceScore, supportPressure, burdenPressure),
    confidence,
    supportPressure,
    burdenPressure,
    neutralPressure,
    elements,
    leadingSupport: sortInfluence(elements, "supportContribution").slice(0, TOP_ELEMENT_LIMIT),
    leadingBurden: sortInfluence(elements, "burdenContribution").slice(0, TOP_ELEMENT_LIMIT),
  };
}

export function buildCompatibilityPersonalStructure(
  personA: CompatibilityPersonInput,
  personB: CompatibilityPersonInput,
): CompatibilityPersonalStructureResult {
  const domainAggregation = buildCompatibilityDomains(personA, personB);
  const A = buildStructureSnapshot("A", personA);
  const B = buildStructureSnapshot("B", personB);

  return {
    dataQuality: domainAggregation.dataQuality,
    // Phase 3 keeps the Phase 2 natal-domain balance untouched. Personal-structure influence
    // is a separate directional layer so it can be audited and later composed into report text
    // without double-counting the same traditional relation evidence.
    domains: domainAggregation.domains,
    people: { A, B },
    directionalInfluence: {
      AReceivesFromB: buildDirectionalInfluence(A, B, domainAggregation.dataQuality),
      BReceivesFromA: buildDirectionalInfluence(B, A, domainAggregation.dataQuality),
    },
  };
}
