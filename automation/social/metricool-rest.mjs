// Metricool Advanced/Custom independent REST client, distinct from ChatGPT MCP.
// Ref: https://help.metricool.com/basic-guide-for-api-integration-r97af
// ALL real calls require a purchased plan, a private token, public permanent media
// and an external durable ledger. Never create post on ambiguous remote state.
const ORIGIN="https://app.metricool.com/api";
const CHANNEL_TYPES={
 instagram:"REEL",facebook:"REEL",tiktok:"VIDEO",youtube:"short"
};
const HTTPS=/^https:\/\/[^\s/]+\/\S+/i;
export function mediaIdFromNormalizeResponse(data){
 // API response parsing will be verified against the owner's actual REST account.
 const d=data?.data??data;
 const id=d?.mediaId??d?.media?.mediaId??d?.id;
 if(typeof id==="string"&&id.length>0)return id;
 if(Number.isSafeInteger(id)&&id>0)return String(id);
 throw Error("METRICOOL_NORMALIZE_MEDIA_ID_NOT_VERIFIED");
}
export function createIndependentVideoPost({network,mediaId,text,title,dateTime}={}){
 if(!Object.hasOwn(CHANNEL_TYPES,network))throw Error("VIDEO_NETWORK_UNSUPPORTED");
 if(!mediaId||typeof mediaId!=="string")throw Error("MEDIA_ID_REQUIRED");
 if(typeof text!=="string"||text.length<80)throw Error("EDUCATIONAL_CAPTION_REQUIRED");
 if(typeof title!=="string"||title.length<5)throw Error("VIDEO_TITLE_REQUIRED");
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateTime??""))
  throw Error("INVALID_DATE");
 const body={
  publicationDate:{dateTime,timezone:"Asia/Seoul"},
  providers:[{network}],text,
  media:{mediaId},draft:false,autoPublish:true
 };
 if(network==="instagram")body.instagramData={type:"REEL",showReelOnFeed:true,isAiGenerated:true};
 if(network==="facebook")body.facebookData={type:"REEL"};
 if(network==="youtube")body.youtubeData={title,type:"short",privacy:"public",
  madeForKids:false,isAiGeneratedContent:true};
 if(network==="tiktok")body.tiktokData={title,
  privacyOption:"PUBLIC_TO_EVERYONE",commercialContentOwnBrand:true,
  commercialContentThirdParty:false,isAigc:true};
 return body;
}
function endpoint(path,env){
 const url=new URL(ORIGIN+path);
 url.searchParams.set("userId",env.METRICOOL_USER_ID);
 url.searchParams.set("blogId",env.METRICOOL_BLOG_ID);
 return url;
}
function authHeaders(env){return {"X-Mc-Auth":env.METRICOOL_API_TOKEN,
  "Content-Type":"application/json"};}
function validateEnvironment(env){
 if(!env||!env.METRICOOL_API_TOKEN||!env.METRICOOL_BLOG_ID||
  !env.METRICOOL_USER_ID)throw Error("METRICOOL_REST_CREDENTIALS_MISSING");
 if(env.METRICOOL_BLOG_ID!=="7377653"||env.METRICOOL_USER_ID!=="5729495")
  throw Error("METRICOOL_ACCOUNT_IDENTITY_MISMATCH");
}
// Media must be permanent public HTTPS; signed expiring links don't qualify.
export async function normalizeVideoMedia({mediaUrl,env={},fetcher=fetch,rightsVerified=false,
 permanentPublicMediaVerified=false,allowExternalAccess=false}={}){
 if(!allowExternalAccess||!rightsVerified||!permanentPublicMediaVerified||
  typeof mediaUrl!=="string"||!HTTPS.test(mediaUrl))
  return {state:"BLOCKED",reason:"MEDIA_RIGHTS_URL_OR_ACCESS_NOT_VERIFIED"};
 validateEnvironment(env);
 const url=endpoint("/actions/normalize/image/url",env);
 url.searchParams.set("url",mediaUrl);
 const res=await fetcher(url,{method:"GET",headers:authHeaders(env)});
 if(!res.ok)return {state:"FAILED",status:res.status};
 const data=await res.json();
 try{return {state:"NORMALIZED",mediaId:mediaIdFromNormalizeResponse(data)};}
 catch{return {state:"BLOCKED",reason:"MEDIA_ID_RESPONSE_SCHEMA_UNVERIFIED"};}
}
export async function createScheduledVideoRest({
 network,mediaId,text,title,dateTime,env={},fetcher=fetch,
 allowLive=false,durableReservationConfirmed=false,quotaVerified=false,
 commerciallyApproved=false,ownerCostApproval=false,
 uniqueJobKey=null,remoteDuplicateCheckConfirmed=false
}={}){
 const gates={allowLive,durableReservationConfirmed,quotaVerified,
  commerciallyApproved,ownerCostApproval,remoteDuplicateCheckConfirmed,
  uniqueJobKey:typeof uniqueJobKey==="string"&&uniqueJobKey.length>=20};
 if(!Object.values(gates).every(x=>x===true))
  return {state:"BLOCKED",reason:"PRODUCTION_VIDEO_RELEASE_GATES_NOT_MET",
    missing:Object.entries(gates).filter(([k,v])=>v!==true).map(([k])=>k)};
 validateEnvironment(env);
 const body=createIndependentVideoPost({network,mediaId,text,title,dateTime});
 const res=await fetcher(endpoint("/v2/scheduler/posts",env),{
  method:"POST",headers:authHeaders(env),body:JSON.stringify(body)
 });
 if(!res.ok)return {state:"UNKNOWN_REMOTE_OUTCOME_RECONCILE_FIRST",
  httpStatus:res.status,doNotBlindRetry:true};
 const data=await res.json();
 const postId=data?.id??data?.data?.id;
 if((typeof postId!=="string"||!postId)&&!Number.isSafeInteger(postId))
  return {state:"UNKNOWN_REMOTE_OUTCOME_RECONCILE_FIRST",
   reason:"POST_ID_NOT_CONFIRMED",doNotBlindRetry:true};
 return {state:"SCHEDULE_REQUEST_ACCEPTED_NEEDS_GET_VERIFICATION",
  externalPostId:String(postId),network,doNotCallPublished:true};
}
export async function confirmScheduledVideoRest({externalPostId,env={},fetcher=fetch,
 expectedNetwork,expectedMediaId}={}){
 validateEnvironment(env);
 if(!/^[0-9]{1,24}$/.test(String(externalPostId)))throw Error("UNVERIFIED_POST_ID");
 const res=await fetcher(endpoint("/v2/scheduler/posts/"+externalPostId,env),{
  method:"GET",headers:authHeaders(env)
 });
 if(!res.ok)return {state:"VERIFY_FAILED",httpStatus:res.status};
 const raw=await res.json(),item=raw?.data??raw;
 const provider=item?.providers?.find(p=>p.network===expectedNetwork);
 if(item?.autoPublish!==true||!provider||(!item.media||JSON.stringify(item.media).includes(expectedMediaId)===false))
  return {state:"VERIFY_FAILED",reason:"SCHEDULED_MEDIA_OR_ACCOUNT_MISMATCH"};
 return {state:provider.status==="PUBLISHED"?"PUBLISHED":"SCHEDULED_NEEDS_FINAL_PUBLICATION_CHECK",
  externalPostId:String(externalPostId),providerStatus:provider.status,
  publicUrl:provider.publicUrl??null};
}
