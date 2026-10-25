// Buffer GraphQL automatic video scheduler. Importing does not post.
// Real POST is blocked without media, audio, budget, quotas, permanent URL,
// durable claimed job, remote duplicate check and explicit release switch.
// See https://developers.buffer.com/examples/create-video-post.html
import {createHash} from "node:crypto";
const ROOT="https://api.buffer.com";
const SAFE_VIDEO=/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[a-z0-9/_-]+\.mp4$/i;
const SERVICES=["instagram","tiktok","youtube"];
export function fingerprintVideo({channelId,dueAt,videoUrl}={}){
 return createHash("sha256").update([channelId,dueAt,videoUrl].join("|")).digest("hex");
}
export function planAutomaticBufferVideo(o={}){
 const {organizationId,channelId,service,text,videoUrl,dueAt,videoDurationSeconds}=o;
 const reasons=[];
 if(typeof organizationId!=="string"||organizationId.length<5)reasons.push("ORGANIZATION_ID_REQUIRED");
 if(typeof channelId!=="string"||channelId.length<3)reasons.push("CHANNEL_ID_REQUIRED");
 if(!SERVICES.includes(service))reasons.push("SERVICE_NOT_CONNECTED");
 if(typeof text!=="string"||text.length<50)reasons.push("EDUCATIONAL_TEXT_REQUIRED");
 if(service==="tiktok"&&text?.length>150)reasons.push("TIKTOK_TEXT_TOO_LONG");
 if(typeof videoUrl!=="string"||!SAFE_VIDEO.test(videoUrl))
  reasons.push("FINAL_PERMANENT_PUBLIC_MP4_REQUIRED");
 if(!Number.isFinite(videoDurationSeconds)||videoDurationSeconds<15||videoDurationSeconds>45)
  reasons.push("FINAL_VIDEO_DURATION_REQUIRED");
 if(typeof dueAt!=="string"||!/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(dueAt)||
   Number.isNaN(Date.parse(dueAt)))reasons.push("UTC_DUE_AT_REQUIRED");
 const gates={
  mediaRightsApproved:"MEDIA_LICENSE_QA",
  editorialFactChecked:"EDUCATIONAL_FACT_CHECK",
  koreanSpeechVerified:"KOREAN_VOICE_QA",
  audioRightsVerified:"COMMERCIAL_AUDIO_LICENSE_QA",
  mediaProbeVerified:"FFPROBE_QA",
  mediaBitstreamVerified:"FFMPEG_DECODE_QA",
  captionSafeAreaVerified:"SUBTITLE_SAFE_AREA_QA",
  bakedTextLayerIsolationVerified:"BAKED_TEXT_DOUBLE_OVERLAY_RISK",
  renderedFrameVisualReviewApproved:"RENDERED_VISUAL_FRAME_REVIEW_REQUIRED",
  sourceNotRepeated:"ORIGINALITY_QA",
  permanentMediaHeadVerified:"HOSTED_MEDIA_HEAD",
  mediaIsFinal30Sec:"FINAL_30SEC_VIDEO_REQUIRED",
  channelAutoPublishConfirmed:"CHANNEL_AUTOMATIC_MODE_UNVERIFIED",
  accountQuotaConfirmed:"ACCOUNT_QUOTA_UNVERIFIED",
  remoteDeduplicationConfirmed:"REMOTE_DUPLICATE_CHECK_REQUIRED",
  durableLedgerClaimed:"LEDGER_LOCK_REQUIRED",
  budgetAuthorized:"MONTHLY_BUDGET_REQUIRED",
  livePublishEnabled:"LIVE_PUBLISH_DISABLED"
 };
 for(const [name,reason] of Object.entries(gates))
  if(o[name]!==true)reasons.push(reason);
 return {state:reasons.length?"BLOCKED":"READY",reasons,
  ...(reasons.length?{}:{fingerprint:fingerprintVideo(o)})};
}
export function bufferVideoMutation(o={}){
 const plan=planAutomaticBufferVideo(o);
 if(plan.state!=="READY")throw Error("BUFFER_MUTATION_NOT_APPROVED");
 return ["mutation ScheduleUNBODAVideo {",
 "createPost(input: {",
 "text: "+JSON.stringify(o.text),
 "channelId: "+JSON.stringify(o.channelId),
 "schedulingType: automatic",
 "mode: customScheduled",
 "dueAt: "+JSON.stringify(o.dueAt),
 "assets: [{video: {url: "+JSON.stringify(o.videoUrl)+", metadata: {thumbnailOffset: 1000}}}]",
 "}) { __typename",
 "... on PostActionSuccess { post {id status dueAt channelId} }",
 "... on MutationError { message }",
 "} }"].join("\n");
}
export function bufferRecentPostQuery({organizationId,channelId}={}){
 if(typeof organizationId!=="string"||organizationId.length<5||
    typeof channelId!=="string"||channelId.length<3)
  throw Error("BUFFER_LOOKUP_IDS_REQUIRED");
 return ["query RecentUNBODAPosts {",
 "posts(first: 50, input: {",
 "organizationId: "+JSON.stringify(organizationId),
 "filter: {channelIds: ["+JSON.stringify(channelId)+"]}",
 "sort: [{field: createdAt, direction: desc}]",
 "}) {",
 "edges {node {id text status dueAt channelId}}",
 "pageInfo {hasNextPage endCursor}",
 "} }"].join("\n");
}
async function graphql({apiKey,query,fetcher}){
 try{
  const res=await fetcher(ROOT,{method:"POST",headers:{
   Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},
   body:JSON.stringify({query}),signal:AbortSignal.timeout(12000)});
  if(!res?.ok)return {state:"FAILED",httpStatus:res?.status??0};
  const json=await res.json();
  if(json?.errors?.length||!json?.data)return {state:"FAILED"};
  return {state:"SUCCESS",data:json.data};
 }catch{return {state:"FAILED"}}
}
export async function reconcileBufferVideo({apiKey,organizationId,channelId,text,dueAt,fetcher=fetch}={}){
 if(typeof apiKey!=="string"||apiKey.length<10)
  return {state:"BLOCKED_KEY_MISSING"};
 let query;
 try{query=bufferRecentPostQuery({organizationId,channelId})}
 catch{return {state:"INVALID_LOOKUP"}}
 const r=await graphql({apiKey,query,fetcher});
 if(r.state!=="SUCCESS")return {state:"UNKNOWN_REMOTE_STATUS"};
 const data=r.data.posts;
 if(!Array.isArray(data?.edges)||typeof data?.pageInfo?.hasNextPage!=="boolean")
  return {state:"INCOMPLETE_REMOTE_RESPONSE"};
 const matches=data.edges.map(x=>x?.node).filter(x=>
  x?.text===text&&x?.dueAt===dueAt&&x?.channelId===channelId);
 if(matches.length>1)return {state:"DUPLICATES_HOLD"};
 if(matches.length===1)return {state:"REMOTE_POST_EXISTS",post:matches[0]};
 if(data.pageInfo.hasNextPage)return {state:"PAGINATED_UNVERIFIED_HOLD"};
 return {state:"REMOTE_NO_MATCH_VERIFIED"};
}
export async function scheduleAutomaticBufferVideo({
 apiKey,options,ledger,fetcher=fetch,livePublishEnabled=false
}={}){
 const p=planAutomaticBufferVideo({...options,livePublishEnabled});
 if(p.state!=="READY")return p;
 if(typeof apiKey!=="string"||apiKey.length<10)
  return {state:"BLOCKED",reasons:["BUFFER_KEY_MISSING"]};
 if(typeof ledger?.claim!=="function"||typeof ledger?.recordPost!=="function")
  return {state:"BLOCKED",reasons:["DURABLE_LEDGER_MISSING"]};
 if(await ledger.claim(p.fingerprint)!==true)
  return {state:"DUPLICATE_JOB_BLOCKED"};
 const pre=await reconcileBufferVideo({apiKey,fetcher,
  organizationId:options.organizationId,channelId:options.channelId,
  text:options.text,dueAt:options.dueAt});
 if(pre.state!=="REMOTE_NO_MATCH_VERIFIED")
  return {state:"REMOTE_STATUS_HOLD",reason:pre.state};
 const q=bufferVideoMutation({...options,livePublishEnabled});
 const r=await graphql({apiKey,query:q,fetcher});
 if(r.state!=="SUCCESS")return {state:"UNKNOWN_POST_RESULT_DO_NOT_RETRY",
  doNotBlindRetry:true};
 const x=r.data.createPost;
 if(x?.__typename!=="PostActionSuccess"||!x?.post?.id||
   x?.post?.channelId!==options.channelId)
  return {state:"UNKNOWN_POST_RESULT_DO_NOT_RETRY",doNotBlindRetry:true};
 try{await ledger.recordPost({fingerprint:p.fingerprint,remotePostId:x.post.id})}
 catch{return {state:"POST_EXISTS_LEDGER_RECORD_UNCONFIRMED_DO_NOT_RETRY",
  postId:x.post.id}};
 return {state:"SCHEDULED_NOT_PUBLISHED",postId:x.post.id,
  status:x.post.status,dueAt:x.post.dueAt,
  publishedVerified:false,needsFutureReconciliation:true};
}
