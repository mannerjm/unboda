import { calculateSaju } from "@fullstackfamily/manseryeok";
import type { FreeAnalysisResponse } from "./buildFreeAnalysis";
import { branchElementMap, stemElementMap } from "./elements";
import {
  findBranchBreak,
  findBranchClash,
  findBranchCombination,
  findBranchHarm,
  findBranchPunishment,
} from "./fortuneRelations";
import type { getSaju } from "./manse";
import { getTenGod } from "./tenGod";

type SajuResult = ReturnType<typeof getSaju>;

/**
 * Deterministic values the V4 evidence resolver may quote. Everything here is
 * computed by the saju engine; the model never writes into this shape.
 */
export type PaidAnalysisEvidenceFacts = {
  strength?: {
    level: string;
    dayElement: string;
    supportScore: number;
    opposingScore: number;
  };

  yongshin?: {
    primary: string;
    secondary: string[];
  };

  gyeokguk?: {
    primary: string;
    candidates: string[];
  };

  elementBalance?: {
    strongest: string[];
    weakest: string[];
    percentages: { element: string; percentage: number }[];
  };

  fortuneFlow?: {
    currentFlow: string;
    opportunityScore: number;
    cautionScore: number;
    yongshinLevel: string;
    daeunFlow: string;
    seunFlow: string;
    relations: { pair: string; category: string; type: string }[];
  };

  daeun?: {
    order: number;
    ganji: string;
    startAge: number;
    direction: string;
  };

  seun?: {
    year: number;
    age: number;
    ganji: string;
  };

  elementRelations?: {
    items: {
      source: string;
      target: string;
      type: string;
      strength: string;
    }[];
  };

  fortuneBrain?: {
    structure: string;
    strengths: string[];
    weaknesses: string[];
  };

  /**
   * Calendar-month context backed by the same solar-term calendar library used
   * by the natal chart. A civil month can straddle two solar-term month pillars,
   * so start/middle/end are preserved instead of pretending there is one exact
   * pillar for every day in the month.
   */
  monthlyCycle?: {
    year: number;
    month: number;
    startPillar: string;
    representativePillar: string;
    endPillar: string;
    stemTenGod: string;
    stemElement: string;
    branchElement: string;
    relations: {
      target: "year" | "month" | "day" | "hour";
      type: "합" | "충" | "형" | "파" | "해";
    }[];
  };
};

const MONTHLY_BRANCH_HANGUL: Record<string, string> = {
  子: "자",
  丑: "축",
  寅: "인",
  卯: "묘",
  辰: "진",
  巳: "사",
  午: "오",
  未: "미",
  申: "신",
  酉: "유",
  戌: "술",
  亥: "해",
};

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function monthPillarAt(year: number, month: number, day: number): string {
  return calculateSaju(year, month, day, 12, 0).monthPillarHanja;
}

function getMonthlyBranchRelation(
  natalBranch: string,
  monthlyBranch: string,
): "합" | "충" | "형" | "파" | "해" | null {
  const natal = MONTHLY_BRANCH_HANGUL[natalBranch];
  const current = MONTHLY_BRANCH_HANGUL[monthlyBranch];

  if (!natal || !current) return null;
  if (findBranchClash(natal, current)) return "충";
  if (findBranchCombination(natal, current)) return "합";
  if (findBranchPunishment(natal, current)) return "형";
  if (findBranchBreak(natal, current)) return "파";
  if (findBranchHarm(natal, current)) return "해";
  return null;
}

function buildMonthlyCycleFacts(saju: SajuResult): PaidAnalysisEvidenceFacts["monthlyCycle"] {
  const context = saju.evaluationContext;
  if (!context) return undefined;

  const { evaluationYear: year, evaluationMonth: month } = context;
  const startPillar = monthPillarAt(year, month, 1);
  const representativePillar = monthPillarAt(year, month, 15);
  const endPillar = monthPillarAt(year, month, lastDayOfMonth(year, month));
  const monthlyStem = representativePillar[0];
  const monthlyBranch = representativePillar[1];

  if (!monthlyStem || !monthlyBranch) return undefined;

  const relations = (
    [
      ["year", saju.yearBranch],
      ["month", saju.monthBranch],
      ["day", saju.dayBranch],
      ["hour", saju.birthTimeKnown === false ? "" : saju.hourBranch],
    ] as const
  ).flatMap(([target, natalBranch]) => {
    const type = getMonthlyBranchRelation(natalBranch, monthlyBranch);
    return type ? [{ target, type }] : [];
  });

  return {
    year,
    month,
    startPillar,
    representativePillar,
    endPillar,
    stemTenGod: getTenGod(saju.dayStem, monthlyStem),
    stemElement: stemElementMap[monthlyStem] ?? "",
    branchElement: branchElementMap[monthlyBranch] ?? "",
    relations,
  };
}

/** Keeps prompt input and resolver payload small; relations are long-tailed. */
const MAX_RELATION_ITEMS = 4;
const MAX_BRAIN_ITEMS = 3;

function toPercentageList(
  percentages: Record<string, number> | undefined,
): { element: string; percentage: number }[] {
  if (!percentages) {
    return [];
  }

  return Object.entries(percentages)
    .map(([element, percentage]) => ({ element, percentage }))
    .sort((left, right) => right.percentage - left.percentage);
}

export function buildPaidAnalysisEvidenceFacts(input: {
  saju: SajuResult;
  freeAnalysis: FreeAnalysisResponse;
}): PaidAnalysisEvidenceFacts {
  const { saju, freeAnalysis } = input;

  const strengthAnalysis = freeAnalysis.strengthAnalysis;
  const yongshinAnalysis = freeAnalysis.yongshinAnalysis;
  const gyeokgukAnalysis = freeAnalysis.gyeokgukAnalysis;
  const elementAnalysis = freeAnalysis.elementAnalysis;
  // FreeAnalysisResponse narrows this to the summary fields; the scores live on saju.
  const fortuneFlow = saju.fortuneFlowAnalysis;
  const daeunAnalysis = freeAnalysis.daeunAnalysis;
  const currentDaeun = freeAnalysis.currentDaeun;
  const currentSeun = freeAnalysis.currentSeun;

  const facts: PaidAnalysisEvidenceFacts = {};

  if (strengthAnalysis) {
    facts.strength = {
      level: strengthAnalysis.level,
      dayElement: strengthAnalysis.dayElement,
      supportScore: strengthAnalysis.supportScore,
      opposingScore: strengthAnalysis.opposingScore,
    };
  }

  if (yongshinAnalysis) {
    facts.yongshin = {
      primary: yongshinAnalysis.primary,
      secondary: [...yongshinAnalysis.secondary],
    };
  }

  if (gyeokgukAnalysis) {
    facts.gyeokguk = {
      primary: gyeokgukAnalysis.primary,
      candidates: [...gyeokgukAnalysis.candidates],
    };
  }

  if (elementAnalysis) {
    facts.elementBalance = {
      strongest: [...elementAnalysis.strongest],
      weakest: [...elementAnalysis.weakest],
      percentages: toPercentageList(elementAnalysis.percentages),
    };
  }

  if (fortuneFlow) {
    facts.fortuneFlow = {
      currentFlow: fortuneFlow.currentFlow,
      opportunityScore: fortuneFlow.opportunityScore,
      cautionScore: fortuneFlow.cautionScore,
      yongshinLevel: fortuneFlow.yongshinFlow.level,
      daeunFlow: fortuneFlow.daeunFlow,
      seunFlow: fortuneFlow.seunFlow,
      relations: fortuneFlow.relations
        .slice(0, MAX_RELATION_ITEMS)
        .map((relation) => ({
          pair: `${relation.sourceGanji}-${relation.targetGanji}`,
          category: relation.category,
          type: relation.type,
        })),
    };
  }

  if (currentDaeun && daeunAnalysis) {
    facts.daeun = {
      order: currentDaeun.order,
      ganji: currentDaeun.ganji,
      startAge: daeunAnalysis.startAge,
      direction: daeunAnalysis.direction,
    };
  }

  if (currentSeun) {
    facts.seun = {
      year: currentSeun.year,
      age: currentSeun.age,
      ganji: currentSeun.ganji,
    };
  }

  // Not part of FreeAnalysisResponse; read straight from the saju engine result.
  const elementRelations = saju.elementRelations;

  if (elementRelations) {
    const ranked =
      elementRelations.highlights.length > 0
        ? elementRelations.highlights
        : elementRelations.relations;

    facts.elementRelations = {
      items: ranked.slice(0, MAX_RELATION_ITEMS).map((item) => ({
        source: item.source,
        target: item.target,
        type: item.type,
        strength: item.strength,
      })),
    };
  }

  const fortuneBrain = saju.fortuneBrain;

  if (fortuneBrain) {
    facts.fortuneBrain = {
      structure: fortuneBrain.structure,
      strengths: fortuneBrain.strengths.slice(0, MAX_BRAIN_ITEMS),
      weaknesses: fortuneBrain.weaknesses.slice(0, MAX_BRAIN_ITEMS),
    };
  }

  const monthlyCycle = buildMonthlyCycleFacts(saju);
  if (monthlyCycle) {
    facts.monthlyCycle = monthlyCycle;
  }

  return facts;
}
