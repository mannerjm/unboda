import type { FreeAnalysisResponse } from "./buildFreeAnalysis";
import type { getSaju } from "./manse";

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
};

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

  return facts;
}
