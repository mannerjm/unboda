import type { getSaju } from "./manse";
import type { FreeAnalysisResponse } from "./buildFreeAnalysis";

type SajuData = ReturnType<typeof getSaju>;

function toCompactString(value: string | null | undefined): string {
  if (typeof value !== "string") {
    return "정보 없음";
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "정보 없음";
}

function toStringArray(
  values: ReadonlyArray<string | null | undefined> | null | undefined,
): string[] {
  return (
    values?.filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    ) ?? []
  );
}

function formatElementPercentages(
  percentages: Record<string, number> | undefined,
): string[] {
  const orderedElements = ["목", "화", "토", "금", "수"] as const;

  return orderedElements
    .filter((element) => typeof percentages?.[element] === "number")
    .map((element) => `${element} ${percentages?.[element]}%`);
}

function formatDaeunSummary(
  item: { ganji?: string; analysis?: { stemElement?: string; branchElement?: string } } | null | undefined,
): string {
  const ganji = item?.ganji?.trim();

  if (!ganji) {
    return "대운 정보 없음";
  }

  const suffixParts = [item?.analysis?.stemElement, item?.analysis?.branchElement].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

  return suffixParts.length > 0
    ? `${ganji} (${suffixParts.join("/")})`
    : ganji;
}

function formatSeunSummary(
  item: { ganji?: string } | null | undefined,
): string {
  const ganji = item?.ganji?.trim();
  return ganji ? ganji : "세운 정보 없음";
}

type FortuneFlowRelationLike = {
  description?: string | null;
};

type FortuneFlowAnalysisWithRelations = {
  relations?: readonly FortuneFlowRelationLike[] | null;
  summary?: string | null;
  opportunities?: readonly string[] | null;
  cautions?: readonly string[] | null;
  topicGuides?: {
    career?: string | null;
    wealth?: string | null;
    relationship?: string | null;
    health?: string | null;
  } | null;
};

function hasRelations(
  value: unknown,
): value is FortuneFlowAnalysisWithRelations {
  return typeof value === "object" && value !== null && "relations" in value;
}

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
  const yongshinAnalysis = input.freeAnalysis.yongshinAnalysis;
  const gyeokgukAnalysis = input.freeAnalysis.gyeokgukAnalysis;
  const fortuneFlowAnalysis = input.freeAnalysis.fortuneFlowAnalysis;
  const strengthAnalysis = input.freeAnalysis.strengthAnalysis;
  const elementInterpretation = input.freeAnalysis.elementInterpretation;
  const elementAnalysis = input.freeAnalysis.elementAnalysis;

  const flowRelations = hasRelations(fortuneFlowAnalysis)
    ? toStringArray(
        fortuneFlowAnalysis.relations?.map((relation) => relation.description),
      )
    : [];

  return {
    yearPillar: input.saju.yearPillar,
    monthPillar: input.saju.monthPillar,
    dayPillar: input.saju.dayPillar,
    hourPillar: input.saju.hourPillar,
    strengthLevel: toCompactString(strengthAnalysis?.level),
    strengthSummary: toCompactString(strengthAnalysis?.summary),
    strengthDetail: toCompactString(strengthAnalysis?.summary),
    elementSummary: toCompactString(elementInterpretation?.summary),
    elementPercentages: formatElementPercentages(elementAnalysis?.percentages),
    elementBalance: toCompactString(elementInterpretation?.summary),
    yongshinPrimary: toCompactString(yongshinAnalysis?.primary),
    yongshinSecondary: toStringArray(yongshinAnalysis?.secondary),
    yongshinReason: toCompactString(yongshinAnalysis?.reason),
    yongshinDetail: toCompactString(yongshinAnalysis?.reason),
    gyeokgukPrimary: toCompactString(gyeokgukAnalysis?.primary),
    gyeokgukCandidates: toStringArray(gyeokgukAnalysis?.candidates),
    gyeokgukReason: toCompactString(gyeokgukAnalysis?.reason),
    gyeokgukDetail: toCompactString(gyeokgukAnalysis?.reason),
    currentDaeun: formatDaeunSummary(input.freeAnalysis.currentDaeun),
    currentSeun: formatSeunSummary(input.freeAnalysis.currentSeun),
    currentFlowContext: toCompactString(fortuneFlowAnalysis?.summary),
    activeRelations: flowRelations.slice(0, 3),
    relations: flowRelations,
    fortuneFlowSummary: toCompactString(fortuneFlowAnalysis?.summary),
    opportunities: toStringArray(fortuneFlowAnalysis?.opportunities),
    cautions: toStringArray(fortuneFlowAnalysis?.cautions),
    topicGuides: {
      career: toCompactString(fortuneFlowAnalysis?.topicGuides?.career),
      wealth: toCompactString(fortuneFlowAnalysis?.topicGuides?.wealth),
      relationship: toCompactString(fortuneFlowAnalysis?.topicGuides?.relationship),
      health: toCompactString(fortuneFlowAnalysis?.topicGuides?.health),
    },
  };
}
