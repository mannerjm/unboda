import type { getSaju } from "./manse";
import { buildSajuResponse } from "./buildSajuResponse";

type SajuResult = ReturnType<typeof getSaju>;
type SajuResponse = ReturnType<typeof buildSajuResponse>;

export type PremiumAnalysisResponse = Pick<
  SajuResponse,
  | "elementRelations"
  | "fortuneBrain"
  | "daeunAnalysis"
  | "seunAnalysis"
  | "yongshinAnalysis"
  | "gyeokgukAnalysis"
  | "strengthAnalysis"
  | "elementAnalysis"
> &
  Pick<SajuResult, "fortuneFlowAnalysis">;

export function buildPremiumAnalysis(
  saju: SajuResult
): PremiumAnalysisResponse {
  const full = buildSajuResponse(saju);

 return {
  elementRelations: full.elementRelations,
  fortuneBrain: full.fortuneBrain,
  daeunAnalysis: full.daeunAnalysis,
  seunAnalysis: full.seunAnalysis,
  yongshinAnalysis: full.yongshinAnalysis,
  gyeokgukAnalysis: full.gyeokgukAnalysis,
  strengthAnalysis: full.strengthAnalysis,
  elementAnalysis: full.elementAnalysis,
  fortuneFlowAnalysis: saju.fortuneFlowAnalysis,
};
}