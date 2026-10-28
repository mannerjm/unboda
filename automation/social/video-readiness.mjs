// Independent four-fixed-times-daily video automation: configuration and release gate.
// Does NOT inherit ChatGPT's connected Metricool plugin session.
// Fail closed: no paid generation, scheduling or 365-day service until each
// required dependency is independently verified in the actual cloud worker.
export const REQUIRED_VIDEO_ENV=Object.freeze([
 "METRICOOL_API_TOKEN","METRICOOL_USER_ID","METRICOOL_BLOG_ID",
 "SOCIAL_KOREAN_NARRATION_SOURCE","SOCIAL_TEXT_AI_API_KEY",
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
 if(v.schedule?.kind!=="fixed_daily_local_time"||v.schedule?.timezone!=="Asia/Seoul"||
    JSON.stringify(v.schedule?.timesLocal)!==JSON.stringify(["00:00","08:00","12:00","20:00"])||
    v.schedule?.utcCron!=="0 3,11,15,23 * * *")
  issues.push("FIXED_KST_VIDEO_SCHEDULE_REQUIRED");
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
// Fixed 00:00/08:00/12:00/20:00 KST; 24:00 means next-day 00:00.
export const VIDEO_TIMES_KST=Object.freeze([0,8,12,20]);
export function plannedFixedDailyVideoSlots({now,count=8}={}){
 if(!Number.isFinite(now)||!Number.isInteger(count)||count<1||count>16)
  throw Error("INVALID_PLAN_INPUT");
 const kstOffset=9*3600000;
 const midnight=Math.floor((now+kstOffset)/86400000)*86400000-kstOffset;
 const result=[];
 for(let day=0;result.length<count&&day<6;day++){
  for(const hour of VIDEO_TIMES_KST){
   const ms=midnight+day*86400000+hour*3600000;
   if(ms<now)continue;
   result.push({slotKey:"unboda:short-video:"+new Date(ms).toISOString(),
    atUtc:new Date(ms).toISOString(),atKst:
    new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul",dateStyle:"short",
      timeStyle:"medium",hourCycle:"h23"}).format(ms),
    state:"NEEDS_CREATIVE_RENDER_AND_APPROVAL"});
   if(result.length>=count)break;
  }
 }
 return result;
}
