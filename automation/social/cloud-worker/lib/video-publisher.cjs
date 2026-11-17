"use strict";
// Live video scheduler using an existing Metricool server token.
// It never creates original video or charges an AI model.
// Safety: disabled by default, exact brand, video hash, no retries after POST,
// atomic Blob claim, provider readback and cancellation of our OWN text-only post.
const {loadReleaseVideo,isoKst}=require("./release-video.cjs");
const {timingSafeEqual}=require("node:crypto");
const USER="5729495",BRAND="7377653";
const METRICOOL="https://app.metricool.com";
const NETWORKS=["instagram","facebook","youtube","tiktok","threads"];
const fail=(reason,info={})=>({state:"VIDEO_PUBLISH_BLOCKED",reason,scheduled:false,...info});
function secureEqual(a,b){
 if(typeof a!=="string"||typeof b!=="string"||b.length<32)return false;
 const x=Buffer.from(a),y=Buffer.from(b);
 return x.length===y.length&&timingSafeEqual(x,y);
}
function configOK(env){
 return env?.METRICOOL_BLOG_ID===BRAND&&env?.METRICOOL_USER_ID===USER&&
  typeof env.METRICOOL_API_TOKEN==="string"&&env.METRICOOL_API_TOKEN.length>20&&
  env.SOCIAL_PUBLISH_ENABLED==="true"&&env.SOCIAL_PAID_GENERATION_ENABLED==="false";
}
// Three unique channels from four supported video platforms per source.
// Across four daily slots, each provider is included exactly three times.
// The omitted platform advances each KST day, so every platform also
// rotates through all time slots on a four-day cycle.
function enabledNetworks(env,slot){
 const supplied=typeof env.SOCIAL_VIDEO_NETWORKS==="string"?env.SOCIAL_VIDEO_NETWORKS:"instagram";
 if(supplied==="rotation"){
  const hours=["00","08","12","20"],index=hours.indexOf(slot?.hourKst);
  const ymd=String(slot?.targetDateKst??"");
  if(index<0||!/^[0-9]{8}$/.test(ymd))return null;
  const day=Date.UTC(+ymd.slice(0,4),+ymd.slice(4,6)-1,+ymd.slice(6));
  if(!Number.isFinite(day)||new Date(day).toISOString().slice(0,10).replaceAll("-","")!==ymd)return null;
  const four=["instagram","facebook","youtube","tiktok"];
  const excluded=(Math.floor(day/86400000)+index)%four.length;
  return four.filter((_,i)=>i!==excluded);
 }
 const result=supplied.split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(result.length<1||result.length>NETWORKS.length||
    result.some(x=>!NETWORKS.includes(x))||new Set(result).size!==result.length)return null;
 return result;
}
// Short-form posts use one verified original MP4 but platform-specific copy.
// Never imply an Instagram/TikTok/Shorts description URL is clickable.
// Facebook and Threads get direct, source-tagged free-saju URLs.
const VIDEO_TOPICS=Object.freeze({
 "self-understanding":{label:"생활 성향",tag:"#자기이해",campaign:"self_understanding"},
 career:{label:"직업 성향",tag:"#직장운",campaign:"career"},
 compatibility:{label:"관계 성향",tag:"#궁합",campaign:"compatibility"},
 money:{label:"재물 성향",tag:"#재물운",campaign:"money"}
});
function channelCaption(network,video){
 const topic=VIDEO_TOPICS[video.sajuCategory];
 if(!NETWORKS.includes(network)||!topic||typeof video.caption!=="string")
  throw Error("UNVERIFIED_NETWORK_OR_SAJU_TOPIC");
 const main=video.caption.trim();
 const ctaAt=main.lastIndexOf("운보다 무료 사주 조회");
 // The last spoken CTA is replaced by one network-appropriate next action,
 // not pasted twice. The original video narration/audio stays unchanged.
 const context=ctaAt>0?main.slice(0,ctaAt).trim():main;
 const link="https://unboda.kr/guest-saju?utm_source="+network+
  "&utm_medium=social&utm_campaign=saju_video_"+topic.campaign;
 const actions={
  instagram:"내 "+topic.label+"이 궁금하다면 프로필의 운보다 무료 사주 링크를 확인해 보세요.",
  facebook:"내 "+topic.label+"을 무료로 살펴보기: "+link,
  threads:"내 "+topic.label+"은 어떨까요? 무료 사주 확인: "+link,
  tiktok:"내 "+topic.label+"이 궁금하다면 프로필에서 운보다 무료 사주를 찾아보세요.",
  youtube:"내 "+topic.label+"이 궁금하다면 채널 프로필의 운보다 무료 사주 링크를 확인해 보세요."
 };
 const hashtags={
  instagram:"#운보다 #무료사주 "+topic.tag+" #사주릴스",
  facebook:"#운보다 #무료사주 "+topic.tag,
  threads:"#운보다 #무료사주 "+topic.tag,
  tiktok:"#운보다 #무료사주 "+topic.tag+" #사주",
  youtube:"#운보다 #무료사주 "+topic.tag+" #Shorts"
 };
 const text=[context,actions[network],hashtags[network]].join("\n\n");
 if(text.length>1700||(network==="threads"&&[...text].length>450))
  throw Error("NETWORK_CAPTION_NOT_WITHIN_SAFE_LIMIT");
 return text;
}
function videoTitle(network,video){
 const topic=VIDEO_TOPICS[video.sajuCategory];
 if(!topic||typeof video.title!=="string")throw Error("INVALID_VIDEO_TITLE_TOPIC");
 const base=video.title.trim();
 const proposed=network==="youtube"?base+" | "+topic.label+" #Shorts":base;
 if(proposed.length<5||proposed.length>70)throw Error("NETWORK_VIDEO_TITLE_TOO_LONG");
 return proposed;
}
function postBody(network,mediaId,video){
 const dateTime=video.slot.slotKst;
 const b={publicationDate:{dateTime,timezone:"Asia/Seoul"},
  text:channelCaption(network,video),providers:[{network}],
  media:[typeof mediaId==="string"&&mediaId.startsWith("https://")?mediaId:{mediaId:String(mediaId)}],autoPublish:true,draft:false,
  saveExternalMediaFiles:true};
 if(network==="instagram")b.instagramData={type:"REEL",autoPublish:true,
   showReelOnFeed:true,isAiGenerated:true};
 if(network==="facebook")b.facebookData={type:"REEL",title:videoTitle(network,video)};
 if(network==="youtube")b.youtubeData={type:"short",privacy:"public",
   madeForKids:false,title:videoTitle(network,video),isAiGeneratedContent:true};
 if(network==="tiktok")b.tiktokData={title:videoTitle(network,video),autoAddMusic:false,
   privacyOption:"PUBLIC_TO_EVERYONE",commercialContentOwnBrand:true,
   commercialContentThirdParty:false,isAigc:true};
 return b;
}
async function request(fetcher,url,token,{method="GET",body,accept="application/json",timeoutMs=25000}={}){
 return await fetcher(url,{method,redirect:"error",cache:"no-store",
  signal:AbortSignal.timeout(timeoutMs),
  headers:{"X-Mc-Auth":token,Accept:accept,
   ...(body?{"Content-Type":"application/json"}:{})},
  ...(body?{body:JSON.stringify(body)}:{})});
}
function scheduledUrl(slot){
 const u=new URL("/api/v2/scheduler/posts",METRICOOL);
 for(const [key,value] of Object.entries({
  userId:USER,blogId:BRAND,
  start:isoKst(Date.parse(slot.slotUtc)-60000),
  end:isoKst(Date.parse(slot.slotUtc)+60000),
  timezone:"Asia/Seoul"
 }))u.searchParams.set(key,value);
 return u.toString();
}
function inspectPosts(data){
 return Array.isArray(data)?data:
  Array.isArray(data?.data)?data.data:Array.isArray(data?.posts)?data.posts:null;
}
function listedAtSlot(posts,network,video){
 return posts.some(p=>String(p?.publicationDate?.dateTime??"")===video.slot.slotKst &&
  Array.isArray(p?.providers)&&p.providers.some(c=>c.network===network));
}
async function postOne({fetcher,token,video,network,reserveSlot}){
 // Validate platform copy before normalizing media or taking an atomic slot claim.
 try{postBody(network,"preflight-video",video)}
 catch{return fail("NETWORK_VIDEO_COPY_NOT_APPROVED",{network})}
 let existing;
 try{
  const read=await request(fetcher,scheduledUrl(video.slot),token);
  if(!read.ok)return fail("METRICOOL_EXISTING_POSTS_CHECK_FAILED");
  existing=inspectPosts(await read.json());
 }catch{return fail("METRICOOL_EXISTING_POSTS_UNREADABLE")}
 if(!existing)return fail("METRICOOL_EXISTING_POSTS_SCHEMA_FAILED");
 if(listedAtSlot(existing,network,video))
  return {state:"EXISTING_PROVIDER_SLOT_NOT_DUPLICATED",network,scheduled:false};
 const normalized=new URL("/api/actions/normalize/image/url",METRICOOL);
 // The Metricool normalize endpoint accepts a public MP4 URL; it requires
 // userId and folder=PLANNER, and may return a *plain-text hosted URL*.
 // Other endpoints use JSON; do not assume the normalize response is JSON.
 normalized.searchParams.set("url",video.videoUrl);
 normalized.searchParams.set("userId",USER);
 normalized.searchParams.set("blogId",BRAND);
 normalized.searchParams.set("folder","PLANNER");
 let mediaId;
 try{
  const response=await request(fetcher,normalized.toString(),token,
   {accept:"*/*",timeoutMs:90000});
  if(!response.ok)return fail("METRICOOL_MP4_NORMALIZATION_FAILED",{
   network,httpStatus:response.status});
  const raw=typeof response.text==="function"?await response.text():
   JSON.stringify(await response.json());
  if(raw.length>4096)throw Error("MEDIA_REFERENCE_TOO_LARGE");
  let data;
  try{data=JSON.parse(raw)}catch{data=raw.trim()}
  mediaId=typeof data==="string"?data:
    data?.mediaId??data?.data?.mediaId??data?.id??data?.data?.id??
    data?.url??data?.data?.url;
 }catch{return fail("METRICOOL_MP4_MEDIA_REFERENCE_UNREADABLE",{network})}
 if(typeof mediaId==="string"&&mediaId.startsWith("https://")){
  try{
   const u=new URL(mediaId);
   if(u.username||u.password||u.hostname==="localhost"||
     /^([0-9.]+|.*\\.local)$/.test(u.hostname))throw Error("UNSAFE_URL");
  }catch{return fail("METRICOOL_NORMALIZED_MEDIA_URL_UNSAFE",{network})}
 }else if(!(typeof mediaId==="string"||typeof mediaId==="number")||
     String(mediaId).length<4||String(mediaId).length>180){
  return fail("METRICOOL_NORMALIZATION_DID_NOT_RETURN_VIDEO_ID",{network});
 }
 let claim;
 try{claim=await reserveSlot({
  brandId:BRAND,network,
  slotUtc:video.slot.slotUtc,sourceSha256:video.sha256,
  sourceTag:video.releaseTag
 });}
 catch{return fail("PERSISTENT_POST_CLAIM_FAILED",{network})}
 if(claim?.state!=="FIRST_ATOMIC_CLAIM_GRANTED")
  return fail("PREVIOUS_POST_CLAIM_EXISTS_NO_RETRY",{network});
 const url=new URL("/api/v2/scheduler/posts",METRICOOL);
 url.searchParams.set("blogId",BRAND);url.searchParams.set("userId",USER);
 let response;
 try{response=await request(fetcher,url.toString(),token,{
   method:"POST",body:postBody(network,mediaId,video)})}
 catch{return fail("METRICOOL_POST_WRITE_OUTCOME_UNKNOWN",{network,doNotBlindlyRetry:true})}
 if(!response.ok)return fail("METRICOOL_POST_WRITE_FAILED_RECONCILE",{
  network,httpStatus:response.status,doNotBlindlyRetry:true});
 let data;try{data=await response.json()}catch{
  return fail("METRICOOL_POST_ID_UNREADABLE_RECONCILE",{network,doNotBlindlyRetry:true})}
 const id=data?.id??data?.data?.id;
 if(!Number.isSafeInteger(Number(id))||Number(id)<1)
  return fail("METRICOOL_POST_MISSING_ID_RECONCILE",{network,doNotBlindlyRetry:true});
 const checkUrl=new URL("/api/v2/scheduler/posts/"+Number(id),METRICOOL);
 checkUrl.searchParams.set("blogId",BRAND);checkUrl.searchParams.set("userId",USER);
 let post;
 try{
  const verified=await request(fetcher,checkUrl.toString(),token);
  if(!verified.ok)throw Error("GET_AFTER_POST");
  const json=await verified.json();post=json?.data??json;
 }catch{return fail("METRICOOL_CREATED_BUT_VERIFICATION_UNAVAILABLE",{
  network,metricoolPostId:Number(id),doNotBlindlyRetry:true})}
 const hasVideo=Array.isArray(post?.media)&&post.media.some(m=>
  typeof m==="string"?m.includes(".mp4"):m&&(
   (typeof m.url==="string"&&m.url.includes(".mp4"))||
   String(m.mediaId??m.id??"")===String(mediaId)));
 const correctNetwork=Array.isArray(post.providers)&&
  post.providers.some(p=>p.network===network);
 if(!hasVideo||!correctNetwork||
    String(post.publicationDate?.dateTime)!==video.slot.slotKst){
  // Important: never allow our OWN freshly-created text-only video post to go live.
  // DELETE only the exact positive ID returned by THIS POST, not prior schedules.
  let canceled=false;
  try{
   const del=await request(fetcher,checkUrl.toString(),token,{method:"DELETE"});
   canceled=!!del.ok;
  }catch{/* retain details for safe manual reconciliation */}
  return fail("NEW_POST_HAS_NO_VERIFIED_MP4_CANCELED_OR_RECONCILE",{
   network,metricoolPostId:Number(id),canceled,doNotBlindlyRetry:true});
 }
 return {state:"PROVIDER_VIDEO_ATTACHED_AND_SCHEDULED",
  network,metricoolPostId:Number(id),sourceSha256:video.sha256,
  scheduledFor:video.slot.slotUtc,publicPostVerified:false,
  scheduled:true};
}
async function runVideoPublishCron({env=process.env,fetcher=fetch,
 now=Date.now(),reserveSlot,reserveSource}={}){
 if(!configOK(env))return {http:503,body:fail("VIDEO_AUTO_PUBLISH_NOT_ENABLED")};
 const rotation=env.SOCIAL_VIDEO_NETWORKS==="rotation";
 if(rotation&&(typeof reserveSlot!=="function"||typeof reserveSource!=="function"))
  return {http:503,body:fail("THREE_CHANNEL_ORIGINAL_CLAIM_NOT_CONNECTED")};
 const fixedNetworks=rotation?null:enabledNetworks(env);
 if(!rotation&&(!fixedNetworks||typeof reserveSlot!=="function"))
  return {http:503,body:fail("PROVIDER_LIST_OR_ATOMIC_CLAIM_MISSING")};
 const video=await loadReleaseVideo({now,fetcher});
 if(video.state!=="ONE_KST_VIDEO_PUBLIC_MEDIA_VERIFIED")
  return {http:503,body:fail(video.reason,{slot:video.slot||null})};
 const networks=rotation?enabledNetworks(env,video.slot):fixedNetworks;
 if(!networks||typeof reserveSlot!=="function"||(rotation&&networks.length!==3))
  return {http:503,body:fail("PROVIDER_LIST_OR_ATOMIC_CLAIM_MISSING")};
 if(rotation){
  let original;
  try{original=await reserveSource({brandId:BRAND,slotUtc:video.slot.slotUtc,
   sourceSha256:video.sha256,sourceTag:video.releaseTag});}
  catch{return {http:503,body:fail("ORIGINAL_GLOBAL_SHA_CLAIM_FAILED")}}
  if(original?.state!=="FIRST_ORIGINAL_CLAIM_GRANTED")
   return {http:503,body:fail("ORIGINAL_USED_OR_CLAIM_UNCERTAIN_NO_REPOST")};
 }
 const results=[];
 for(const network of networks){
  const r=await postOne({fetcher,token:env.METRICOOL_API_TOKEN,
   video,network,reserveSlot});
  results.push(r);
 }
 const scheduled=results.filter(x=>x.state==="PROVIDER_VIDEO_ATTACHED_AND_SCHEDULED").length;
 const blocked=results.filter(x=>x.state==="VIDEO_PUBLISH_BLOCKED").length;
 return {http:blocked?207:200,body:{
  state:blocked?"PARTIAL_PROVIDER_FAILURE":"VIDEO_DAY_NEXT_SLOT_PLANNED",
  expectedTimeKst:video.slot.slotKst,
  sourceRelease:video.releaseTag,sourceSha256:video.sha256,
  providerResults:results,scheduledCount:scheduled,blockedCount:blocked,
  actualSocialPlatformPublicationVerified:false,paidAiCalls:0}};
}
function makeVideoHandler({env=process.env,fetcher=fetch,reserveSlot,reserveSource,
 now=()=>Date.now()}={}){
 return async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Robots-Tag","noindex,nofollow");
  if(req?.method!=="GET"||!secureEqual(req?.headers?.authorization,
     "Bearer "+(env.CRON_SECRET??""))){
   res.statusCode=401;return res.end("Unauthorized");
  }
  const run=await runVideoPublishCron({env,fetcher,reserveSlot,reserveSource,now:now()});
  // Only identifiers and aggregate results; never log authorization headers.
  // Safe diagnostic fields only: never log tokens, original captions, names or media URLs.
  const providerDiagnostics=Array.isArray(run.body.providerResults)?
    run.body.providerResults.map(x=>({
      network:["instagram","facebook","youtube","tiktok"].includes(x.network)?x.network:"unknown",
      state:x.state==="VIDEO_PUBLISH_BLOCKED"?"BLOCKED":x.state,
      reason:typeof x.reason==="string"&&/^[A-Z0-9_]{4,100}$/.test(x.reason)?x.reason:null,
      httpStatus:Number.isInteger(x.httpStatus)?x.httpStatus:null
    })):[];
  console.info("unboda_video_publish_cron",JSON.stringify({
   state:run.body.state,reason:typeof run.body.reason==="string"?run.body.reason:null,
   scheduledCount:run.body.scheduledCount??0,
   blockedCount:run.body.blockedCount??null,slot:run.body.expectedTimeKst??null,
   providerDiagnostics}));
  res.statusCode=run.http;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  return res.end(JSON.stringify(run.body));
 };
}
module.exports={runVideoPublishCron,makeVideoHandler,postOne,postBody,channelCaption,videoTitle,enabledNetworks};
