// Metricool Advanced REST: one network / one original MP4 / one KST video slot.
// Self-contained safety gate: NEVER schedule until full media+rights+budget,
// provider slot uniqueness and source approval are independently proven.
// Defaults to BLOCKED. No automatic retry after a write or ambiguous response.
const BRAND='7377653', USER='5729495';
const API='https://app.metricool.com/api/v2/scheduler/posts';
const NETWORKS=new Set(['instagram','facebook','tiktok','youtube','threads']);
const deny=(reason,extra={})=>Object.freeze({state:'BLOCKED',reason,scheduled:false,...extra});
const R=/^[a-f0-9]{64}$/;
function publicBlob(u,ext){
 try{
  const x=new URL(u);
  return x.protocol==='https:'&&!x.username&&!x.password&&!x.search&&!x.hash&&
   /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i.test(x.hostname)&&
   x.pathname.startsWith('/unboda-social/')&&x.pathname.endsWith('.'+ext);
 }catch{return false;}
}
function localTime(ms){
 const day=new Date(ms+9*3600000).toISOString().slice(0,19);
 return day;
}
function bodyFor({network,when,videoUrl,coverUrl,title,caption}){
 const post={publicationDate:{dateTime:when,timezone:'Asia/Seoul'},
  text:caption,media:[videoUrl],mediaAltText:[],saveExternalMediaFiles:true,
  autoPublish:true,draft:false,providers:[{network}]};
 if(network==='instagram')post.instagramData={type:'REEL',showReelOnFeed:true,isAiGenerated:true};
 if(network==='facebook')post.facebookData={type:'REEL',title};
 if(network==='youtube')post.youtubeData={type:'short',title,privacy:'public',
  madeForKids:false,isAiGeneratedContent:true};
 if(network==='tiktok')post.tiktokData={privacyOption:'PUBLIC_TO_EVERYONE',
  commercialContentOwnBrand:true,commercialContentThirdParty:false,
  title,isAigc:true,autoAddMusic:false};
 if(network==='threads')post.threadsData={};
 // Cover can be set separately after provider media-normalization proofs.
 // Never attach a fabricated CDN image or a mismatching thumbnail.
 if(coverUrl)post.videoThumbnailUrl=coverUrl;
 return post;
}
export function planSingleNetworkVideoSchedule({
 network,slotMs,nowMs,videoUrl,coverUrl,sha256,title,caption,
 approvals,archive,mediaVerified,slotClaim,
}={}){
 if(!NETWORKS.has(network))return deny('CONNECTED_VIDEO_PROVIDER_REQUIRED');
 if(!Number.isFinite(slotMs)||!Number.isFinite(nowMs)||
   slotMs<nowMs+15*60000||slotMs>nowMs+7*86400000||
   !/T(?:00|08|12|20):00:00$/.test(localTime(slotMs)))
   return deny('VALID_FUTURE_FOUR_KST_SLOT_REQUIRED');
 if(!R.test(sha256??'')||!publicBlob(videoUrl,'mp4'))
   return deny('PERMANENT_PUBLIC_VERCEL_MP4_REQUIRED');
 if(coverUrl!==undefined&&coverUrl!==null&&!publicBlob(coverUrl,'jpg'))
   return deny('PERMANENT_JPEG_COVER_REQUIRED');
 if(typeof title!=='string'||title.length<5||title.length>70||
  typeof caption!=='string'||caption.length<20||caption.length>900)
  return deny('COVER_TITLE_AND_CAPTION_REQUIRED');
 if(approvals?.humanVideoQuality!==true||
  approvals?.commercialSourceRights!==true||
  approvals?.commercialKoreanVoiceRights!==true||
  approvals?.thumbnailReviewed!==true||
  approvals?.fullPublishedHistoryReviewed!==true||
  approvals?.socialPublishOwnerApproved!==true)
  return deny('CONTENT_RIGHTS_HUMAN_QUALITY_AND_HISTORY_APPROVAL_REQUIRED');
 if(archive?.state!=='PUBLIC_BLOB_FULL_READBACK_SHA_VERIFIED'||
   archive?.sha256!==sha256||archive?.publicUrl!==videoUrl||
   archive?.originalBytesSha256!==sha256||mediaVerified!==true)
  return deny('REMOTE_MEDIA_BYTES_AND_SHA_PROOF_REQUIRED');
 if(slotClaim?.state!=='EXCLUSIVE_UNPUBLISHED_SLOT_CLAIM'||
   slotClaim?.brandId!==BRAND||slotClaim?.network!==network||
   slotClaim?.sha256!==sha256||slotClaim?.scheduledFor!==new Date(slotMs).toISOString())
  return deny('ATOMIC_DUPLICATE_SLOT_RESERVATION_REQUIRED');
 return Object.freeze({state:'REVIEWED_VIDEO_SCHEDULING_PLAN',
  network,sha256,slotMs,body:bodyFor({network,when:localTime(slotMs),
   videoUrl,coverUrl,title,caption}),brandId:BRAND,userId:USER,
  scheduled:false,publicationProved:false});
}
function parsePosts(data){
 return Array.isArray(data)?data:Array.isArray(data?.data)?data.data:
  Array.isArray(data?.posts)?data.posts:null;
}
function networksOf(post){return Array.isArray(post?.providers)?
  post.providers.map(x=>x?.network).filter(Boolean):[];}
export async function scheduleSingleMetricoolVideo({
 plan,env,fetcher=fetch,confirmWriteReserved
}={}){
 if(plan?.state!=='REVIEWED_VIDEO_SCHEDULING_PLAN'||
    !NETWORKS.has(plan.network)||plan.brandId!==BRAND||plan.userId!==USER)
  return deny('VERIFIED_SCHEDULE_PLAN_REQUIRED');
 if(env?.SOCIAL_PUBLISH_ENABLED!=='true'||
   env?.METRICOOL_USER_ID!==USER||env?.METRICOOL_BLOG_ID!==BRAND||
   typeof env?.METRICOOL_API_TOKEN!=='string'||env.METRICOOL_API_TOKEN.length<20||
   typeof confirmWriteReserved!=='function')
  return deny('LIVE_PUBLISHING_RUNTIME_NOT_OWNER_ENABLED');
 const auth={'X-Mc-Auth':env.METRICOOL_API_TOKEN,Accept:'application/json'};
 const url=new URL(API);url.searchParams.set('blogId',BRAND);url.searchParams.set('userId',USER);
 const from=localTime(plan.slotMs-60000),to=localTime(plan.slotMs+60000);
 url.searchParams.set('start',from);url.searchParams.set('end',to);
 url.searchParams.set('timezone','Asia/Seoul');
 let existing;
 try{
  const r=await fetcher(url.toString(),{method:'GET',headers:auth,redirect:'error',
   signal:AbortSignal.timeout(15000),cache:'no-store'});
  if(!r?.ok)return deny('METRICOOL_EXISTING_SLOTS_NOT_VERIFIED');
  existing=parsePosts(await r.json());
 }catch{return deny('METRICOOL_PREWRITE_READ_FAILED');}
 if(!existing)return deny('METRICOOL_SCHEDULE_LIST_FORMAT_UNVERIFIED');
 const slot=localTime(plan.slotMs);
 if(existing.some(p=>String(p?.publicationDate?.dateTime??'')===slot&&
     networksOf(p).includes(plan.network)))
  return deny('EXISTING_POST_AT_NETWORK_AND_KST_SLOT');
 let claim;
 try{claim=await confirmWriteReserved({network:plan.network,
   scheduledFor:new Date(plan.slotMs).toISOString(),sha256:plan.sha256});}
 catch{return deny('DURABLE_BEFORE_WRITE_CLAIM_UNAVAILABLE');}
 if(claim?.state!=='SINGLE_WRITE_PERSISTENTLY_AUTHORIZED'||
    claim?.noPreviousRequest!==true)
  return deny('PUBLISH_WRITE_ALREADY_STARTED_NO_BLIND_RETRY');
 // IMPORTANT: saveExternalMediaFiles is required for public mp4 URL ingestion.
 const createUrl=new URL(API);createUrl.searchParams.set('userId',USER);
 createUrl.searchParams.set('blogId',BRAND);
 let response;
 try{response=await fetcher(createUrl.toString(),{
  method:'POST',headers:{...auth,'Content-Type':'application/json'},
  body:JSON.stringify(plan.body),redirect:'error',
  signal:AbortSignal.timeout(25000)
 });}catch{return deny('POST_OUTCOME_UNKNOWN_RECONCILE_WITH_METRICOOL',{doNotBlindlyRetry:true});}
 if(!response?.ok)return deny('POST_REJECTED_OR_UNCERTAIN_RECONCILE',{doNotBlindlyRetry:true,
  upstreamHttpStatus:response?.status||null});
 let posted;try{posted=await response.json()}catch{return deny('POST_RECEIPT_UNREADABLE_RECONCILE',{doNotBlindlyRetry:true})}
 const id=posted?.id??posted?.data?.id;
 if(!Number.isSafeInteger(Number(id))||Number(id)<=0)
  return deny('POST_RECEIPT_WITHOUT_ID_RECONCILE',{doNotBlindlyRetry:true});
 // A creation receipt proves only SCHEDULED. A separate future platform read
 // must confirm PUBLISHED and an independently reachable live video URL.
 return Object.freeze({state:'METRICOOL_VIDEO_SCHEDULED_UNVERIFIED',
  metricoolPostId:Number(id),network:plan.network,scheduledFor:new Date(plan.slotMs).toISOString(),
  sourceSha256:plan.sha256,providerPublished:false,publicSocialUrl:null,
  verifyAfterScheduledTime:true,doNotBlindlyRetry:true});
}
