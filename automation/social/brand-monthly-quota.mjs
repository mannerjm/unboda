// Estimate per-CHANNEL publication counts, not merely source content items.
// Metricool fair-use has a 600-post per-brand monthly base activity threshold.
// Use conservative operator cutoff 500, never treat a forecast as observed quota.
const SOFT_CAP=500,FAIR_USE_BASE=600;
export function forecastBrandMonthlyPosts({
 daysInMonth=30,textOriginalsPerDay=8,textChannelsPerOriginal=null,
 videoOriginalsPerDay=4,videoChannelsPerOriginal=null,
 additionalPlannedChannelPosts=null,accountMonthlyInventoryVerified=false
}={}){
 const integers=[daysInMonth,textOriginalsPerDay,videoOriginalsPerDay];
 if(!integers.every(Number.isInteger)||daysInMonth<28||daysInMonth>31||
   textOriginalsPerDay<0||textOriginalsPerDay>12||videoOriginalsPerDay<0||videoOriginalsPerDay>8)
  return {state:"BLOCKED",reason:"INVALID_PUBLICATION_INPUT"};
 if(!Number.isInteger(textChannelsPerOriginal)||textChannelsPerOriginal<0||
  !Number.isInteger(videoChannelsPerOriginal)||videoChannelsPerOriginal<0||
  textChannelsPerOriginal>6||videoChannelsPerOriginal>6)
  return {state:"BLOCKED",reason:"EXACT_CHANNEL_COUNTS_NOT_CONFIRMED"};
 if(!Number.isInteger(additionalPlannedChannelPosts)||additionalPlannedChannelPosts<0)
  return {state:"BLOCKED",reason:"EXISTING_MONTHLY_POST_INVENTORY_MISSING"};
 const texts=daysInMonth*textOriginalsPerDay*textChannelsPerOriginal;
 const videos=daysInMonth*videoOriginalsPerDay*videoChannelsPerOriginal;
 const total=texts+videos+additionalPlannedChannelPosts;
 return Object.freeze({state:total>SOFT_CAP?"BLOCKED_SOFT_CAP":"FORECAST_ONLY",
  calendarMonthDays:daysInMonth,estimatedTextDeliveries:texts,
  estimatedVideoDeliveries:videos,additionalPlannedChannelPosts,
  estimatedBrandMonthlyDeliveries:total,operatorSoftCap:SOFT_CAP,
  metricoolFairUseBase:FAIR_USE_BASE,
  observedMetricoolQuotaVerified:accountMonthlyInventoryVerified===true,
  canEnableAutoPublishing:false,
  marginToOperatorCap:SOFT_CAP-total,
  reason:total>SOFT_CAP?"BRAND_MONTHLY_PUBLICATION_SOFT_CAP_EXCEEDED":
    "CREATIVE_RIGHTS_AND_REAL_PUBLISH_E2E_STILL_REQUIRED"});
}
