import type { getSaju } from "./manse";

type SajuResult = ReturnType<typeof getSaju>;

export function buildSajuResponse(saju: SajuResult) {
  return {
    solarDate: saju.solarDate,

    yearPillarHanja: saju.yearPillarHanja,
    monthPillarHanja: saju.monthPillarHanja,
    dayPillarHanja: saju.dayPillarHanja,
    hourPillarHanja: saju.hourPillarHanja,

    yearStem: saju.yearStem,
    yearBranch: saju.yearBranch,
    yearHiddenStems: saju.yearHiddenStems,
    yearTenGod: saju.yearTenGod,
    yearBranchTenGod: saju.yearBranchTenGod,
    yearStage: saju.yearStage,
    yearSpirit: saju.yearSpirit,
    yearNoble: saju.yearNoble,
    yearNobles: saju.yearNobles,

    monthStem: saju.monthStem,
    monthBranch: saju.monthBranch,
    monthHiddenStems: saju.monthHiddenStems,
    monthTenGod: saju.monthTenGod,
    monthBranchTenGod: saju.monthBranchTenGod,
    monthStage: saju.monthStage,
    monthSpirit: saju.monthSpirit,
    monthNoble: saju.monthNoble,
    monthNobles: saju.monthNobles,

    dayStem: saju.dayStem,
    dayBranch: saju.dayBranch,
    dayHiddenStems: saju.dayHiddenStems,
    dayTenGod: saju.dayTenGod,
    dayBranchTenGod: saju.dayBranchTenGod,
    dayStage: saju.dayStage,
    daySpirit: saju.daySpirit,
    dayNoble: saju.dayNoble,
    dayNobles: saju.dayNobles,

    hourStem: saju.hourStem,
    hourBranch: saju.hourBranch,
    hourHiddenStems: saju.hourHiddenStems,
    hourTenGod: saju.hourTenGod,
    hourBranchTenGod: saju.hourBranchTenGod,
    hourStage: saju.hourStage,
    hourSpirit: saju.hourSpirit,
    hourNoble: saju.hourNoble,
    hourNobles: saju.hourNobles,

    elementAnalysis: saju.elementAnalysis,
    strengthAnalysis: saju.strengthAnalysis,
    elementInterpretation: saju.elementInterpretation,
    elementRelations: saju.elementRelations,
    yongshinAnalysis: saju.yongshinAnalysis,
    gyeokgukAnalysis: saju.gyeokgukAnalysis,
    fortuneBrain: saju.fortuneBrain,
    daeunAnalysis: saju.daeunAnalysis,
    seunAnalysis: saju.seunAnalysis,
  };
}