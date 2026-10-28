// Single deterministic KST clock contract for 4 video drafts per day.
// No database mutation, provider generation, scheduling or SNS publishing.
const H=3600000,D=24*H,KST=9*H,LOCAL_HOURS=[0,8,12,20];
const stop=(reason,meta={})=>({state:'BLOCKED',reason,...meta,
 paidGenerationEnabled:false,publishingEnabled:false});
export const VIDEO_LOCAL_HOURS=Object.freeze([...LOCAL_HOURS]);
export function buildNextVideoSlots(atMs,{hoursAhead=48}={}){
 if(!Number.isFinite(atMs)||!Number.isInteger(hoursAhead)||
  hoursAhead!==48)return stop('FIXED_48_HOUR_UTC_WINDOW_REQUIRED');
 const start=Math.floor((atMs+KST)/D)*D;
 const seen=new Set(),results=[];
 for(let offset=0;offset<=3;offset++){
  for(const h of LOCAL_HOURS){
   const utcMs=start+offset*D+h*H-KST;
   if(utcMs<atMs||utcMs>=atMs+hoursAhead*H)continue;
   const utc=new Date(utcMs).toISOString();
   const dateKst=new Date(utcMs+KST).toISOString().slice(0,10);
   const kstHour=String(h).padStart(2,'0');
   if(seen.has(utc))return stop('DUPLICATED_VIDEO_SLOT');
   seen.add(utc);
   results.push({utc,localKst:dateKst+'T'+kstHour+':00:00+09:00',
    timeKst:kstHour+':00'});
  }
 }
 results.sort((a,b)=>a.utc.localeCompare(b.utc));
 if(results.length!==8)return stop('REQUIRED_8_FUTURE_VIDEO_SLOTS_NOT_PRODUCED');
 return {state:'PRIVATE_48H_SLOT_PLAN',videoSlots:results,
  slotsPerDay:4,periodHours:48,paidGenerationEnabled:false,
  publishingEnabled:false,mediaReady:false};
}
export function verifyWorkerVideoCron(config){
 const entries=config?.crons;
 const target=Array.isArray(entries)&&entries.find(x=>x?.path==='/api/cron/video');
 const result=String(target?.schedule??'').trim();
 const [min,hour,dom,month,dow,...more]=result.split(/\s+/);
 if(more.length||min!=='0'||dom!=='*'||month!=='*'||dow!=='*'||
  !/^(?:[0-9]{1,2},){3}[0-9]{1,2}$/.test(hour??''))
  return stop('VIDEO_CRON_NOT_FOUR_EXACT_UTC_HOURS');
 const hours=hour.split(',').map(Number);
 const expected=LOCAL_HOURS.map(h=>(h+24-9)%24).sort((a,b)=>a-b);
 if(new Set(hours).size!==4||hours.some(h=>!Number.isInteger(h)||h<0||h>23)||
  JSON.stringify([...hours].sort((a,b)=>a-b))!==JSON.stringify(expected))
  return stop('VIDEO_CRON_NOT_MATCHING_FOUR_KST_TIMES');
 return {state:'CORRECT_FOUR_KST_CRON',utcHours:expected,
  timeZone:'Asia/Seoul',actualPublisherConnected:false};
}
export function inspectStagingSlotCoverage({atMs,jobs}={}){
 const plan=buildNextVideoSlots(atMs);
 if(plan.state!=='PRIVATE_48H_SLOT_PLAN')return plan;
 if(!Array.isArray(jobs)||jobs.length>100)
  return stop('STAGING_VIDEO_CANDIDATES_MISSING_OR_EXCESSIVE');
 const expected=new Set(plan.videoSlots.map(x=>x.utc));
 const actual=new Map();
 for(const j of jobs){
  if(!j||typeof j.scheduled_for!=='string'||!expected.has(j.scheduled_for)||
   j.kind!=='short-video'||j.status==='BLOCKED')continue;
  const prev=actual.get(j.scheduled_for)||0;
  actual.set(j.scheduled_for,prev+1);
 }
 const miss=[...expected].filter(x=>actual.get(x)!==1);
 if(miss.length||[...actual.values()].some(x=>x!==1))
  return stop('STAGING_48H_VIDEO_SLOT_COUNT_MISMATCH',{missingOrDuplicate:miss});
 return {state:'8_STAGING_SLOT_CANDIDATES_VERIFIED',
  readyMediaCount:jobs.filter(x=>x?.content?.realMediaReady===true).length,
  canEnablePublisher:false,publishingEnabled:false};
}
