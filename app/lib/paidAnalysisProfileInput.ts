import { buildFreeAnalysis } from "./buildFreeAnalysis";
import type { PaidAnalysisDetailPromptInput } from "./paidAnalysisDetailPrompt";
import { buildPaidAnalysisEvidenceFacts } from "./paidAnalysisEvidenceFacts";
import { buildReferencePeriodSnapshot } from "./analysisReferencePeriod";
import { getPremiumProduct } from "./premiumProductRegistry";
import type { ProfileDto } from "./profiles/types";
import { getSaju } from "./manse";
import { calculateSaju } from "@fullstackfamily/manseryeok";
import { getTenGod } from "./tenGod";
import { NEW_YEAR_PRODUCT_ID } from "./newYearFortune";

export function buildPaidAnalysisInputFromProfile(
  profile: ProfileDto,
  productId: string,
  anchorDate?: string,
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
    anchorDate,
    profile.birthTimeKnown,
  );
  let freeAnalysis = buildFreeAnalysis(saju);
  const referencePeriod = buildReferencePeriodSnapshot({
    productId,
    anchorDate,
    fortune: {
      daeunOrder: freeAnalysis.currentDaeun?.order,
      daeunGanji: freeAnalysis.currentDaeun?.ganji,
      seunGanji: freeAnalysis.currentSeun?.ganji,
    },
  });

  let targetMonthFacts: unknown[] | undefined;
  let analysisSaju=saju;
  if (productId===NEW_YEAR_PRODUCT_ID) {
    const year=referencePeriod?.referenceYear;
    if (!year) throw new Error("신년운세 대상 연도 확인 실패");
    analysisSaju=getSaju(profile.birthDate,profile.birthTime,profile.calendarType,profile.isLeapMonth?"윤달":"평달",profile.gender,`${year}-07-15`,profile.birthTimeKnown);
    freeAnalysis=buildFreeAnalysis(analysisSaju);
    targetMonthFacts=Array.from({length:12},(_,i)=>{
      const month=i+1;
      const last=new Date(Date.UTC(year,month,0)).getUTCDate();
      return {year,month,samples:[1,15,last].map(day=>{
        const chart=calculateSaju(year,month,day,12,0);
        return {day,yearPillar:chart.yearPillarHanja,monthPillar:chart.monthPillarHanja,natalDayStemRelation:getTenGod(saju.dayPillarHanja[0],chart.monthPillarHanja[0])};
      })};
    });
  }
  return {
    productId,
    analysisType: product.analysisType,
    birthData: JSON.stringify({ ...saju, birthTimeKnown: profile.birthTimeKnown ?? null }),
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
    evidenceFacts: buildPaidAnalysisEvidenceFacts({ saju: analysisSaju, freeAnalysis }),
    v4Context: {
      currentTiming: JSON.stringify({
        gender: profile.gender,
        daeunDirection: freeAnalysis.daeunAnalysis?.direction,
        daeunStartAge: freeAnalysis.daeunAnalysis?.startAge,
        currentDaeun: freeAnalysis.currentDaeun,
        currentSeun: freeAnalysis.currentSeun,
      }),
      // The full series is only meaningful where a period strategy consumes it.
      ...(product.kind === "PERIOD"
        ? {
            periodTiming: JSON.stringify({
              daeunAnalysis: freeAnalysis.daeunAnalysis,
              seunAnalysis: freeAnalysis.seunAnalysis,
              ...(targetMonthFacts ? {targetMonthFacts,samplingNote:"양력 월 초·중·말 정오 참고 계산입니다. 절기 경계의 정확한 시각 또는 사건 예측을 뜻하지 않습니다."}:{}),
            }),
          }
        : {}),
    },
    ...(referencePeriod ? { referencePeriod } : {}),
  };
}
