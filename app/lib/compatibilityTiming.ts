import { branchElementMap, stemElementMap, type Element } from "./elements";
import {
  findBranchBreak,
  findBranchClash,
  findBranchCombination,
  findBranchHarm,
  findBranchPunishment,
  type FortuneRelationType,
} from "./fortuneRelations";
import {
  COMPATIBILITY_RESULT_DOMAINS,
  type CompatibilityResultDomain,
} from "./compatibilityDomainAggregation";
import {
  buildCompatibilityPersonalStructure,
  scoreCompatibilityElementSupply,
  type CompatibilityPersonalStructureResult,
  type CompatibilityStructureSnapshot,
} from "./compatibilityPersonalStructure";
import {
  type CompatibilityPersonInput,
  type CompatibilityPersonRole,
  type CompatibilityPillarPosition,
} from "./compatibilityEngine";

export type CompatibilityTimingCycle = "daeun" | "seun";
export type CompatibilityTimingTone = "support" | "tension" | "mixed" | "context";

export type CompatibilityTimingPersonInput = {
  daeunGanji?: string | null;
  seunGanji?: string | null;
};

export type CompatibilityTimingInput = {
  evaluationYear: number;
  A: CompatibilityTimingPersonInput;
  B: CompatibilityTimingPersonInput;
};

export type CompatibilityTimingDataQuality = {
  score: number;
  level: "full" | "partial" | "limited" | "unavailable";
  missing: readonly string[];
};

export type CompatibilityTimingCycleSnapshot = {
  cycle: CompatibilityTimingCycle;
  ganji: string;
  stem: string;
  branch: string;
  stemElement: Element;
  branchElement: Element;
};

export type CompatibilityTimingElementSignal = {
  cycle: CompatibilityTimingCycle;
  component: "stem" | "branch";
  element: Element;
  usefulnessScore: number;
  preference: number;
  supportContribution: number;
  burdenContribution: number;
  neutralContribution: number;
};

export type CompatibilityIndividualTimingLevel =
  | "supportive"
  | "mixed"
  | "burdensome"
  | "neutral"
  | "unavailable";

export type CompatibilityIndividualTimingResult = {
  person: CompatibilityPersonRole;
  cycles: readonly CompatibilityTimingCycleSnapshot[];
  balanceScore: number | null;
  level: CompatibilityIndividualTimingLevel;
  confidence: number;
  supportPressure: number;
  burdenPressure: number;
  neutralPressure: number;
  signals: readonly CompatibilityTimingElementSignal[];
};

export type CompatibilityTimingEvidenceKind =
  | "cycle_to_partner_natal"
  | "cycle_alignment";

export type CompatibilityTimingEvidence = {
  id: string;
  kind: CompatibilityTimingEvidenceKind;
  relation: FortuneRelationType;
  tone: CompatibilityTimingTone;
  strength: number;
  domains: readonly CompatibilityResultDomain[];
  sourcePerson: CompatibilityPersonRole;
  sourceCycle: CompatibilityTimingCycle;
  sourceGanji: string;
  targetPerson: CompatibilityPersonRole;
  targetGanji: string;
  targetCycle?: CompatibilityTimingCycle;
  targetPosition?: CompatibilityPillarPosition;
};

export type CompatibilityTimingPressure = {
  support: number;
  tension: number;
  mixed: number;
  context: number;
  total: number;
};

export type CompatibilityTimingDomainLevel =
  | "supportive"
  | "steady"
  | "mixed"
  | "adjustment_needed"
  | "insufficient_evidence";

export type CompatibilityTimingDomainResult = {
  domain: CompatibilityResultDomain;
  score: number | null;
  level: CompatibilityTimingDomainLevel;
  confidence: number;
  pressure: CompatibilityTimingPressure;
  evidenceIds: readonly string[];
};

export type CompatibilityPairTimingPattern =
  | "mutually_supported"
  | "jointly_pressured"
  | "asymmetric"
  | "mixed"
  | "insufficient";

export type CompatibilityTimingResult = {
  evaluationYear: number;
  base: CompatibilityPersonalStructureResult;
  timingDataQuality: CompatibilityTimingDataQuality;
  individualTiming: Readonly<{
    A: CompatibilityIndividualTimingResult;
    B: CompatibilityIndividualTimingResult;
  }>;
  relationshipTimingDomains: Readonly<
    Record<CompatibilityResultDomain, CompatibilityTimingDomainResult>
  >;
  pairTimingPattern: CompatibilityPairTimingPattern;
  evidence: readonly CompatibilityTimingEvidence[];
};

type ParsedCycle = CompatibilityTimingCycleSnapshot & {
  branchHangul: string;
};

const STEM_TO_HANJA: Readonly<Record<string, string>> = {
  甲: "甲", 乙: "乙", 丙: "丙", 丁: "丁", 戊: "戊",
  己: "己", 庚: "庚", 辛: "辛", 壬: "壬", 癸: "癸",
  갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊",
  기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸",
};

const BRANCH_TO_HANJA: Readonly<Record<string, string>> = {
  子: "子", 丑: "丑", 寅: "寅", 卯: "卯", 辰: "辰", 巳: "巳",
  午: "午", 未: "未", 申: "申", 酉: "酉", 戌: "戌", 亥: "亥",
  자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳",
  오: "午", 미: "未", 신: "申", 유: "酉", 술: "戌", 해: "亥",
};

const BRANCH_TO_HANGUL: Readonly<Record<string, string>> = {
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
  午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
};

const CYCLE_WEIGHT: Readonly<Record<CompatibilityTimingCycle, number>> = {
  daeun: 0.7,
  seun: 1,
};

const CYCLE_LOAD_WEIGHT: Readonly<Record<CompatibilityTimingCycle, number>> = {
  daeun: 0.45,
  seun: 0.55,
};

const COMPONENT_WEIGHT = {
  stem: 0.45,
  branch: 0.55,
} as const;

const PARTNER_POSITION_WEIGHT: Readonly<Record<CompatibilityPillarPosition, number>> = {
  day: 1,
  month: 0.7,
  hour: 0.55,
  year: 0.4,
};

const RELATION_RULES: ReadonlyArray<{
  relation: FortuneRelationType;
  tone: CompatibilityTimingTone;
  domains: readonly CompatibilityResultDomain[];
  matches: (left: string, right: string) => boolean;
}> = [
  {
    relation: "합",
    tone: "support",
    domains: ["recovery", "intimacy", "long_term"],
    matches: findBranchCombination,
  },
  {
    relation: "충",
    tone: "mixed",
    domains: ["communication", "conflict"],
    matches: findBranchClash,
  },
  {
    relation: "형",
    tone: "tension",
    domains: ["conflict", "long_term"],
    matches: findBranchPunishment,
  },
  {
    relation: "파",
    tone: "mixed",
    domains: ["recovery", "long_term"],
    matches: findBranchBreak,
  },
  {
    relation: "해",
    tone: "tension",
    domains: ["communication", "conflict"],
    matches: findBranchHarm,
  },
];

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function parseCycleGanji(
  cycle: CompatibilityTimingCycle,
  raw: string | null | undefined,
): ParsedCycle | null {
  if (raw == null || raw.trim() === "") return null;

  const chars = Array.from(raw.trim());
  const stem = STEM_TO_HANJA[chars[0] ?? ""];
  const branch = BRANCH_TO_HANJA[chars[1] ?? ""];

  if (chars.length !== 2 || !stem || !branch) {
    throw new Error(`Invalid ${cycle} ganji for compatibility timing: ${raw}`);
  }

  const stemElement = stemElementMap[stem];
  const branchElement = branchElementMap[branch];
  const branchHangul = BRANCH_TO_HANGUL[branch];

  if (!stemElement || !branchElement || !branchHangul) {
    throw new Error(`Unsupported ${cycle} ganji for compatibility timing: ${raw}`);
  }

  return {
    cycle,
    ganji: `${stem}${branch}`,
    stem,
    branch,
    stemElement,
    branchElement,
    branchHangul,
  };
}

function parseTimingCycles(input: CompatibilityTimingPersonInput): ParsedCycle[] {
  return [
    parseCycleGanji("daeun", input.daeunGanji),
    parseCycleGanji("seun", input.seunGanji),
  ].filter((item): item is ParsedCycle => Boolean(item));
}

function calculateTimingDataQuality(
  a: readonly ParsedCycle[],
  b: readonly ParsedCycle[],
): CompatibilityTimingDataQuality {
  const missing: string[] = [];
  for (const role of ["A", "B"] as const) {
    const cycles = role === "A" ? a : b;
    for (const cycle of ["daeun", "seun"] as const) {
      if (!cycles.some((item) => item.cycle === cycle)) missing.push(`${role}.${cycle}`);
    }
  }

  const present = 4 - missing.length;
  const score = round(present / 4);
  const level = present === 4
    ? "full"
    : present >= 2
      ? "partial"
      : present === 1
        ? "limited"
        : "unavailable";

  return { score, level, missing };
}

function buildIndividualTiming(
  role: CompatibilityPersonRole,
  cycles: readonly ParsedCycle[],
  person: CompatibilityStructureSnapshot,
  natalCompleteness: number,
): CompatibilityIndividualTimingResult {
  const signals: CompatibilityTimingElementSignal[] = [];

  for (const cycle of cycles) {
    for (const component of ["stem", "branch"] as const) {
      const element = component === "stem" ? cycle.stemElement : cycle.branchElement;
      const supplyWeight = CYCLE_LOAD_WEIGHT[cycle.cycle] * COMPONENT_WEIGHT[component];
      const influence = scoreCompatibilityElementSupply({
        element,
        providerShare: supplyWeight,
        receiverOwnShare: person.elements.percentages[element] / 100,
        usefulnessScore: person.yongshin.normalizedScores[element],
      });

      signals.push({
        cycle: cycle.cycle,
        component,
        element,
        usefulnessScore: influence.usefulnessScore,
        preference: influence.preference,
        supportContribution: influence.supportContribution,
        burdenContribution: influence.burdenContribution,
        neutralContribution: influence.neutralContribution,
      });
    }
  }

  const supportPressure = round(signals.reduce((sum, item) => sum + item.supportContribution, 0));
  const burdenPressure = round(signals.reduce((sum, item) => sum + item.burdenContribution, 0));
  const neutralPressure = round(signals.reduce((sum, item) => sum + item.neutralContribution, 0));
  const active = supportPressure + burdenPressure;
  const balanceScore = active < 0.03
    ? null
    : Math.round(clamp(50 + (((supportPressure - burdenPressure) / active) * 50), 0, 100));

  let level: CompatibilityIndividualTimingLevel = "unavailable";
  if (cycles.length > 0) {
    if (balanceScore === null) level = "neutral";
    else if (balanceScore >= 62) level = "supportive";
    else if (balanceScore <= 38) level = "burdensome";
    else level = "mixed";
  }

  const cycleCoverage = cycles.length / 2;
  const pressureCoverage = clamp(active + (neutralPressure * 0.25), 0, 1);
  const confidence = round(natalCompleteness * cycleCoverage * pressureCoverage);

  return {
    person: role,
    cycles: cycles.map(({ branchHangul: _branchHangul, ...cycle }) => cycle),
    balanceScore,
    level,
    confidence,
    supportPressure,
    burdenPressure,
    neutralPressure,
    signals,
  };
}

function natalPillars(input: CompatibilityPersonInput): Array<{
  position: CompatibilityPillarPosition;
  ganji: string;
  branchHangul: string;
}> {
  const values: Array<readonly [CompatibilityPillarPosition, string | null | undefined]> = [
    ["year", input.pillars.year],
    ["month", input.pillars.month],
    ["day", input.pillars.day],
    ["hour", input.pillars.hour],
  ];

  return values.flatMap(([position, raw]) => {
    if (!raw) return [];
    const chars = Array.from(raw.trim());
    const stem = STEM_TO_HANJA[chars[0] ?? ""];
    const branch = BRANCH_TO_HANJA[chars[1] ?? ""];
    const branchHangul = branch ? BRANCH_TO_HANGUL[branch] : "";
    if (chars.length !== 2 || !stem || !branch || !branchHangul) {
      throw new Error(`Invalid ${position} pillar for compatibility timing: ${raw}`);
    }
    return [{ position, ganji: `${stem}${branch}`, branchHangul }];
  });
}

function relationEvidence(
  input: Omit<CompatibilityTimingEvidence, "relation" | "tone" | "domains" | "id"> & {
    sourceBranchHangul: string;
    targetBranchHangul: string;
    idSuffix: string;
  },
): CompatibilityTimingEvidence[] {
  const evidence: CompatibilityTimingEvidence[] = [];

  for (const rule of RELATION_RULES) {
    if (!rule.matches(input.sourceBranchHangul, input.targetBranchHangul)) continue;

    evidence.push({
      id: [
        "compatibility",
        "timing",
        input.kind,
        input.sourcePerson,
        input.sourceCycle,
        input.sourceGanji,
        input.targetPerson,
        input.targetGanji,
        input.idSuffix,
        rule.relation,
      ].join(":"),
      kind: input.kind,
      relation: rule.relation,
      tone: rule.tone,
      strength: round(input.strength),
      domains: rule.domains,
      sourcePerson: input.sourcePerson,
      sourceCycle: input.sourceCycle,
      sourceGanji: input.sourceGanji,
      targetPerson: input.targetPerson,
      targetGanji: input.targetGanji,
      targetCycle: input.targetCycle,
      targetPosition: input.targetPosition,
    });
  }

  return evidence;
}

function collectCycleToPartnerNatal(
  sourceRole: CompatibilityPersonRole,
  sourceCycles: readonly ParsedCycle[],
  targetRole: CompatibilityPersonRole,
  targetInput: CompatibilityPersonInput,
): CompatibilityTimingEvidence[] {
  const evidence: CompatibilityTimingEvidence[] = [];
  const targets = natalPillars(targetInput);

  for (const cycle of sourceCycles) {
    for (const target of targets) {
      evidence.push(...relationEvidence({
        kind: "cycle_to_partner_natal",
        sourcePerson: sourceRole,
        sourceCycle: cycle.cycle,
        sourceGanji: cycle.ganji,
        targetPerson: targetRole,
        targetGanji: target.ganji,
        targetPosition: target.position,
        strength: CYCLE_WEIGHT[cycle.cycle] * PARTNER_POSITION_WEIGHT[target.position],
        sourceBranchHangul: cycle.branchHangul,
        targetBranchHangul: target.branchHangul,
        idSuffix: target.position,
      }));
    }
  }

  return evidence;
}

function collectCycleAlignment(
  aCycles: readonly ParsedCycle[],
  bCycles: readonly ParsedCycle[],
): CompatibilityTimingEvidence[] {
  const evidence: CompatibilityTimingEvidence[] = [];

  for (const cycleType of ["daeun", "seun"] as const) {
    const a = aCycles.find((item) => item.cycle === cycleType);
    const b = bCycles.find((item) => item.cycle === cycleType);
    if (!a || !b) continue;

    evidence.push(...relationEvidence({
      kind: "cycle_alignment",
      sourcePerson: "A",
      sourceCycle: cycleType,
      sourceGanji: a.ganji,
      targetPerson: "B",
      targetGanji: b.ganji,
      targetCycle: cycleType,
      strength: cycleType === "seun" ? 0.9 : 0.65,
      sourceBranchHangul: a.branchHangul,
      targetBranchHangul: b.branchHangul,
      idSuffix: cycleType,
    }));
  }

  return evidence;
}

function createPressure(): CompatibilityTimingPressure {
  return { support: 0, tension: 0, mixed: 0, context: 0, total: 0 };
}

function aggregateTimingDomain(
  domain: CompatibilityResultDomain,
  evidence: readonly CompatibilityTimingEvidence[],
  timingQuality: CompatibilityTimingDataQuality,
  natalCompleteness: number,
): CompatibilityTimingDomainResult {
  const pressure = createPressure();
  const evidenceIds: string[] = [];

  for (const item of evidence) {
    if (!item.domains.includes(domain)) continue;
    evidenceIds.push(item.id);
    pressure[item.tone] += item.strength;
  }

  pressure.support = round(pressure.support);
  pressure.tension = round(pressure.tension);
  pressure.mixed = round(pressure.mixed);
  pressure.context = round(pressure.context);
  pressure.total = round(pressure.support + pressure.tension + pressure.mixed + pressure.context);

  const active = pressure.support + pressure.tension + pressure.mixed;
  const score = active < 0.08
    ? null
    : Math.round(clamp(50 + (((pressure.support - pressure.tension) / active) * 50), 0, 100));

  let level: CompatibilityTimingDomainLevel = "insufficient_evidence";
  if (score !== null) {
    const mixedShare = active > 0 ? pressure.mixed / active : 0;
    const competing = pressure.support >= 0.1 && pressure.tension >= 0.1;
    if (mixedShare >= 0.45 || (competing && Math.abs(score - 50) <= 18)) {
      level = "mixed";
    } else if (score >= 68) {
      level = "supportive";
    } else if (score <= 32) {
      level = "adjustment_needed";
    } else {
      level = "steady";
    }
  }

  const coverage = clamp(pressure.total / 1.2, 0, 1);
  const confidence = round(natalCompleteness * timingQuality.score * coverage);

  return {
    domain,
    score,
    level,
    confidence,
    pressure,
    evidenceIds: [...new Set(evidenceIds)].sort(),
  };
}

function classifyPairTimingPattern(
  a: CompatibilityIndividualTimingResult,
  b: CompatibilityIndividualTimingResult,
): CompatibilityPairTimingPattern {
  if (a.level === "unavailable" || b.level === "unavailable") return "insufficient";
  if (a.level === "supportive" && b.level === "supportive") return "mutually_supported";
  if (a.level === "burdensome" && b.level === "burdensome") return "jointly_pressured";
  if (
    (a.level === "supportive" && b.level === "burdensome")
    || (a.level === "burdensome" && b.level === "supportive")
  ) {
    return "asymmetric";
  }
  return "mixed";
}

export function buildCompatibilityTiming(
  personA: CompatibilityPersonInput,
  personB: CompatibilityPersonInput,
  timing: CompatibilityTimingInput,
): CompatibilityTimingResult {
  if (!Number.isInteger(timing.evaluationYear) || timing.evaluationYear < 1) {
    throw new Error(`Invalid compatibility timing evaluation year: ${timing.evaluationYear}`);
  }

  const base = buildCompatibilityPersonalStructure(personA, personB);
  const aCycles = parseTimingCycles(timing.A);
  const bCycles = parseTimingCycles(timing.B);
  const timingDataQuality = calculateTimingDataQuality(aCycles, bCycles);

  const A = buildIndividualTiming("A", aCycles, base.people.A, base.dataQuality.score);
  const B = buildIndividualTiming("B", bCycles, base.people.B, base.dataQuality.score);

  const evidence = [
    ...collectCycleToPartnerNatal("A", aCycles, "B", personB),
    ...collectCycleToPartnerNatal("B", bCycles, "A", personA),
    ...collectCycleAlignment(aCycles, bCycles),
  ];

  const entries = COMPATIBILITY_RESULT_DOMAINS.map((domain) => [
    domain,
    aggregateTimingDomain(domain, evidence, timingDataQuality, base.dataQuality.score),
  ] as const);

  return {
    evaluationYear: timing.evaluationYear,
    base,
    timingDataQuality,
    individualTiming: { A, B },
    relationshipTimingDomains: Object.fromEntries(entries) as Record<
      CompatibilityResultDomain,
      CompatibilityTimingDomainResult
    >,
    pairTimingPattern: classifyPairTimingPattern(A, B),
    evidence,
  };
}
