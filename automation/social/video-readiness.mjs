// Independent 6-hour video automation: configuration and release gate.
// Does NOT inherit ChatGPT's connected Metricool plugin session.
// Fail closed: no paid generation, scheduling or 365-day service until each
// required dependency is independently verified in the actual cloud worker.
export const REQUIRED_VIDEO_ENV=Object.freeze([
 "METRICOOL_API_TOKEN","METRICOOL_USER_ID","METRICOOL_BLOG_ID",
 "RUNWAY_API_KEY","SOCIAL_KOREAN_TTS_KEY","SOCIAL_TEXT_AI_API_KEY",
 "SOCIAL_STORAGE_URL","SOCIAL_STORAGE_WRITE_KEY",
 "SOCIAL_LEDGER_DATABASE_URL"
]);
const REQUIRED_PROOFS=Object.freeze([
 "approvedCommercialVoice","verifiedVideoContentQuality",
 "verifiedKoreanNarrationPronunciation","approvedOriginalImageRights",
 "validMediaPublicURL","persistedUniqueJobAndBudgetReservation",
 "verifiedMetricoolApiResponse","verifiedPostingAndReconciliation",
 "verifiedSocialAccountQuota","ownerApprovedMonthlyBudget"
]);
export function validateAutopilotConfig(c){
 const issues=[];
 if(c?.schemaVersion!==1)issues.push("CONFIG_SCHEMA_UNSUPPORTED");
 if(c?.timezone!=="Asia/Seoul")issues.push("TIMEZONE_INVALID");
 if(c?.metricool?.brandId!=="7377653"||
    c?.metricool?.apiMode!=="independent_REST")issues.push("METRICOOL_CONFIG_INVALID");
 if(c?.existingTextImage?.cadenceHours!==3||c?.existingTextImage?.doNotModify!==true)
  issues.push("EXISTING_TEXT_AUTOMATION_MUST_BE_PRESERVED");
 const v=c?.video??{};
 if(v.targetCadenceHours!==6||v.firstAnchorLocal!=="2026-10-24T20:00:00+09:00")
  issues.push("SIX_HOUR_VIDEO_SCHEDULE_REQUIRED");
 if(v.output?.width!==1080||v.output?.height!==1920||
    v.output?.container!=="mp4"||v.output?.audio!=="aac")
  issues.push("SHORT_VIDEO_OUTPUT_UNSUPPORTED");
 if(!Array.isArray(v.distribution?.supported)||
    v.distribution.supported.some(x=>!["instagram","facebook","youtube","tiktok"].includes(x))||
    v.distribution.maxNetworksPerOriginal>2||
    v.distribution.maxNetworksPerOriginal<1)issues.push("DISTRIBUTION_UNSAFE");
 if(v.queue?.bufferHours<48||v.queue?.goalReadyVideos<8||
    v.queue?.durableDatabase!=="supabase_isolated_social_schema")
  issues.push("DURABLE_48_HOUR_BUFFER_REQUIRED");
 if(v.safety?.allowBlindRetry!==false||v.safety?.remoteConfirmationBeforeRetry!==true||
    v.safety?.noChangesToPaymentsRefundsCustomerTables!==true)
  issues.push("RECOVERY_SAFETY_REQUIRED");
 if(!Number.isSafeInteger(c?.controls?.monthlyGenerationBudgetUsdCents)||
    c.controls.monthlyGenerationBudgetUsdCents<0)
  issues.push("BUDGET_CONFIG_INVALID");
 return {ok:issues.length===0,issues};
}
export function inspectAutopilotReadiness({config,env={},proofs={}}={}){
 const validation=validateAutopilotConfig(config);
 const missingEnvironment=REQUIRED_VIDEO_ENV.filter(key=>typeof env[key]!=="string"||
  env[key].trim().length===0);
 const missingProofs=REQUIRED_PROOFS.filter(key=>proofs[key]!==true);
 const controls=config?.controls??{};
 const gates=[
  ...(config?.video?.enabled?[]:["VIDEO_DISABLED"]),
  ...(controls.schedulerEnabled?[]:["SCHEDULER_DISABLED"]),
  ...(controls.paidGenerationEnabled?[]:["PAID_GENERATION_DISABLED"]),
  ...(controls.livePublishingEnabled?[]:["LIVE_PUBLISH_DISABLED"]),
  ...(Number.isSafeInteger(controls.monthlyGenerationBudgetUsdCents)&&
      controls.monthlyGenerationBudgetUsdCents>0?[]:["MONTHLY_SPEND_NOT_APPROVED"])
 ];
 return Object.freeze({
  ready:validation.ok&&missingEnvironment.length===0&&missingProofs.length===0&&gates.length===0,
  configIssues:validation.issues,missingEnvironment,missingProofs,gates,
  planOnly:true,
  connectedChatPluginDoesNotGrantRESTCredentials:true
 });
}
// Calls scheduling planners without running AI generation, media writes or external SNS API.
// schedule fields deliberately derive from UTC milliseconds and retain KST anchors.
export function plannedSixHourSlots({now,count=8,
 anchor=Date.parse("2026-10-24T20:00:00+09:00")}={}){
 if(!Number.isFinite(now)||!Number.isInteger(count)||count<1||count>16)
  throw Error("INVALID_PLAN_INPUT");
 const interval=6*60*60*1000;
 const first=anchor+Math.max(0,Math.ceil((now-anchor)/interval))*interval;
 return Array.from({length:count},(_,i)=>{
  const ms=first+i*interval;
  return {slotKey:"unboda:short-video:"+new Date(ms).toISOString(),
    atUtc:new Date(ms).toISOString(),atKst:
    new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul",
      dateStyle:"short",timeStyle:"medium",hourCycle:"h23"}).format(ms),
    state:"NEEDS_CREATIVE_RENDER_AND_APPROVAL"};
 });
}
