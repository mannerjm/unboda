// 10s premium AI video + 20s original procedural motion graphics.
// Budget-aware design only; it does not purchase/generate media or publish.
export const HYBRID_SEGMENT_COUNT=4;
export const PREMIUM_VIDEO_SECONDS_MAX=10;
export const ESTIMATED_GEN4_TURBO_USD_PER_SECOND=0.05;
export function assessHybridPlan({segments,allowPaid=false,
 plannedCredits=null,approvedCredits=null}={}){
 const reasons=[];
 if(!Array.isArray(segments)||segments.length!==HYBRID_SEGMENT_COUNT)
  reasons.push("FOUR_SEGMENTS_REQUIRED");
 let premiumSeconds=0,premiumCount=0,proceduralCount=0;
 for(const seg of Array.isArray(segments)?segments:[]){
  if(!seg||!Number.isFinite(seg.duration)||seg.duration<7.5||seg.duration>10)
   reasons.push("SEGMENT_DURATION_INVALID");
  if(!seg||!["premium-ai","original-mograph"].includes(seg.source))
   reasons.push("UNSUPPORTED_MEDIA_SOURCE");
  else if(seg.source==="premium-ai"){
   premiumSeconds+=seg.duration;
   premiumCount++;
  }else proceduralCount++;
  if(!seg?.ownedOrLicensed||typeof seg.licenseProof!=="string"||
     seg.licenseProof.trim().length<5)reasons.push("RIGHTS_MISSING");
  if(seg?.qualityStatus!=="approved")reasons.push("MEDIA_QA_REQUIRED");
 }
 if(premiumCount!==1||proceduralCount!==3||premiumSeconds>PREMIUM_VIDEO_SECONDS_MAX)
  reasons.push("ONE_PAID_TEN_SECOND_CLIP_MAX");
 if(!allowPaid)reasons.push("PAID_PROVIDER_NOT_ENABLED");
 if(!Number.isInteger(plannedCredits)||plannedCredits<1||
    !Number.isInteger(approvedCredits)||approvedCredits<plannedCredits)
  reasons.push("PREMIUM_BUDGET_UNVERIFIED");
 const baseCostUsd=premiumSeconds*ESTIMATED_GEN4_TURBO_USD_PER_SECOND;
 return {ready:reasons.length===0,reasons:[...new Set(reasons)],
  premiumSeconds,premiumCount,originalMotionCount:proceduralCount,
  estimatedRunwayGenerationUsd:Number(baseCostUsd.toFixed(2)),
  monthlyRunwayFor120OriginalsUsd:Number((baseCostUsd*120).toFixed(2)),
  independentVendorCallPerformed:false};
}
