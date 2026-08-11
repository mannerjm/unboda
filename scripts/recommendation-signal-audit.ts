import { buildPremiumAnalysis } from "../app/lib/buildPremiumAnalysis";
import { getSaju } from "../app/lib/manse";
import { buildFreeAnalysis } from "../app/lib/buildFreeAnalysis";
import { buildMainAnalysisCompactFacts } from "../app/lib/mainAnalysisCompactFacts";

const saju = getSaju(
  "1995-05-20",
  "09:00",
  "양력",
  "평달",
  "남성",
);

const freeAnalysis = buildFreeAnalysis(saju);
const premiumAnalysis = buildPremiumAnalysis(saju);
const compactFacts = buildMainAnalysisCompactFacts({ saju, freeAnalysis });

const signalSummary = {
  strengthAnalysis: {
    type: typeof premiumAnalysis.strengthAnalysis.level,
    deterministic: true,
    usedInRecommendation: true,
    sample: premiumAnalysis.strengthAnalysis.level,
  },
  elementAnalysis: {
    type: typeof premiumAnalysis.elementAnalysis.percentages,
    deterministic: true,
    usedInRecommendation: true,
    sample: premiumAnalysis.elementAnalysis.percentages,
  },
  elementInterpretation: {
    type: typeof premiumAnalysis.elementAnalysis.strongest,
    deterministic: true,
    usedInRecommendation: true,
    sample: premiumAnalysis.elementAnalysis.strongest,
  },
  yongshinAnalysis: {
    type: typeof premiumAnalysis.yongshinAnalysis.primary,
    deterministic: true,
    usedInRecommendation: false,
    sample: premiumAnalysis.yongshinAnalysis.primary,
  },
  gyeokgukAnalysis: {
    type: typeof premiumAnalysis.gyeokgukAnalysis.primary,
    deterministic: true,
    usedInRecommendation: false,
    sample: premiumAnalysis.gyeokgukAnalysis.primary,
  },
  elementRelations: {
    type: typeof premiumAnalysis.elementRelations.summary,
    deterministic: true,
    usedInRecommendation: true,
    sample: premiumAnalysis.elementRelations.summary,
  },
  fortuneFlowAnalysis: {
    type: typeof premiumAnalysis.fortuneFlowAnalysis?.currentFlow,
    deterministic: true,
    usedInRecommendation: true,
    sample: premiumAnalysis.fortuneFlowAnalysis?.currentFlow ?? "없음",
  },
  daeun: {
    type: typeof premiumAnalysis.daeunAnalysis?.direction,
    deterministic: true,
    usedInRecommendation: false,
    sample: premiumAnalysis.daeunAnalysis?.direction ?? "없음",
  },
  seun: {
    type: typeof premiumAnalysis.seunAnalysis?.items?.[0]?.ganji,
    deterministic: true,
    usedInRecommendation: false,
    sample: premiumAnalysis.seunAnalysis?.items?.[0]?.ganji ?? "없음",
  },
  compactFacts: {
    type: typeof compactFacts,
    deterministic: true,
    usedInRecommendation: false,
    sampleKeys: Object.keys(compactFacts).slice(0, 8),
  },
};

console.log(JSON.stringify(signalSummary, null, 2));
