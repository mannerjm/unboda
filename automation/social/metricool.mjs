import {checkContent} from "./safety.mjs";

// All account write access is disabled unless the opt-in flag AND caller opt-in
// are BOTH true. The separate Metricool Advanced/Custom REST API is not connected.
const FORMATS={
 instagram:["reel","story","post"],
 facebook:["reel","story","post"],
 threads:["post"],
 tiktok:["video"],
 youtube:["short"]
};
export function createPayload({post,mediaUrl,dateTime,network,postType}){
 if(!Object.hasOwn(FORMATS,network))throw Error("NETWORK_NOT_SUPPORTED");
 const type=postType??(network==="youtube"?"short":network==="tiktok"?"video":
  network==="threads"?"post":post.video?"reel":"post");
 if(!FORMATS[network].includes(type))throw Error("FORMAT_NOT_SUPPORTED");
 if(!/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}$/.test(dateTime??""))
  throw Error("INVALID_PUBLICATION_DATE");
 if(!/^https:\/\/static\.metricool\.com\//.test(mediaUrl??""))
  throw Error("METRICOOL_NORMALIZED_MEDIA_REQUIRED");
 const requiresVideo=["reel","short","video"].includes(type);
 if(requiresVideo&&(!post.video||!/\.mp4(?:[?#]|$)/i.test(mediaUrl)))
  throw Error("VIDEO_MEDIA_REQUIRED");
 if(!requiresVideo&&type==="post"&&!/\.(png|jpg|jpeg|webp)(?:[?#]|$)/i.test(mediaUrl))
  throw Error("IMAGE_MEDIA_REQUIRED");
 const base={
  publicationDate:{dateTime,timezone:"Asia/Seoul"},
  providers:[{network}],media:[mediaUrl],autoPublish:true,draft:false
 };
 if(type!=="story")base.text=post.caption;
 if(network==="instagram")return {...base,instagramData:{
  type:{reel:"REEL",story:"STORY",post:"POST"}[type],
  ...(type==="reel"?{showReelOnFeed:true}:{}),
  isAiGenerated:!!post.isAiGeneratedDeclared
 }};
 if(network==="facebook")return {...base,facebookData:{
  type:{reel:"REEL",story:"STORY",post:"POST"}[type]
 }};
 if(network==="tiktok")return {...base,tiktokData:{
  title:post.title.slice(0,150),
  privacyOption:"PUBLIC_TO_EVERYONE",
  commercialContentOwnBrand:true,
  commercialContentThirdParty:false,
  isAigc:!!post.isAiGeneratedDeclared
 }};
 if(network==="threads")return base;
 return {...base,youtubeData:{
  title:post.title,type:"short",privacy:"public",madeForKids:false,
  isAiGeneratedContent:!!post.isAiGeneratedDeclared
 }};
}
export async function schedule({post,history=[],mediaUrl,dateTime,network,postType,
 allowLive=false,fetcher=fetch,env=process.env}){
 const review=checkContent(post,history);
 if(!review.ok)return {state:"BLOCKED",reason:review.problems};
 if(!allowLive||env.SOCIAL_PUBLISH_ENABLED!=="true")
  return {state:"DRY_RUN",reason:"PUBLISH_SWITCH_OFF"};
 if(!env.METRICOOL_API_TOKEN||!env.METRICOOL_USER_ID||!env.METRICOOL_BLOG_ID)
  throw Error("METRICOOL_TOKEN_OR_ACCOUNT_MISSING");
 if(env.SOCIAL_DURABLE_LEDGER_READY!=="true"||
    env.SOCIAL_ACCOUNT_QUOTA_VERIFIED!=="true"||
    env.SOCIAL_MEDIA_PUBLIC_URL_VERIFIED!=="true")
  throw Error("LIVE_SAFETY_PREREQUISITES_MISSING");
 const body=createPayload({post,mediaUrl,dateTime,network,postType});
 const url=new URL("https://app.metricool.com/api/v2/scheduler/posts");
 url.searchParams.set("userId",env.METRICOOL_USER_ID);
 url.searchParams.set("blogId",env.METRICOOL_BLOG_ID);
 const res=await fetcher(url,{method:"POST",headers:{
  "X-Mc-Auth":env.METRICOOL_API_TOKEN,"Content-Type":"application/json"
 },body:JSON.stringify(body)});
 if(!res.ok)throw Error("METRICOOL_POST_ERROR_"+res.status);
 const data=await res.json();
 // REST response still needs an independent account status check before
 // it can be called PUBLISHED; scheduling a request is not publication.
 return {state:"SCHEDULE_REQUEST_ACCEPTED",result:data};
}
