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
// Two unique channels per source, rotating which pair receives each time slot.
function enabledNetworks(env,slot){
 const supplied=typeof env.SOCIAL_VIDEO_NETWORKS==="string"?env.SOCIAL_VIDEO_NETWORKS:"instagram";
 if(supplied==="rotation"){
  const hours=["00","08","12","20"],index=hours.indexOf(slot?.hourKst);
  const ymd=String(slot?.targetDateKst??"");
  if(index<0||!/^[0-9]{8}$/.test(ymd))return null;
  const day=Date.UTC(+ymd.slice(0,4),+ymd.slice(4,6)-1,+ymd.slice(6));
  if(!Number.isFinite(day)||new Date(day).toISOString().slice(0,10).replaceAll("-","")!==ymd)return null;
  const pairs=[["instagram","facebook"],["youtube","tiktok"],
               ["instagram","youtube"],["facebook","tiktok"]];
  return pairs[(Math.floor(day/86400000)+index)%4].slice();
 }
 const result=supplied.split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(result.length<1||result.length>NETWORKS.length||
    result.some(x=>!NETWORKS.includes(x))||new Set(result).size!==result.length)return null;
 return result;
}
function postBody(network,mediaId,video){
 const dateTime=video.slot.slotKst;
 const b={publicationDate:{dateTime,timezone:"Asia/Seoul"},
  text:video.caption+"\n\n#운보다 #생활꿀팁 #shorts",providers:[{network}],
  media:[{mediaId:String(mediaId)}],autoPublish:true,draft:false,
  saveExternalMediaFiles:true};
 if(network==="instagram")b.instagramData={type:"REEL",autoPublish:true,
   showReelOnFeed:true,isAiGenerated:true};
 if(network==="facebook")b.facebookData={type:"REEL",title:video.title};
 if(network==="youtube")b.youtubeData={type:"short",privacy:"public",
   madeForKids:false,title:video.title,isAiGeneratedContent:true};
 if(network==="tiktok")b.tiktokData={title:video.title,autoAddMusic:false,
   privacyOption:"PUBLIC_TO_EVERYONE",commercialContentOwnBrand:true,
   commercialContentThirdParty:false,isAigc:true};
 return b;
}
async function request(fetcher,url,token,{method="GET",body}={}){
 return await fetcher(url,{method,redirect:"error",cache:"no-store",
  signal:AbortSignal.timeout(25000),
  headers:{"X-Mc-Auth":token,Accept:"application/json",
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
 normalized.searchParams.set("url",video.videoUrl);
 let mediaId;
 try{
  const response=await request(fetcher,normalized.toString(),token);
  if(!response.ok)return fail("METRICOOL_MP4_NORMALIZATION_FAILED",{network});
  const data=await response.json();
  mediaId=data?.mediaId??data?.data?.mediaId??data?.id??data?.data?.id;
 }catch{return fail("METRICOOL_MP4_MEDIA_ID_MISSING",{network})}
 if(!(typeof mediaId==="string"||typeof mediaId==="number")||
    String(mediaId).length<4||String(mediaId).length>180)
   return fail("METRICOOL_NORMALIZATION_DID_NOT_RETURN_VIDEO_ID",{network});
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
  return {http:503,body:fail("TWO_CHANNEL_ORIGINAL_CLAIM_NOT_CONNECTED")};
 const fixedNetworks=rotation?null:enabledNetworks(env);
 if(!rotation&&(!fixedNetworks||typeof reserveSlot!=="function"))
  return {http:503,body:fail("PROVIDER_LIST_OR_ATOMIC_CLAIM_MISSING")};
 const video=await loadReleaseVideo({now,fetcher});
 if(video.state!=="ONE_KST_VIDEO_PUBLIC_MEDIA_VERIFIED")
  return {http:503,body:fail(video.reason,{slot:video.slot||null})};
 const networks=rotation?enabledNetworks(env,video.slot):fixedNetworks;
 if(!networks||typeof reserveSlot!=="function"||(rotation&&networks.length!==2))
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
  console.info("unboda_video_publish_cron",JSON.stringify({
   state:run.body.state,scheduledCount:run.body.scheduledCount??0,
   blockedCount:run.body.blockedCount??null,slot:run.body.expectedTimeKst??null}));
  res.statusCode=run.http;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  return res.end(JSON.stringify(run.body));
 };
}
module.exports={runVideoPublishCron,makeVideoHandler,postOne,postBody,enabledNetworks};
