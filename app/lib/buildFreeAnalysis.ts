import type { getSaju } from "./manse";
import { buildSajuResponse } from "./buildSajuResponse";

type SajuResult = ReturnType<typeof getSaju>;
type SajuResponse = ReturnType<typeof buildSajuResponse>;

export type FreeAnalysisResponse = Pick<
  SajuResponse,
  | "solarDate"
  | "yearPillarHanja"
  | "monthPillarHanja"
  | "dayPillarHanja"
  | "hourPillarHanja"
  | "yearStem"
  | "yearBranch"
  | "monthStem"
  | "monthBranch"
  | "dayStem"
  | "dayBranch"
  | "hourStem"
  | "hourBranch"
  | "yearHiddenStems"
| "yearTenGod"
| "yearBranchTenGod"
| "yearStage"
| "yearSpirit"
| "yearNoble"
| "yearNobles"

| "monthHiddenStems"
| "monthTenGod"
| "monthBranchTenGod"
| "monthStage"
| "monthSpirit"
| "monthNoble"
| "monthNobles"

| "dayHiddenStems"
| "dayTenGod"
| "dayBranchTenGod"
| "dayStage"
| "daySpirit"
| "dayNoble"
| "dayNobles"

| "hourHiddenStems"
| "hourTenGod"
| "hourBranchTenGod"
| "hourStage"
| "hourSpirit"
| "hourNoble"
| "hourNobles"
  | "elementAnalysis"
  | "strengthAnalysis"
  | "elementInterpretation"
  | "yongshinAnalysis"
  | "gyeokgukAnalysis"
  | "daeunAnalysis"
  | "seunAnalysis"
>;

export function buildFreeAnalysis(
  saju: SajuResult
): FreeAnalysisResponse {
  const full = buildSajuResponse(saju);

  return {
    solarDate: full.solarDate,

    yearPillarHanja: full.yearPillarHanja,
    monthPillarHanja: full.monthPillarHanja,
    dayPillarHanja: full.dayPillarHanja,
    hourPillarHanja: full.hourPillarHanja,

    yearStem: full.yearStem,
    yearBranch: full.yearBranch,
    monthStem: full.monthStem,
    monthBranch: full.monthBranch,
    dayStem: full.dayStem,
    dayBranch: full.dayBranch,
    hourStem: full.hourStem,
    hourBranch: full.hourBranch,
yearHiddenStems: full.yearHiddenStems,
yearTenGod: full.yearTenGod,
yearBranchTenGod: full.yearBranchTenGod,
yearStage: full.yearStage,
yearSpirit: full.yearSpirit,
yearNoble: full.yearNoble,
yearNobles: full.yearNobles,

monthHiddenStems: full.monthHiddenStems,
monthTenGod: full.monthTenGod,
monthBranchTenGod: full.monthBranchTenGod,
monthStage: full.monthStage,
monthSpirit: full.monthSpirit,
monthNoble: full.monthNoble,
monthNobles: full.monthNobles,

dayHiddenStems: full.dayHiddenStems,
dayTenGod: full.dayTenGod,
dayBranchTenGod: full.dayBranchTenGod,
dayStage: full.dayStage,
daySpirit: full.daySpirit,
dayNoble: full.dayNoble,
dayNobles: full.dayNobles,

hourHiddenStems: full.hourHiddenStems,
hourTenGod: full.hourTenGod,
hourBranchTenGod: full.hourBranchTenGod,
hourStage: full.hourStage,
hourSpirit: full.hourSpirit,
hourNoble: full.hourNoble,
hourNobles: full.hourNobles,
    elementAnalysis: full.elementAnalysis,
    strengthAnalysis: full.strengthAnalysis,
    elementInterpretation: full.elementInterpretation,
    yongshinAnalysis: full.yongshinAnalysis,
    gyeokgukAnalysis: full.gyeokgukAnalysis,
    daeunAnalysis: full.daeunAnalysis,
    seunAnalysis: full.seunAnalysis,
  };
}