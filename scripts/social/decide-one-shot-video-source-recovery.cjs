"use strict";
// One-shot RECOVERY OF SOURCE BUILD only. It does not schedule any social posts.
const MS=86400000, KST=9*3600000;
const expectedNames=new Set(["00-midnight.mp4","00-midnight.jpg","08-commute.mp4","08-commute.jpg","12-friendship.mp4","12-friendship.jpg","20-afterwork.mp4","20-afterwork.jpg","manifest.json","automated-voice-quality-receipt.json"]);
const isoKst=ms=>new Date(ms+KST).toISOString().slice(0,19);
const validDate=s=>typeof s==="string"&&/^\d{8}$/.test(s);
function decision({now,release,runs,completeHistory=true}){
 if(!Number.isFinite(now)||!Array.isArray(runs)||!completeHistory)return {action:"BLOCK",reason:"UNVERIFIED_RUN_HISTORY"};
 const current=isoKst(now);
 const today=current.slice(0,10).replaceAll("-","");
 const tomorrow=new Date(Date.parse(current.slice(0,10)+"T00:00:00Z")+MS).toISOString().slice(0,10).replaceAll("-","");
 if(!validDate(today)||!validDate(tomorrow))return {action:"BLOCK",reason:"INVALID_KST_DATE"};
 if(release&&typeof release!=="object")return {action:"BLOCK",reason:"INVALID_SOURCE_READ"};
 if(release){
  const names=release.assets?.map(x=>x?.name);
  const valid=release.tag_name==="unboda-saju-shorts-"+tomorrow&&release.draft===false&&
    Array.isArray(names)&&names.length===10&&new Set(names).size===10&&
    names.every(x=>expectedNames.has(x))&&
    release.assets.every(x=>Number.isSafeInteger(x?.size)&&x.size>=(
      x.name.endsWith(".mp4")?500000:x.name.endsWith(".jpg")?20000:200));
  return {action:valid?"NOOP":"BLOCK",reason:valid?"RELEASE_COMPLETE":"EXISTING_RELEASE_INCOMPLETE_NO_OVERWRITE",target:tomorrow};
 }
 // Running very late cannot save the 00:00 social video, and unexpected clock
 // shouldn't cause an unbounded batch of real source reruns.
 const clock=current.slice(11,16);
 if(clock<"21:35"||clock>"22:20")return {action:"BLOCK",reason:"OUTSIDE_SINGLE_RECOVERY_WINDOW",target:tomorrow};
 const start=Date.parse(current.slice(0,10)+"T00:00:00Z")-KST;
 const recent=runs.filter(x=>{
  const t=Date.parse(x?.created_at??"");
  if(!Number.isFinite(t))throw Error("UNVERIFIABLE_WORKFLOW_RUN_TIME");
  return t>=start&&t<=now;
 });
 if(recent.some(x=>x.status!=="completed"))return {action:"NOOP",reason:"VIDEO_SOURCE_BUILD_ALREADY_ACTIVE",target:tomorrow};
 if(recent.some(x=>x.event==="workflow_dispatch"))return {action:"BLOCK",reason:"ALREADY_TRIED_ONE_RECOVERY_TODAY",target:tomorrow};
 if(recent.some(x=>x.conclusion==="success"))return {action:"BLOCK",reason:"SUCCESS_WITHOUT_RELEASE_MANUAL_INSPECTION",target:tomorrow};
 return {action:"DISPATCH_ONCE",reason:"NO_NEXT_DAY_MP4_AND_NO_ACTIVE_SOURCE_BUILD",target:tomorrow};
}
function test(){
 const now=Date.parse("2026-11-09T12:55:00Z");
 const runs=[{created_at:"2026-11-09T11:13:00Z",event:"schedule",status:"completed",conclusion:"failure"}];
 const yes=decision({now,release:null,runs});
 if(yes.action!=="DISPATCH_ONCE"||yes.target!=="20261110")throw Error("NO_MISSING_RECOVERY");
 const twice=decision({now,release:null,runs:[...runs,{created_at:"2026-11-09T12:10:00Z",event:"workflow_dispatch",status:"completed",conclusion:"failure"}]});
 if(twice.action!=="BLOCK")throw Error("UNSAFE_RETRY_POSSIBLE");
 const active=decision({now,release:null,runs:[...runs,{created_at:"2026-11-09T12:40:00Z",event:"schedule",status:"in_progress"}]});
 if(active.action!=="NOOP")throw Error("RUNNING_JOB_NOT_PRESERVED");
 const assets=[...expectedNames].map(name=>({name,size:name.endsWith(".mp4")?1200000:100000}));
 const good=decision({now,release:{tag_name:"unboda-saju-shorts-20261110",draft:false,assets},runs});
 if(good.action!=="NOOP"||good.reason!=="RELEASE_COMPLETE")throw Error("EXISTING_VIDEO_ASSETS_NOT_PRESERVED");
 const bad=decision({now,release:{tag_name:"unboda-saju-shorts-20261110",draft:false,assets:assets.slice(0,9)},runs});
 if(bad.action!=="BLOCK")throw Error("PARTIAL_RELEASE_OVERWRITTEN");
 if(decision({now:Date.parse("2026-11-09T13:00:00Z"),release:null,runs:[]}).action!=="DISPATCH_ONCE")throw Error("RECOVERY_TIME_INVALID");
 if(decision({now:Date.parse("2026-11-09T13:35:00Z"),release:null,runs:[]}).action!=="BLOCK")throw Error("LATE_RECOVERY_SHOULD_BLOCK");
 console.log("UNBODA_ONE_SHOT_VIDEO_SOURCE_RECOVERY_OFFLINE_PASS_NO_SNS_POST");
}
if(require.main===module)test();
module.exports={decision};
