// Transparent estimate only, never billing or automatic purchase.
// Pricing snapshot revalidation required before real paid API requests.
// Runway gen4_turbo official API: 5 credits/sec, $0.01/credit (2026-10-24).
// ElevenLabs multilingual_v2: approximately 1 credit per input character;
// monthly tier credits and commercial-use rights must be independently verified.
export function estimateMonthlyMediaBudget({
 shortsPerDay=4,days=30,runwaySecondsPerShort=10,
 koreanCharactersPerShort=300,reRenderMultiplier=1
}={}){
 for(const n of [shortsPerDay,days,runwaySecondsPerShort,
  koreanCharactersPerShort,reRenderMultiplier]){
  if(!Number.isFinite(n)||n<0)throw Error("INVALID_COST_ESTIMATE");
 }
 if(shortsPerDay>100||days>31||runwaySecondsPerShort>45||
    koreanCharactersPerShort>5000||reRenderMultiplier>5)
  throw Error("COST_ESTIMATE_OUT_OF_RANGE");
 const originals=shortsPerDay*days;
 const runwayCredits=Math.ceil(originals*runwaySecondsPerShort*5*reRenderMultiplier);
 const runwayUsd=runwayCredits*0.01;
 const ttsCreditsApprox=Math.ceil(originals*koreanCharactersPerShort*reRenderMultiplier);
 return {originals,runwaySeconds:originals*runwaySecondsPerShort*reRenderMultiplier,
  runwayCredits,runwayUsd,ttsCreditsApprox,
  notIncluded:["editorialLLM","sourceImageGeneration","serverRender","storage",
   "TTSPlanCost","MetricoolPlan","taxes","postProviderLicenseRights"],
  priceReverificationRequired:true};
}
