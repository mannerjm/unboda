import {
  buildCompatibilityFoundation,
  type CompatibilityDataQuality,
  type CompatibilityEvidence,
  type CompatibilityEvidenceKind,
  type CompatibilityFoundation,
  type CompatibilityPersonInput,
} from "./compatibilityEngine";

export const COMPATIBILITY_RESULT_DOMAINS = [
  "communication",
  "conflict",
  "recovery",
  "intimacy",
  "long_term",
] as const;

export type CompatibilityResultDomain = (typeof COMPATIBILITY_RESULT_DOMAINS)[number];

export type CompatibilityDomainLevel =
  | "supportive"
  | "steady"
  | "mixed"
  | "adjustment_needed"
  | "insufficient_evidence";

export type CompatibilityPressure = {
  support: number;
  tension: number;
  mixed: number;
  context: number;
  total: number;
};

export type CompatibilityDomainSignal = {
  evidenceId: string;
  kind: CompatibilityEvidenceKind;
  relation: string;
  tone: CompatibilityEvidence["tone"];
  contribution: number;
  strength: number;
};

export type CompatibilityDomainResult = {
  domain: CompatibilityResultDomain;
  score: number | null;
  level: CompatibilityDomainLevel;
  confidence: number;
  pressure: CompatibilityPressure;
  evidenceIds: readonly string[];
  leadingSupport: readonly CompatibilityDomainSignal[];
  leadingTension: readonly CompatibilityDomainSignal[];
  leadingMixed: readonly CompatibilityDomainSignal[];
  leadingContext: readonly CompatibilityDomainSignal[];
};

export type CompatibilityDomainAggregation = {
  dataQuality: CompatibilityDataQuality;
  domains: Readonly<Record<CompatibilityResultDomain, CompatibilityDomainResult>>;
};

type DomainWeightTable = Readonly<Partial<Record<CompatibilityResultDomain, number>>>;

const EVIDENCE_DOMAIN_WEIGHT: Readonly<Record<CompatibilityEvidenceKind, DomainWeightTable>> = {
  day_stem_element: {
    communication: 0.45,
    intimacy: 0.4,
  },
  stem_combination: {
    communication: 0.8,
    intimacy: 0.75,
  },
  branch_combination: {
    recovery: 0.85,
    intimacy: 1,
    long_term: 0.8,
  },
  branch_clash: {
    communication: 0.8,
    conflict: 1,
  },
  branch_punishment: {
    conflict: 1,
    long_term: 0.85,
  },
  branch_harm: {
    communication: 0.9,
    conflict: 0.8,
  },
  branch_break: {
    recovery: 0.85,
    long_term: 0.75,
  },
  branch_triple_harmony: {
    recovery: 0.9,
    long_term: 0.95,
  },
  cross_ten_god: {
    communication: 0.45,
    intimacy: 0.45,
    long_term: 0.4,
  },
};

const SCORE_EVIDENCE_MINIMUM = 0.15;
const MIXED_SHARE_THRESHOLD = 0.45;
const CONFLICTING_SIDE_THRESHOLD = 0.15;
const CONFIDENCE_FULL_WEIGHT = 1.2;
const TOP_SIGNAL_LIMIT = 3;

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function createPressure(): CompatibilityPressure {
  return {
    support: 0,
    tension: 0,
    mixed: 0,
    context: 0,
    total: 0,
  };
}

function contributionFor(
  evidence: CompatibilityEvidence,
  domain: CompatibilityResultDomain,
): number {
  if (!evidence.domains.includes(domain)) return 0;

  const kindWeight = EVIDENCE_DOMAIN_WEIGHT[evidence.kind][domain] ?? 0;
  if (kindWeight <= 0) return 0;

  return round(evidence.strength * kindWeight);
}

function toSignal(
  evidence: CompatibilityEvidence,
  contribution: number,
): CompatibilityDomainSignal {
  return {
    evidenceId: evidence.id,
    kind: evidence.kind,
    relation: evidence.relation,
    tone: evidence.tone,
    contribution,
    strength: evidence.strength,
  };
}

function sortSignals(signals: CompatibilityDomainSignal[]): CompatibilityDomainSignal[] {
  return [...signals].sort((left, right) => {
    if (right.contribution !== left.contribution) {
      return right.contribution - left.contribution;
    }
    return left.evidenceId.localeCompare(right.evidenceId);
  });
}

function classifyDomainLevel(
  score: number | null,
  pressure: CompatibilityPressure,
): CompatibilityDomainLevel {
  if (score === null) return "insufficient_evidence";

  const active = pressure.support + pressure.tension + pressure.mixed;
  const mixedShare = active > 0 ? pressure.mixed / active : 0;
  const hasCompetingSides = pressure.support >= CONFLICTING_SIDE_THRESHOLD
    && pressure.tension >= CONFLICTING_SIDE_THRESHOLD;

  if (
    mixedShare >= MIXED_SHARE_THRESHOLD
    || (hasCompetingSides && Math.abs(score - 50) <= 18)
  ) {
    return "mixed";
  }

  if (score >= 68) return "supportive";
  if (score <= 32) return "adjustment_needed";
  return "steady";
}

function calculateScore(pressure: CompatibilityPressure): number | null {
  const active = pressure.support + pressure.tension + pressure.mixed;
  if (active < SCORE_EVIDENCE_MINIMUM) return null;

  const balance = (pressure.support - pressure.tension) / active;
  return Math.round(clamp(50 + (balance * 50), 0, 100));
}

function calculateConfidence(
  pressure: CompatibilityPressure,
  dataQuality: CompatibilityDataQuality,
): number {
  if (pressure.total <= 0) return 0;

  const coverage = clamp(pressure.total / CONFIDENCE_FULL_WEIGHT, 0, 1);
  return round(dataQuality.score * coverage);
}

function aggregateDomain(
  domain: CompatibilityResultDomain,
  evidence: readonly CompatibilityEvidence[],
  dataQuality: CompatibilityDataQuality,
): CompatibilityDomainResult {
  const pressure = createPressure();
  const support: CompatibilityDomainSignal[] = [];
  const tension: CompatibilityDomainSignal[] = [];
  const mixed: CompatibilityDomainSignal[] = [];
  const context: CompatibilityDomainSignal[] = [];
  const evidenceIds: string[] = [];

  for (const item of evidence) {
    const contribution = contributionFor(item, domain);
    if (contribution <= 0) continue;

    evidenceIds.push(item.id);
    const signal = toSignal(item, contribution);

    if (item.tone === "support") {
      pressure.support += contribution;
      support.push(signal);
    } else if (item.tone === "tension") {
      pressure.tension += contribution;
      tension.push(signal);
    } else if (item.tone === "mixed") {
      pressure.mixed += contribution;
      mixed.push(signal);
    } else {
      pressure.context += contribution;
      context.push(signal);
    }
  }

  pressure.support = round(pressure.support);
  pressure.tension = round(pressure.tension);
  pressure.mixed = round(pressure.mixed);
  pressure.context = round(pressure.context);
  pressure.total = round(
    pressure.support + pressure.tension + pressure.mixed + pressure.context,
  );

  const score = calculateScore(pressure);

  return {
    domain,
    score,
    level: classifyDomainLevel(score, pressure),
    confidence: calculateConfidence(pressure, dataQuality),
    pressure,
    evidenceIds: [...new Set(evidenceIds)].sort(),
    leadingSupport: sortSignals(support).slice(0, TOP_SIGNAL_LIMIT),
    leadingTension: sortSignals(tension).slice(0, TOP_SIGNAL_LIMIT),
    leadingMixed: sortSignals(mixed).slice(0, TOP_SIGNAL_LIMIT),
    leadingContext: sortSignals(context).slice(0, TOP_SIGNAL_LIMIT),
  };
}

export function aggregateCompatibilityDomains(
  foundation: CompatibilityFoundation,
): CompatibilityDomainAggregation {
  const entries = COMPATIBILITY_RESULT_DOMAINS.map((domain) => [
    domain,
    aggregateDomain(domain, foundation.evidence, foundation.dataQuality),
  ] as const);

  return {
    dataQuality: foundation.dataQuality,
    domains: Object.fromEntries(entries) as Record<CompatibilityResultDomain, CompatibilityDomainResult>,
  };
}

export function buildCompatibilityDomains(
  personA: CompatibilityPersonInput,
  personB: CompatibilityPersonInput,
): CompatibilityDomainAggregation {
  return aggregateCompatibilityDomains(buildCompatibilityFoundation(personA, personB));
}
