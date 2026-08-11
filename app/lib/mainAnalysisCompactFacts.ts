import type { getSaju } from "./manse";
import type { FreeAnalysisResponse } from "./buildFreeAnalysis";

type SajuData = ReturnType<typeof getSaju>;

export type MainAnalysisCompactFacts = {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  strengthLevel: string;
  strengthSummary: string;
  strengthDetail: string;
  elementSummary: string;
  elementPercentages: string[];
  elementBalance: string;
  yongshinPrimary: string;
  yongshinSecondary: string[];
  yongshinReason: string;
  yongshinDetail: string;
  gyeokgukPrimary: string;
  gyeokgukCandidates: string[];
  gyeokgukReason: string;
  gyeokgukDetail: string;
  currentDaeun: string;
  currentSeun: string;
  currentFlowContext: string;
  activeRelations: string[];
  relations: string[];
  fortuneFlowSummary: string;
  opportunities: string[];
  cautions: string[];
  topicGuides: {
    career: string;
    wealth: string;
    relationship: string;
    health: string;
  };
};

export function buildMainAnalysisCompactFacts(input: {
  saju: SajuData;
  freeAnalysis: FreeAnalysisResponse;
}): MainAnalysisCompactFacts {
  return {
    yearPillar: input.saju.yearPillar,
    monthPillar: input.saju.monthPillar,
    dayPillar: input.saju.dayPillar,
    hourPillar: input.saju.hourPillar,
    strengthLevel: input.freeAnalysis.strengthLevel,
    strengthSummary: input.freeAnalysis.strengthSummary,
    strengthDetail: input.freeAnalysis.strengthDetail,
    elementSummary: input.freeAnalysis.elementSummary,
    elementPercentages: input.freeAnalysis.elementPercentages,
    elementBalance: input.freeAnalysis.elementBalance,
    yongshinPrimary: input.freeAnalysis.yongshinPrimary,
    yongshinSecondary: input.freeAnalysis.yongshinSecondary,
    yongshinReason: input.freeAnalysis.yongshinReason,
    yongshinDetail: input.freeAnalysis.yongshinDetail,
    gyeokgukPrimary: input.freeAnalysis.gyeokgukPrimary,
    gyeokgukCandidates: input.freeAnalysis.gyeokgukCandidates,
    gyeokgukReason: input.freeAnalysis.gyeokgukReason,
    gyeokgukDetail: input.freeAnalysis.gyeokgukDetail,
    currentDaeun: input.freeAnalysis.currentDaeun,
    currentSeun: input.freeAnalysis.currentSeun,
    currentFlowContext: input.freeAnalysis.currentFlowContext,
    activeRelations: input.freeAnalysis.activeRelations,
    relations: input.freeAnalysis.relations,
    fortuneFlowSummary: input.freeAnalysis.fortuneFlowSummary,
    opportunities: input.freeAnalysis.opportunities,
    cautions: input.freeAnalysis.cautions,
    topicGuides: input.freeAnalysis.topicGuides,
  };
}
