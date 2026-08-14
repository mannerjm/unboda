import { buildFreeAnalysis } from "./buildFreeAnalysis";
import type { PaidAnalysisDetailPromptInput } from "./paidAnalysisDetailPrompt";
import { getPremiumProduct } from "./premiumProductRegistry";
import type { ProfileDto } from "./profiles/types";
import { getSaju } from "./manse";

export function buildPaidAnalysisInputFromProfile(
  profile: ProfileDto,
  productId: string,
): PaidAnalysisDetailPromptInput {
  const product = getPremiumProduct(productId);

  if (!product) {
    throw new Error("유효하지 않은 분석 상품입니다.");
  }

  const saju = getSaju(
    profile.birthDate,
    profile.birthTime,
    profile.calendarType,
    profile.isLeapMonth ? "윤달" : "평달",
    profile.gender,
  );
  const freeAnalysis = buildFreeAnalysis(saju);

  return {
    productId,
    analysisType: product.analysisType,
    birthData: JSON.stringify(saju),
    originalChart: JSON.stringify({
      solarDate: saju.solarDate,
      year: { pillar: saju.yearPillar, stem: saju.yearStem, branch: saju.yearBranch },
      month: { pillar: saju.monthPillar, stem: saju.monthStem, branch: saju.monthBranch },
      day: { pillar: saju.dayPillar, stem: saju.dayStem, branch: saju.dayBranch },
      hour: { pillar: saju.hourPillar, stem: saju.hourStem, branch: saju.hourBranch },
    }),
    coreInterpretation: JSON.stringify({
      elementAnalysis: freeAnalysis.elementAnalysis,
      strengthAnalysis: freeAnalysis.strengthAnalysis,
      yongshinAnalysis: freeAnalysis.yongshinAnalysis,
      gyeokgukAnalysis: freeAnalysis.gyeokgukAnalysis,
    }),
    fortuneTiming: JSON.stringify({
      daeunAnalysis: freeAnalysis.daeunAnalysis,
      currentDaeun: freeAnalysis.currentDaeun,
      seunAnalysis: freeAnalysis.seunAnalysis,
      currentSeun: freeAnalysis.currentSeun,
      fortuneFlowAnalysis: freeAnalysis.fortuneFlowAnalysis,
    }),
    sajuSummary: JSON.stringify({
      strength: freeAnalysis.strengthAnalysis,
      elements: freeAnalysis.elementAnalysis,
      yongshin: freeAnalysis.yongshinAnalysis,
      gyeokguk: freeAnalysis.gyeokgukAnalysis,
    }),
    currentFortuneFlow: JSON.stringify(freeAnalysis.fortuneFlowAnalysis),
  };
}
