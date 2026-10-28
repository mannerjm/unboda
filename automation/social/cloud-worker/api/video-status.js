"use strict";
// Public metadata only: GitHub release and workflow readiness, no credentials.
module.exports=async(req,res)=>{
 res.setHeader("Cache-Control","no-store");
 res.setHeader("X-Robots-Tag","noindex,nofollow");
 res.setHeader("Content-Type","application/json; charset=utf-8");
 if(req?.method!=="GET"){res.statusCode=405;return res.end('{"state":"METHOD_BLOCKED"}');}
 const local=new Date(Date.now()+9*3600000);
 const date=new Date(local.getTime()+86400000).toISOString().slice(0,10).replaceAll("-","");
 const api="https://api.github.com/repos/mannerjm/unboda";
 const headers={Accept:"application/vnd.github+json","User-Agent":"unboda-social-readonly-metadata"};
 try{
  const [workflow,release]=await Promise.all([
   fetch(api+"/actions/workflows/unboda-video-autonomous-build.yml/runs?per_page=4",{
    headers,signal:AbortSignal.timeout(10000)}),
   fetch(api+"/releases/tags/unboda-saju-shorts-"+date,{
    headers,signal:AbortSignal.timeout(10000)})
  ]);
  const r=release.ok?await release.json():null;
  const w=workflow.ok?await workflow.json():null;
  const runs=Array.isArray(w?.workflow_runs)?w.workflow_runs:[];
  const assets=Array.isArray(r?.assets)?r.assets.map(x=>x.name):[];
  const videos=assets.filter(x=>/^((00-midnight)|(08-commute)|(12-friendship)|(20-afterwork))\.mp4$/.test(x));
  res.statusCode=200;
  return res.end(JSON.stringify({
   state:release.ok&&videos.length===4&&assets.includes("manifest.json")?"FOUR_RELEASE_MP4_ASSETS_PRESENT":"RELEASE_NOT_READY",
   expectedDateKst:date,releaseReady:!!release.ok,
   mp4Files:videos.length,manifestFound:assets.includes("manifest.json"),
   latestBuilds:runs.slice(0,3).map(x=>({id:x.id,runStatus:x.status,
     conclusion:x.conclusion,event:x.event,createdAt:x.created_at})),
   publishingState:"NOT_VERIFIED_BY_THIS_READONLY_ENDPOINT"
  }));
 }catch{
  res.statusCode=503;
  return res.end(JSON.stringify({state:"READONLY_GITHUB_STATUS_UNAVAILABLE",publishing:false}));
 }
};
