import {checkContent} from "./safety.mjs";
export function createPayload({post,mediaUrl,dateTime,network}){
 if(!["instagram","youtube"].includes(network))throw Error("NETWORK_NOT_SUPPORTED");
 if(!/^https:\/\/static\.metricool\.com\//.test(mediaUrl??""))throw Error("METRICOOL_NORMALIZED_MEDIA_REQUIRED");
 const base={publicationDate:{dateTime,timezone:"Asia/Seoul"},text:post.caption,providers:[{network}],media:[mediaUrl],autoPublish:true,draft:false};
 if(network==="instagram")return {...base,instagramData:{type:"REEL",showReelOnFeed:true,isAiGenerated:true}};
 return {...base,youtubeData:{title:post.title,type:"short",privacy:"public",madeForKids:false,isAiGeneratedContent:true}};
}
export async function schedule({post,history=[],mediaUrl,dateTime,network,allowLive=false,fetcher=fetch,env=process.env}){
 const review=checkContent(post,history);
 if(!review.ok)return {state:"BLOCKED",reason:review.problems};
 if(!allowLive||env.SOCIAL_PUBLISH_ENABLED!=="true")return {state:"DRY_RUN",reason:"PUBLISH_SWITCH_OFF"};
 if(!env.METRICOOL_API_TOKEN||!env.METRICOOL_USER_ID||!env.METRICOOL_BLOG_ID)throw Error("METRICOOL_TOKEN_OR_ACCOUNT_MISSING");
 const body=createPayload({post,mediaUrl,dateTime,network});
 const url=new URL("https://app.metricool.com/api/v2/scheduler/posts");
 url.searchParams.set("userId",env.METRICOOL_USER_ID);url.searchParams.set("blogId",env.METRICOOL_BLOG_ID);
 const res=await fetcher(url,{method:"POST",headers:{"X-Mc-Auth":env.METRICOOL_API_TOKEN,"Content-Type":"application/json"},body:JSON.stringify(body)});
 if(!res.ok)throw Error("METRICOOL_POST_ERROR_"+res.status);
 return {state:"SCHEDULED",result:await res.json()};
}
