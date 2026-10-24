import {checkContent} from "./safety.mjs";

// Format-specific payloads stay OFF in production until public media hosting,
// durable idempotency and authenticated video E2E are independently verified.
const FORMATS={
 instagram:["reel","story","post"],
 facebook:["reel","story","post"],
 youtube:["short"],
};
export function createPayload({post,mediaUrl,dateTime,network,postType}){
 if(!Object.hasOwn(FORMATS,network))throw Error("NETWORK_NOT_SUPPORTED");
 const type=postType??(network==="youtube"?"short":"reel");
 if(!FORMATS[network].includes(type))throw Error("FORMAT_NOT_SUPPORTED");
 if(!/^https:\/\/static\.metricool\.com\//.test(mediaUrl??""))throw Error("METRICOOL_NORMALIZED_MEDIA_REQUIRED");
 const requiresVideo=type==="reel"||type==="short";
 if(requiresVideo&&(!post.video||!/\.mp4(?:[?#]|$)/i.test(mediaUrl)))throw Error("VIDEO_MEDIA_REQUIRED");
 const base={
  publicationDate:{dateTime,timezone:"Asia/Seoul"},
  providers:[{network}],
  media:[mediaUrl],
  autoPublish:true,
  draft:false,
 };
 // Neither Instagram nor Facebook Stories have a post caption.
 if(type!=="story")base.text=post.caption;
 if(network==="instagram")return {...base,instagramData:{
  type:{reel:"REEL",story:"STORY",post:"POST"}[type],
  ...(type==="reel"?{showReelOnFeed:true}:{}),
  isAiGenerated:!!post.isAiGeneratedDeclared,
 }};
 if(network==="facebook")return {...base,facebookData:{
  type:{reel:"REEL",story:"STORY",post:"POST"}[type],
 }};
 return {...base,youtubeData:{
  title:post.title,type:"short",privacy:"public",madeForKids:false,
  isAiGeneratedContent:!!post.isAiGeneratedDeclared,
 }};
}
export async function schedule({post,history=[],mediaUrl,dateTime,network,postType,allowLive=false,fetcher=fetch,env=process.env}){
 const review=checkContent(post,history);
 if(!review.ok)return {state:"BLOCKED",reason:review.problems};
 if(!allowLive||env.SOCIAL_PUBLISH_ENABLED!=="true")return {state:"DRY_RUN",reason:"PUBLISH_SWITCH_OFF"};
 if(!env.METRICOOL_API_TOKEN||!env.METRICOOL_USER_ID||!env.METRICOOL_BLOG_ID)throw Error("METRICOOL_TOKEN_OR_ACCOUNT_MISSING");
 const body=createPayload({post,mediaUrl,dateTime,network,postType});
 const url=new URL("https://app.metricool.com/api/v2/scheduler/posts");
 url.searchParams.set("userId",env.METRICOOL_USER_ID);url.searchParams.set("blogId",env.METRICOOL_BLOG_ID);
 const res=await fetcher(url,{method:"POST",headers:{"X-Mc-Auth":env.METRICOOL_API_TOKEN,"Content-Type":"application/json"},body:JSON.stringify(body)});
 if(!res.ok)throw Error("METRICOOL_POST_ERROR_"+res.status);
 return {state:"SCHEDULED",result:await res.json()};
}
