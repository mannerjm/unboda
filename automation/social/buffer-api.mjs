// Read-only Buffer GraphQL API client; explicitly separate from the 48h buffer
// scheduler in buffer.mjs and from Metricool. NO LIVE PUBLISH is implemented.
// Docs: https://developers.buffer.com/guides/your-first-post.html
const API="https://api.buffer.com";
export const BUFFER_PILOT_SERVICES=Object.freeze(["instagram","tiktok","youtube"]);
const ORG_QUERY="query GetOrganizations { account { organizations { id name } } }";
function orgQuery(id){
 if(typeof id!=="string"||!/^[A-Za-z0-9_:-]{5,120}$/.test(id))
  throw Error("INVALID_BUFFER_ORGANIZATION_ID");
 return `query GetChannels { channels(input:{organizationId:${JSON.stringify(id)}}) {id name service} }`;
}
export async function bufferGraphQL({query,apiKey,fetcher=fetch}={}){
 if(!apiKey||typeof apiKey!=="string"||apiKey.length<10)
  return {state:"BLOCKED",reason:"BUFFER_API_KEY_NOT_CONFIGURED"};
 if(typeof query!=="string"||query.trim().length<15)
  return {state:"BLOCKED",reason:"GRAPHQL_QUERY_INVALID"};
 const response=await fetcher(API,{method:"POST",headers:{
  "Content-Type":"application/json","Authorization":"Bearer "+apiKey
 },body:JSON.stringify({query})});
 if(!response?.ok)return {state:"FAILED",httpStatus:response?.status??0,
  reason:"BUFFER_HTTP_ERROR",doNotBlindRetry:true};
 const data=await response.json();
 if(!data||!Array.isArray(data.errors)&&data.errors!==undefined)
  return {state:"FAILED",reason:"BUFFER_GRAPHQL_RESPONSE_INVALID"};
 if(data.errors?.length)return {state:"FAILED",reason:"BUFFER_GRAPHQL_ERRORS",
  errorCount:data.errors.length,doNotBlindRetry:true};
 return {state:"SUCCESS",data:data.data};
}
export async function getBufferOrganizations({apiKey,fetcher=fetch}={}){
 const r=await bufferGraphQL({query:ORG_QUERY,apiKey,fetcher});
 if(r.state!=="SUCCESS")return r;
 const rows=r.data?.account?.organizations;
 if(!Array.isArray(rows))return {state:"FAILED",reason:"ORGANIZATIONS_SCHEMA_INVALID"};
 return {state:"READ_ONLY_ORGANIZATIONS",organizations:rows.map(x=>({id:x.id,name:x.name}))};
}
export async function getBufferChannels({apiKey,organizationId,fetcher=fetch}={}){
 const r=await bufferGraphQL({query:orgQuery(organizationId),apiKey,fetcher});
 if(r.state!=="SUCCESS")return r;
 if(!Array.isArray(r.data?.channels))return {state:"FAILED",reason:"CHANNELS_SCHEMA_INVALID"};
 const channels=r.data.channels.map(x=>({id:x.id,name:x.name,service:x.service}));
 const services=new Set(channels.map(x=>x.service));
 return {state:"READ_ONLY_CHANNELS",organizationId,channels,
  verifiedServices:BUFFER_PILOT_SERVICES.filter(x=>services.has(x)),
  missingServices:BUFFER_PILOT_SERVICES.filter(x=>!services.has(x)),
  allThreeAvailable:BUFFER_PILOT_SERVICES.every(x=>services.has(x)),
  publishedAnything:false};
}
export function planBufferVideoPost({channelId,text,videoUrl,dueAt,service,
 rightsVerified=false,pronunciationVerified=false,mediaQA=false,
 editorialApproved=false,permanentPublicMediaVerified=false,
 remoteDuplicateCheckVerified=false,cloudLedgerReserved=false}={}){
 const reasons=[];
 if(!BUFFER_PILOT_SERVICES.includes(service))reasons.push("ONLY_PILOT_SERVICES_ALLOWED");
 if(typeof channelId!=="string"||!channelId)reasons.push("CHANNEL_ID_MISSING");
 if(typeof text!=="string"||text.trim().length<50)reasons.push("EDUCATIONAL_COPY_REQUIRED");
 if(service==="tiktok"&&typeof text==="string"&&text.length>150)
  reasons.push("TIKTOK_CAPTION_LIMIT_150");
 if(typeof videoUrl!=="string"||!/^https:\/\/[^\s?#]+\.mp4(?:\?.*)?$/i.test(videoUrl))
  reasons.push("DIRECT_PUBLIC_MP4_URL_REQUIRED");
 if(typeof dueAt!=="string"||Number.isNaN(Date.parse(dueAt))||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(dueAt))
  reasons.push("UTC_DATE_TIME_REQUIRED");
 for(const [ok,reason] of [
 [rightsVerified,"MEDIA_RIGHTS_REQUIRED"],[pronunciationVerified,"KOREAN_NARRATION_QA_REQUIRED"],
 [mediaQA,"REAL_MP4_QUALITY_QA_REQUIRED"],[editorialApproved,"EDITORIAL_APPROVAL_REQUIRED"],
 [permanentPublicMediaVerified,"STABLE_PUBLIC_MEDIA_REQUIRED"],
 [remoteDuplicateCheckVerified,"REMOTE_DUPLICATE_CHECK_REQUIRED"],
 [cloudLedgerReserved,"DURABLE_LEDGER_RESERVATION_REQUIRED"]
 ])if(ok!==true)reasons.push(reason);
 if(reasons.length)return {state:"BLOCKED",reasons};
 return {state:"PLAN_REQUIRES_EXPLICIT_LIVE_RELEASE",
  input:{channelId,text,mode:"customScheduled",schedulingType:"automatic",
   dueAt,assets:[{video:{url:videoUrl}}]},service,liveApiCallMade:false};
}
