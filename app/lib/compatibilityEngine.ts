import { stemElementMap, type Element } from "./elements";
import { getTenGod } from "./tenGod";

export type CompatibilityPersonRole = "A" | "B";
export type CompatibilityPillarPosition = "year" | "month" | "day" | "hour";
export type CompatibilityComponent = "stem" | "branch";
export type CompatibilityEvidenceTone = "support" | "tension" | "mixed" | "context";
export type CompatibilityDomain =
  | "foundation"
  | "communication"
  | "conflict"
  | "recovery"
  | "intimacy"
  | "long_term"
  | "change";

export type CompatibilityPillars = {
  year: string;
  month: string;
  day: string;
  hour?: string | null;
};

export type CompatibilityPersonInput = {
  pillars: CompatibilityPillars;
};

export type CompatibilityEvidenceParticipant = {
  person: CompatibilityPersonRole;
  position: CompatibilityPillarPosition;
  component: CompatibilityComponent;
  value: string;
};

export type CompatibilityEvidenceKind =
  | "day_stem_element"
  | "stem_combination"
  | "branch_combination"
  | "branch_clash"
  | "branch_punishment"
  | "branch_harm"
  | "branch_break"
  | "branch_triple_harmony"
  | "cross_ten_god";

export type CompatibilityEvidence = {
  id: string;
  kind: CompatibilityEvidenceKind;
  relation: string;
  tone: CompatibilityEvidenceTone;
  strength: number;
  domains: readonly CompatibilityDomain[];
  participants: readonly CompatibilityEvidenceParticipant[];
  metadata?: Readonly<Record<string, string | number | boolean | readonly string[]>>;
};

export type CompatibilityDataQuality = {
  score: number;
  level: "full" | "standard";
  missing: readonly string[];
};

export type CompatibilityFoundation = {
  dataQuality: CompatibilityDataQuality;
  evidence: readonly CompatibilityEvidence[];
};

type ParsedPillar = {
  position: CompatibilityPillarPosition;
  ganji: string;
  stem: string;
  branch: string;
};

type ParsedPerson = {
  role: CompatibilityPersonRole;
  pillars: readonly ParsedPillar[];
};

type DirectionalElementRelation =
  | "same"
  | "generate"
  | "generated_by"
  | "control"
  | "controlled_by";

const BRANCHES = new Set(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);

const ELEMENT_GENERATES: Record<Element, Element> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

const ELEMENT_CONTROLS: Record<Element, Element> = {
  목: "토",
  화: "금",
  토: "수",
  금: "목",
  수: "화",
};

export const COMPATIBILITY_POSITION_PAIR_WEIGHT: Readonly<Record<string, number>> = {
  "day:day": 1,
  "month:month": 0.75,
  "day:month": 0.7,
  "month:day": 0.7,
  "day:hour": 0.6,
  "hour:day": 0.6,
  "hour:hour": 0.55,
  "day:year": 0.5,
  "year:day": 0.5,
  "month:hour": 0.5,
  "hour:month": 0.5,
  "year:year": 0.4,
  "month:year": 0.4,
  "year:month": 0.4,
  "year:hour": 0.35,
  "hour:year": 0.35,
};

const TARGET_STEM_WEIGHT: Readonly<Record<CompatibilityPillarPosition, number>> = {
  day: 1,
  month: 0.75,
  hour: 0.55,
  year: 0.4,
};

const STEM_COMBINATIONS = [
  ["甲", "己"],
  ["乙", "庚"],
  ["丙", "辛"],
  ["丁", "壬"],
  ["戊", "癸"],
] as const;

const BRANCH_COMBINATIONS = [
  ["子", "丑"],
  ["寅", "亥"],
  ["卯", "戌"],
  ["辰", "酉"],
  ["巳", "申"],
  ["午", "未"],
] as const;

const BRANCH_CLASHES = [
  ["子", "午"],
  ["丑", "未"],
  ["寅", "申"],
  ["卯", "酉"],
  ["辰", "戌"],
  ["巳", "亥"],
] as const;

const BRANCH_HARMS = [
  ["子", "未"],
  ["丑", "午"],
  ["寅", "巳"],
  ["卯", "辰"],
  ["申", "亥"],
  ["酉", "戌"],
] as const;

const BRANCH_BREAKS = [
  ["子", "酉"],
  ["卯", "午"],
  ["辰", "丑"],
  ["戌", "未"],
  ["寅", "亥"],
  ["巳", "申"],
] as const;

const BRANCH_MUTUAL_PUNISHMENTS = [
  ["寅", "巳"],
  ["巳", "申"],
  ["申", "寅"],
  ["丑", "戌"],
  ["戌", "未"],
  ["未", "丑"],
  ["子", "卯"],
] as const;

const BRANCH_SELF_PUNISHMENTS = new Set(["辰", "午", "酉", "亥"]);

const BRANCH_TRIPLE_HARMONIES = [
  { branches: ["申", "子", "辰"] as const, element: "수" as const },
  { branches: ["亥", "卯", "未"] as const, element: "목" as const },
  { branches: ["寅", "午", "戌"] as const, element: "화" as const },
  { branches: ["巳", "酉", "丑"] as const, element: "금" as const },
] as const;

const PAIR_RELATION_RULES: ReadonlyArray<{
  kind: CompatibilityEvidenceKind;
  relation: string;
  tone: CompatibilityEvidenceTone;
  domains: readonly CompatibilityDomain[];
  pairs: readonly (readonly [string, string])[];
}> = [
  {
    kind: "branch_combination",
    relation: "육합",
    tone: "support",
    domains: ["foundation", "intimacy", "recovery", "long_term"],
    pairs: BRANCH_COMBINATIONS,
  },
  {
    kind: "branch_clash",
    relation: "충",
    tone: "mixed",
    domains: ["communication", "conflict", "change"],
    pairs: BRANCH_CLASHES,
  },
  {
    kind: "branch_punishment",
    relation: "형",
    tone: "tension",
    domains: ["conflict", "long_term"],
    pairs: BRANCH_MUTUAL_PUNISHMENTS,
  },
  {
    kind: "branch_harm",
    relation: "해",
    tone: "tension",
    domains: ["communication", "conflict"],
    pairs: BRANCH_HARMS,
  },
  {
    kind: "branch_break",
    relation: "파",
    tone: "mixed",
    domains: ["recovery", "long_term", "change"],
    pairs: BRANCH_BREAKS,
  },
];

function pairMatches(left: string, right: string, pair: readonly [string, string]): boolean {
  return (left === pair[0] && right === pair[1]) || (left === pair[1] && right === pair[0]);
}

function parsePillar(position: CompatibilityPillarPosition, ganji: string | null | undefined): ParsedPillar | null {
  if (!ganji) return null;

  const chars = Array.from(ganji.trim());
  const stem = chars[0];
  const branch = chars[1];

  if (!stem || !branch || !stemElementMap[stem] || !BRANCHES.has(branch)) {
    throw new Error(`Invalid ${position} pillar: ${ganji}`);
  }

  return { position, ganji: `${stem}${branch}`, stem, branch };
}

function parsePerson(role: CompatibilityPersonRole, input: CompatibilityPersonInput): ParsedPerson {
  const year = parsePillar("year", input.pillars.year);
  const month = parsePillar("month", input.pillars.month);
  const day = parsePillar("day", input.pillars.day);
  const hour = parsePillar("hour", input.pillars.hour);

  if (!year || !month || !day) {
    throw new Error(`${role} requires year, month, and day pillars`);
  }

  return {
    role,
    pillars: [year, month, day, ...(hour ? [hour] : [])],
  };
}

function getPillar(person: ParsedPerson, position: CompatibilityPillarPosition): ParsedPillar | undefined {
  return person.pillars.find((pillar) => pillar.position === position);
}

function getPairWeight(left: CompatibilityPillarPosition, right: CompatibilityPillarPosition): number {
  return COMPATIBILITY_POSITION_PAIR_WEIGHT[`${left}:${right}`] ?? 0.35;
}

function getDirectionalElementRelation(from: Element, to: Element): DirectionalElementRelation {
  if (from === to) return "same";
  if (ELEMENT_GENERATES[from] === to) return "generate";
  if (ELEMENT_GENERATES[to] === from) return "generated_by";
  if (ELEMENT_CONTROLS[from] === to) return "control";
  return "controlled_by";
}

function participant(
  person: CompatibilityPersonRole,
  pillar: ParsedPillar,
  component: CompatibilityComponent,
): CompatibilityEvidenceParticipant {
  return {
    person,
    position: pillar.position,
    component,
    value: component === "stem" ? pillar.stem : pillar.branch,
  };
}

function evidenceId(
  kind: CompatibilityEvidenceKind,
  participants: readonly CompatibilityEvidenceParticipant[],
  suffix?: string,
): string {
  const participantKey = participants
    .map((item) => `${item.person}.${item.position}.${item.component}.${item.value}`)
    .join("__");
  return ["compatibility", kind, participantKey, suffix].filter(Boolean).join(":");
}

function collectDayStemElementEvidence(a: ParsedPerson, b: ParsedPerson): CompatibilityEvidence[] {
  const aDay = getPillar(a, "day");
  const bDay = getPillar(b, "day");
  if (!aDay || !bDay) return [];

  const aElement = stemElementMap[aDay.stem];
  const bElement = stemElementMap[bDay.stem];
  const participants = [participant("A", aDay, "stem"), participant("B", bDay, "stem")] as const;

  const makeDirectional = (
    from: CompatibilityPersonRole,
    relation: DirectionalElementRelation,
    reverse: DirectionalElementRelation,
  ): CompatibilityEvidence => ({
    id: evidenceId("day_stem_element", participants, from),
    kind: "day_stem_element",
    relation,
    tone: relation === "control" || relation === "controlled_by" ? "mixed" : "context",
    strength: 1,
    domains: ["foundation", "communication", "intimacy"],
    participants,
    metadata: {
      direction: `${from}->${from === "A" ? "B" : "A"}`,
      fromElement: from === "A" ? aElement : bElement,
      toElement: from === "A" ? bElement : aElement,
      reverseRelation: reverse,
    },
  });

  const aToB = getDirectionalElementRelation(aElement, bElement);
  const bToA = getDirectionalElementRelation(bElement, aElement);

  return [makeDirectional("A", aToB, bToA), makeDirectional("B", bToA, aToB)];
}

function collectStemCombinationEvidence(a: ParsedPerson, b: ParsedPerson): CompatibilityEvidence[] {
  const evidence: CompatibilityEvidence[] = [];

  for (const aPillar of a.pillars) {
    for (const bPillar of b.pillars) {
      if (!STEM_COMBINATIONS.some((pair) => pairMatches(aPillar.stem, bPillar.stem, pair))) continue;

      const participants = [participant("A", aPillar, "stem"), participant("B", bPillar, "stem")] as const;
      evidence.push({
        id: evidenceId("stem_combination", participants),
        kind: "stem_combination",
        relation: "천간합",
        tone: "support",
        strength: getPairWeight(aPillar.position, bPillar.position),
        domains: ["foundation", "communication", "intimacy"],
        participants,
      });
    }
  }

  return evidence;
}

function collectBranchPairEvidence(a: ParsedPerson, b: ParsedPerson): CompatibilityEvidence[] {
  const evidence: CompatibilityEvidence[] = [];

  for (const aPillar of a.pillars) {
    for (const bPillar of b.pillars) {
      const participants = [participant("A", aPillar, "branch"), participant("B", bPillar, "branch")] as const;
      const strength = getPairWeight(aPillar.position, bPillar.position);

      for (const rule of PAIR_RELATION_RULES) {
        if (!rule.pairs.some((pair) => pairMatches(aPillar.branch, bPillar.branch, pair))) continue;

        evidence.push({
          id: evidenceId(rule.kind, participants),
          kind: rule.kind,
          relation: rule.relation,
          tone: rule.tone,
          strength,
          domains: rule.domains,
          participants,
        });
      }

      if (aPillar.branch === bPillar.branch && BRANCH_SELF_PUNISHMENTS.has(aPillar.branch)) {
        evidence.push({
          id: evidenceId("branch_punishment", participants, "self"),
          kind: "branch_punishment",
          relation: "자형",
          tone: "tension",
          strength,
          domains: ["conflict", "long_term"],
          participants,
          metadata: { selfPunishment: true },
        });
      }
    }
  }

  return evidence;
}

function collectTripleHarmonyEvidence(a: ParsedPerson, b: ParsedPerson): CompatibilityEvidence[] {
  const evidence: CompatibilityEvidence[] = [];

  for (const harmony of BRANCH_TRIPLE_HARMONIES) {
    const contributors: CompatibilityEvidenceParticipant[] = [];

    for (const branch of harmony.branches) {
      const aPillar = a.pillars.find((pillar) => pillar.branch === branch);
      const bPillar = b.pillars.find((pillar) => pillar.branch === branch);
      const chosen = aPillar
        ? participant("A", aPillar, "branch")
        : bPillar
          ? participant("B", bPillar, "branch")
          : null;
      if (chosen) contributors.push(chosen);
    }

    if (contributors.length !== 3) continue;
    if (!contributors.some((item) => item.person === "A") || !contributors.some((item) => item.person === "B")) continue;

    evidence.push({
      id: evidenceId("branch_triple_harmony", contributors, harmony.element),
      kind: "branch_triple_harmony",
      relation: "삼합완성",
      tone: "support",
      strength: 0.8,
      domains: ["foundation", "recovery", "long_term"],
      participants: contributors,
      metadata: {
        element: harmony.element,
        branches: harmony.branches,
      },
    });
  }

  return evidence;
}

function collectCrossTenGodEvidence(observer: ParsedPerson, target: ParsedPerson): CompatibilityEvidence[] {
  const observerDay = getPillar(observer, "day");
  if (!observerDay) return [];

  return target.pillars.flatMap((targetPillar) => {
    const tenGod = getTenGod(observerDay.stem, targetPillar.stem);
    if (!tenGod) return [];

    const participants = [
      participant(observer.role, observerDay, "stem"),
      participant(target.role, targetPillar, "stem"),
    ] as const;

    return [{
      id: evidenceId("cross_ten_god", participants, observer.role),
      kind: "cross_ten_god" as const,
      relation: tenGod,
      tone: "context" as const,
      strength: TARGET_STEM_WEIGHT[targetPillar.position],
      domains: ["foundation", "communication", "intimacy", "long_term"] as const,
      participants,
      metadata: {
        observer: observer.role,
        target: target.role,
      },
    }];
  });
}

function calculateDataQuality(a: ParsedPerson, b: ParsedPerson): CompatibilityDataQuality {
  const missing: string[] = [];
  if (!getPillar(a, "hour")) missing.push("A.hour");
  if (!getPillar(b, "hour")) missing.push("B.hour");

  const presentSlots = 8 - missing.length;
  const score = Number((presentSlots / 8).toFixed(3));

  return {
    score,
    level: missing.length === 0 ? "full" : "standard",
    missing,
  };
}

export function buildCompatibilityFoundation(
  personA: CompatibilityPersonInput,
  personB: CompatibilityPersonInput,
): CompatibilityFoundation {
  const a = parsePerson("A", personA);
  const b = parsePerson("B", personB);

  const evidence = [
    ...collectDayStemElementEvidence(a, b),
    ...collectStemCombinationEvidence(a, b),
    ...collectBranchPairEvidence(a, b),
    ...collectTripleHarmonyEvidence(a, b),
    ...collectCrossTenGodEvidence(a, b),
    ...collectCrossTenGodEvidence(b, a),
  ];

  return {
    dataQuality: calculateDataQuality(a, b),
    evidence,
  };
}
