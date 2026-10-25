import { NextResponse } from "next/server";
import { put, head } from "@vercel/blob";
import { createHash } from "node:crypto";

// One-time cloud ingestion for the owner's FIRST Runway motion proof.
// Runway -> cloud worker -> public durable Blob. No owner file transfer.
// Preview + exact branch + Vercel SSO deployment protection required.
// No account data access, no SNS actions, no paid media creation.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const BRANCH="test/social-automation-safety-poc-20261023";
const TASK="b7d64306-f5d4-48ef-9bd8-b7c9b0445b36";
const HOST="dnznrvs05pmza.cloudfront.net";
const MIME="video/mp4";
const MAX=4_000_000; // 1.8 MB actual, 4 MB hard cap
const PREFIX="unboda-social/pilots/";
type Task={status:string;output?:string[]};

function reply(out: Record<string,unknown>,status=200) {
 return NextResponse.json(out,{status,headers:{
  "Cache-Control":"no-store, max-age=0",
  "X-Robots-Tag":"noindex, nofollow, noarchive"
 }});
}
function safeUrl(v:string) {
 try{
  const u=new URL(v);
  return u.protocol==="https:"&&u.hostname===HOST&&
   (u.port===""||u.port==="443")&&
   !u.username&&!u.password&&u.pathname.endsWith(".mp4")&&u.href.length<3500;
 }catch{return false}
}
function isMissing(e:unknown){
 return e instanceof Error&&(e.name==="BlobNotFoundError"||
  e.name==="BlobNotFound");
}
export async function GET(request:Request) {
 const url=new URL(request.url);
 if(process.env.VERCEL_ENV!=="preview"||
   process.env.VERCEL_GIT_COMMIT_REF!==BRANCH)
  return reply({state:"NOT_AVAILABLE"},404);
 if(url.searchParams.get("mode")!=="archive"||
    url.searchParams.get("id")!==TASK)
  return reply({state:"PILOT_ONLY",paidGeneration:false},404);
 const runway=process.env.RUNWAY_API_KEY?.trim();
 const blob=process.env.BLOB_READ_WRITE_TOKEN?.trim();
 if(!runway||!blob)return reply({state:"STORAGE_OR_RUNWAY_KEY_MISSING"},503);

 // The only Runway call is read-only. The confirmed credit debit was 50
 // from the prior explicit owner-approved generation; this route spends 0.
 try{
  const r=await fetch("https://api.dev.runwayml.com/v1/tasks/"+TASK,{
   method:"GET",headers:{"Authorization":"Bearer "+runway,
    "X-Runway-Version":"2024-11-06"},
   cache:"no-store",redirect:"error",signal:AbortSignal.timeout(9000)
  });
  if(!r.ok)return reply({state:"RUNWAY_READ_FAILED",httpStatus:r.status},502);
  const task=await r.json() as Task;
  if(task.status!=="SUCCEEDED")
   return reply({state:"RUNWAY_TASK_NOT_DONE",taskStatus:task.status},409);
  const media=task.output?.find((v)=>typeof v==="string"&&safeUrl(v));
  if(!media)return reply({state:"RUNWAY_MP4_URL_UNTRUSTED_OR_EXPIRED"},502);

  const f=await fetch(media,{method:"GET",redirect:"error",
   cache:"no-store",signal:AbortSignal.timeout(20000)});
  if(!f.ok)return reply({state:"RUNWAY_MP4_FETCH_FAILED",httpStatus:f.status},502);
  const len=Number(f.headers.get("content-length")??"0");
  const ct=(f.headers.get("content-type")??"").split(";")[0].trim();
  if(!Number.isInteger(len)||len<1000||len>MAX||ct!==MIME)
   return reply({state:"RUNWAY_MP4_METADATA_REJECTED",bytes:len,mime:ct},422);

  const bin=Buffer.from(await f.arrayBuffer());
  if(bin.length!==len||bin.length>MAX||bin.toString("ascii",4,8)!=="ftyp")
   return reply({state:"RUNWAY_MP4_BYTES_REJECTED"},422);

  const checksum=createHash("sha256").update(bin).digest("hex");
  const pathname=PREFIX+"runway-"+TASK+"-"+checksum.slice(0,16)+".mp4";
  let existing;
  try{existing=await head(pathname,{token:blob})}
  catch(e){if(!isMissing(e))return reply({state:"BLOB_HEAD_UNAVAILABLE_NO_WRITE"},502);}
  if(existing){
   if(existing.pathname!==pathname||existing.size!==bin.length||
      existing.contentType!==MIME||!existing.url.includes(".public.blob.vercel-storage.com/"))
     return reply({state:"PREEXISTING_BLOB_MISMATCH_NO_WRITE"},409);
   return reply({state:"PILOT_MP4_ALREADY_ARCHIVED",permanentUrl:existing.url,
    bytes:existing.size,sha256:checksum,runwayCreditsSpentByThisStep:0,
    instagramPosted:false,additionalMediaGenerated:false});
  }

  // First and only write for this SHA content key, no overwrite and no
  // random filename. Future bulk jobs require separate monthly budget approval.
  const created=await put(pathname,bin,{access:"public",token:blob,
   contentType:MIME,addRandomSuffix:false,allowOverwrite:false});
  if(created.pathname!==pathname||!created.url.includes(".public.blob.vercel-storage.com/"))
   return reply({state:"BLOB_WRITE_RESPONSE_UNTRUSTED_RECONCILE"},502);
  const confirmed=await head(pathname,{token:blob});
  if(confirmed.size!==bin.length||confirmed.contentType!==MIME||
    confirmed.url!==created.url)
   return reply({state:"BLOB_HEAD_MISMATCH_RECONCILE"},502);
  return reply({state:"PILOT_MP4_PERMANENTLY_ARCHIVED",
    permanentUrl:confirmed.url,
    bytes:confirmed.size,sha256:checksum,runwayCreditsSpentByThisStep:0,
    newBlobWrites:1,additionalMediaGenerated:false,
    instagramPosted:false,tiktokPosted:false,youtubePosted:false});
 }catch{
  return reply({state:"ARCHIVE_OUTCOME_UNKNOWN_RECONCILE_NO_RETRY",
   runwayCreditsSpentByThisStep:0},502);
 }
}
