"use strict";
// Server-side original MP4 source: public, non-expiring GitHub release asset.
// Never download arbitrary URLs; verify all four QA assets and the chosen MP4 SHA.
const {createHash}=require("node:crypto");
const REPO="mannerjm/unboda", KST=9*3600000;
const HOURS=[0,8,12,20];
function ymd(ms){return new Date(ms+KST).toISOString().slice(0,10).replaceAll("-","")}
function isoKst(ms){return new Date(ms+KST).toISOString().slice(0,19)}
function nextSlotFromCron(atMs){
 if(!Number.isFinite(atMs))return null;
 const local=new Date(atMs+KST),h=local.getUTCHours(),minute=local.getUTCMinutes();
 if(!HOURS.includes(h)||minute>30)return null;
 const day=Math.floor((atMs+KST)/86400000)*86400000;
 const next=HOURS.find(x=>x>h);
 const localSlot=(next!==undefined?day+next*3600000:day+86400000);
 return {slotUtc:new Date(localSlot-KST).toISOString(),slotKst:new Date(localSlot).toISOString().slice(0,19),
  targetDateKst:new Date(localSlot).toISOString().slice(0,10).replaceAll("-",""),
  hourKst:String(next??0).padStart(2,"0")};
}
async function jsonFrom(response){try{return await response.json()}catch{return null}}
async function loadReleaseVideo({now=Date.now(),fetcher=fetch}={}){
 const slot=nextSlotFromCron(now);
 if(!slot)return {state:"BLOCKED",reason:"NOT_FOUR_DAILY_KST_CRON"};
 const tag="unboda-saju-shorts-"+slot.targetDateKst;
 let metadata;
 try{
  const res=await fetcher("https://api.github.com/repos/"+REPO+"/releases/tags/"+tag,{
    method:"GET",headers:{Accept:"application/vnd.github+json",
     "User-Agent":"unboda-social-scheduled-video"},
    redirect:"error",signal:AbortSignal.timeout(12000)});
  if(!res?.ok)return {state:"BLOCKED",reason:"NEXT_DAY_FOUR_MP4_RELEASE_NOT_AVAILABLE",slot};
  metadata=await jsonFrom(res);
 }catch{return {state:"BLOCKED",reason:"GITHUB_RELEASE_READ_FAILED",slot}};
 if(metadata?.draft||!metadata?.prerelease||metadata?.tag_name!==tag||
    !Array.isArray(metadata.assets))return {state:"BLOCKED",reason:"UNTRUSTED_GITHUB_RELEASE",slot};
 const files=new Map(metadata.assets.map(a=>[a.name,a]));
 function trusted(name){
  const a=files.get(name);
  if(!a||!Number.isInteger(a.size)||a.size<100||
     a.size>6000000||a.state!=="uploaded")return null;
  const href="https://github.com/"+REPO+"/releases/download/"+tag+"/"+name;
  if(a.browser_download_url!==href)return null;
  return href;
 }
 const manifestUrl=trusted("manifest.json");
 if(!manifestUrl)return {state:"BLOCKED",reason:"GITHUB_SHA_MANIFEST_UNVERIFIED",slot};
 let manifest;
 try{
  const res=await fetcher(manifestUrl,{method:"GET",redirect:"follow",
   signal:AbortSignal.timeout(15000)});
  if(!res.ok)return {state:"BLOCKED",reason:"RELEASE_MANIFEST_UNAVAILABLE",slot};
  manifest=await jsonFrom(res);
 }catch{return {state:"BLOCKED",reason:"RELEASE_MANIFEST_UNREADABLE",slot}};
 if(manifest?.schemaVersion!==1||manifest?.targetDateKst!==slot.targetDateKst||
    manifest?.generatedBy!=="github-actions-four-qa-verified"||
    manifest?.brandSajuVerified!==true||
    manifest?.fourDistinctVisualStylesVerified!==true||
    manifest?.publishAutomatically!==false||
    !/^[a-f0-9]{40}$/.test(manifest.sourceCommit??"")||
    !Array.isArray(manifest.videos)||manifest.videos.length!==4||
    new Set(manifest.videos.map(x=>x.hourKst)).size!==4||
    !HOURS.every(h=>manifest.videos.some(x=>x.hourKst===String(h).padStart(2,"0"))))
  return {state:"BLOCKED",reason:"FOUR_RELEASE_QA_PROVENANCE_INVALID",slot};
 const video=manifest.videos.find(x=>x.hourKst===slot.hourKst);
 if(!video||video.sajuCategory===undefined||
    !["self-understanding","career","compatibility","money"].includes(video.sajuCategory)||
    !["midnight-indigo","commute-sunrise","relationship-coral","finance-emerald"].includes(video.visualStyle)||
    !/운보다/.test(video.caption??"")||!/(사주|궁합|재물운)/.test(video.caption??"")||
    !/^https:\/\/unboda\.kr\/?$/.test(video.destination??"")||
    !/^[a-f0-9]{64}$/.test(video.sha256||"")||
    video.mp4!==slot.hourKst+"-"+video.name+".mp4"||
    !["midnight","commute","friendship","afterwork"].includes(video.name)||
    !Number.isSafeInteger(video.bytes)||video.bytes<1000||video.bytes>45000000||
    typeof video.title!=="string"||video.title.length<4||video.title.length>70||
    typeof video.caption!=="string"||video.caption.length<30||video.caption.length>850||
    !video.topicKey?.endsWith(slot.targetDateKst))
  return {state:"BLOCKED",reason:"TARGET_SLOT_MP4_MANIFEST_NOT_VALID",slot};
 const videoUrl=trusted(video.mp4);
 if(!videoUrl||files.get(video.mp4)?.size!==video.bytes)
  return {state:"BLOCKED",reason:"RELEASE_MP4_FILE_NOT_UPLOADED",slot};
 try{
  const r=await fetcher(videoUrl,{method:"GET",redirect:"follow",
   signal:AbortSignal.timeout(25000)});
  if(!r.ok)return {state:"BLOCKED",reason:"PUBLIC_MP4_DOWNLOAD_FAILED",slot};
  const buf=Buffer.from(await r.arrayBuffer());
  if(buf.length!==video.bytes||buf.toString("ascii",4,8)!=="ftyp"||
    createHash("sha256").update(buf).digest("hex")!==video.sha256)
    return {state:"BLOCKED",reason:"PUBLIC_MP4_SHA256_READBACK_MISMATCH",slot};
 }catch{return {state:"BLOCKED",reason:"PUBLIC_MP4_BYTES_UNREADABLE",slot}}
 return {state:"ONE_KST_VIDEO_PUBLIC_MEDIA_VERIFIED",
  slot,videoUrl,sha256:video.sha256,bytes:video.bytes,
  title:video.title,caption:video.caption,topicKey:video.topicKey,
  releaseTag:tag,publicationProved:false};
}
module.exports={nextSlotFromCron,loadReleaseVideo,isoKst,ymd};
