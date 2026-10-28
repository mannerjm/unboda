import { NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { createElement, type ReactNode } from "react";

// One-shot narrowly owner-approved Runway pilot (50 credits, 10s Gen4 Turbo).
// Hidden behind Vercel SSO Preview; this is NOT an ongoing autopilot or cron.
// No public-site deployment, SNS posting, extra paid generation or retries.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const BRANCH = "test/social-automation-safety-poc-20261023";
const API = "https://api.dev.runwayml.com";
const HEADERS_VERSION = "2024-11-06";
const creditApproved = 50;
function send(data: Record<string,unknown>,status=200) {
 return NextResponse.json(data,{status,headers:{"Cache-Control":"no-store, max-age=0","X-Robots-Tag":"noindex, noarchive"}});
}
function safeEnvironment() {
 return process.env.VERCEL_ENV==="preview"&&process.env.VERCEL_GIT_COMMIT_REF===BRANCH;
}
async function authenticatedApi<T>(path:string,key:string) {
 const response=await fetch(API+path,{
  method:"GET",
  headers:{"Authorization":"Bearer "+key,"X-Runway-Version":HEADERS_VERSION},
  cache:"no-store",signal:AbortSignal.timeout(12000)
 });
 if(!response.ok) return {ok:false,status:response.status,data:null as T|null};
 return {ok:true,status:response.status,data:await response.json() as T};
}
// Original in-house drawn artwork, no lettering/copyrighted picture, 720x1280.
// Gold medallion against cosmic indigo, with ambient dust, radial rings,
// and individual traditional animal-sign marker nodes.
// Text overlays & Korean narration are not baked into the 10-second source.
async function createOriginalFrame():Promise<string> {
 const el=(type:string,props:Record<string,unknown>,...children:ReactNode[])=>createElement(type,props,...children);
 const x=Array.from({length:12},(_,i)=>{
   const t=i*Math.PI/6-Math.PI/2;
   const cx=360+244*Math.cos(t),cy=604+244*Math.sin(t);
   return el("div",{key:"sign"+i,style:{
    position:"absolute",left:cx-14,top:cy-14,width:28,height:28,borderRadius:"50%",
    background:"radial-gradient(circle at 30% 20%, #fff4d2, #c28a4b 48%, #533c37 100%)",
    border:"2px solid #ffdaa3",boxShadow:"0 0 16px #9d6a44"
   }});
 });
 const stars=Array.from({length:48},(_,i)=>{
  const a=(i*379+143)%690, b=(i*211+63)%1160;
  return el("div",{key:"star"+i,style:{position:"absolute",
    left:a+14,top:b+44,width:i%5===0?4:2,height:i%5===0?4:2,
    borderRadius:"50%",background:"#fff3d3",opacity:i%4===0?.64:.27}});
 });
 const ring=(r:number,opacity:number,width=2)=>el("div",{
    style:{position:"absolute",left:360-r,top:604-r,width:r*2,height:r*2,
      borderRadius:"50%",border:width+"px solid rgba(238,187,104,"+opacity+")",
      boxShadow:"0 0 "+(r===198?38:12)+"px rgba(234,184,102,.13)"}
 });
 const root=el("div",{style:{
   width:720,height:1280,display:"flex",position:"relative",overflow:"hidden",
   background:"radial-gradient(ellipse at 50% 49%, #2b2545 0%, #151e34 38%, #090f21 75%, #070911 100%)",
   justifyContent:"center",alignItems:"center"
 }},
   ...stars,
   el("div",{style:{position:"absolute",left:90,top:295,width:540,height:650,borderRadius:"50%",
      background:"radial-gradient(ellipse,rgba(183,126,61,.19),rgba(19,18,48,0) 68%)"}}),
   ring(295,.23),ring(270,.6),ring(264,.38),ring(229,.75,3),ring(204,.38),ring(172,.58),
   ...x,
   el("div",{style:{position:"absolute",left:212,top:456,width:296,height:296,borderRadius:"50%",
     background:"radial-gradient(circle at 38% 27%, #dabe83, #88572e 48%, #332638 78%, #1c1c30 100%)",
     border:"6px solid #e8b978",boxShadow:"0 0 54px rgba(240,175,81,.38), inset 0 0 35px rgba(3,4,15,.5)"}}),
   ring(122,.58),
   el("div",{style:{position:"absolute",left:334,top:554,width:52,height:100,
      background:"linear-gradient(90deg,#9a642f,#ecd294 45%,#8d5830)",
      borderRadius:26,transform:"rotate(21deg)",opacity:.72,
      boxShadow:"0 0 30px rgba(248,202,118,.35)"}}),
   el("div",{style:{position:"absolute",left:126,top:981,width:468,height:2,
       background:"linear-gradient(90deg,transparent,#b68855,transparent)",opacity:.56}})
 );
 const result=new ImageResponse(root,{width:720,height:1280});
 const bytes=Buffer.from(await result.arrayBuffer());
 const uri="data:image/png;base64,"+bytes.toString("base64");
 if(uri.length>4_800_000)throw Error("ORIGINAL_FRAME_TOO_LARGE");
 return uri;
}
export async function GET(request:Request){
 if(!safeEnvironment())return send({state:"NOT_AVAILABLE"},404);
 const u=new URL(request.url);
 const key=process.env.RUNWAY_API_KEY?.trim();
 if(!key)return send({state:"RUNWAY_KEY_MISSING"},503);
 const mode=u.searchParams.get("mode");
 if(mode==="status"){
  const id=u.searchParams.get("id");
  if(!id||!/^[-0-9a-f]{36}$/i.test(id))return send({state:"INVALID_TASK_ID"},400);
  try{
   const r=await authenticatedApi<{id?:string,status:string,output?:string[],failure?:string}>(
     "/v1/tasks/"+encodeURIComponent(id),key);
   if(!r.ok)return send({state:"TASK_LOOKUP_FAILED",httpStatus:r.status},502);
   const data=r.data!;
   return send({state:data.status==="SUCCEEDED"?"SUCCEEDED":data.status,
      taskId:id, outputUrl:data.status==="SUCCEEDED"&&
       Array.isArray(data.output)?data.output.find(x=>/^https:\/\//.test(x)):null,
      doesNotConfirmVideoQA:true});
  }catch{return send({state:"TASK_LOOKUP_NETWORK_ERROR"},502)}
 }
 if(mode==="preview-source") {
   try {
     const original=await createOriginalFrame();
     return send({state:"ORIGINAL_PNG_RENDERED",width:720,height:1280,
       dataUriLength:original.length,within5MbLimit:original.length<5_000_000,
       rights:"in-house-original-design",creditsSpent:0});
   } catch {return send({state:"ORIGINAL_PNG_RENDER_FAILED",creditsSpent:0},500)}
 }
 if(mode==="inspect"||mode==="download") {
   const id=u.searchParams.get("id");
   if(!id||!/^[0-9a-f-]{36}$/i.test(id))return send({state:"INVALID_TASK_ID"},400);
   try {
     const r=await authenticatedApi<{status:string,output?:string[]}>("/v1/tasks/"+encodeURIComponent(id),key);
     if(!r.ok||r.data?.status!=="SUCCEEDED"||!Array.isArray(r.data.output))
       return send({state:"VIDEO_NOT_READY_OR_LOOKUP_FAILED"},409);
     const url=r.data.output.find(v=>typeof v==="string"&&/^https:\/\/[a-z0-9.-]+\.cloudfront\.net\//i.test(v));
     if(!url)return send({state:"PROVIDER_MEDIA_URL_UNVERIFIED"},502);
     if(mode==="download")return Response.redirect(url,302);
     const head=await fetch(url,{method:"HEAD",cache:"no-store",
       signal:AbortSignal.timeout(15000)});
     const mime=head.headers.get("content-type")??"";
     const size=Number(head.headers.get("content-length")??0);
     return send({state:head.ok&&mime.includes("video/")&&size>10000?"MP4_MEDIA_CONFIRMED":"MEDIA_HEAD_UNVERIFIED",
        headStatus:head.status,contentType:mime,bytes:size,
        outputFileName:"unboda_first_runway_10s.mp4",
        providerTaskSucceeded:true,durationRequestedSeconds:10,
        downloadedToLocal:false,visualQACompleted:false,
        narrationPresent:false,snsPublished:false},head.ok?200:502);
   }catch{return send({state:"MEDIA_INSPECTION_FAILED"},502)}
 }
 if(mode!=="start")return send({state:"PILOT_READ_ONLY",method:"GET",
   createMedia:false,approvedMaxCredits:creditApproved});
 // Pilot already executed exactly once: deliberately retire paid creation.
 // Inspect & download remain read-only, but no new provider POST is possible.
 return send({state:"ONE_SHOT_PILOT_ALREADY_COMPLETED",
   createdAdditionalTask:false,postedToSocial:false,
   furtherCreditsAuthorized:0},409);
}
