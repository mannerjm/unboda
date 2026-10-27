"use strict";
// Independent read-only Metricool queue auditor. NEVER writes/creates posts.
const {timingSafeEqual}=require("node:crypto");
const USER_ID="5729495",BRAND_ID="7377653";
const HOST="https://app.metricool.com";
const KST_MS=9*60*60*1000;
function kstIso(ms){return new Date(ms+KST_MS).toISOString().slice(0,19);}
function secureEqual(a,b){
 if(typeof a!=="string"||typeof b!=="string"||b.length<32) return false;
 const x=Buffer.from(a),y=Buffer.from(b);
 return x.length===y.length && timingSafeEqual(x,y);
}
function slot(kind,at){
 const hour=((new Date(at+KST_MS).getUTCHours())%24);
 const minute=new Date(at+KST_MS).getUTCMinutes();
 return kind==="text-image"?minute===30 && (hour-1)%3===0:
        kind==="short-video"?minute===0 && [0,8,12,20].includes(hour):false;
}
function runtimeReady(env){
 return env.METRICOOL_API_TOKEN?.length>0 &&
 env.METRICOOL_USER_ID===USER_ID && env.METRICOOL_BLOG_ID===BRAND_ID &&
 env.SOCIAL_PUBLISH_ENABLED==="false"&&env.SOCIAL_PAID_GENERATION_ENABLED==="false";
}
async function audit(kind,{env=process.env,fetcher=fetch,now=Date.now()}={}){
 if(!["text-image","short-video"].includes(kind))return {status:400,body:{state:"INVALID_KIND"}};
 if(!runtimeReady(env))return {status:503,body:{state:"CLOSED_CONFIG",publishing:false}};
 const url=new URL("/api/v2/scheduler/posts",HOST);
 for(const [k,v] of Object.entries({
  userId:USER_ID,blogId:BRAND_ID,
  start:kstIso(now-24*60*60*1000),
  end:kstIso(now+72*60*60*1000),
  timezone:"Asia/Seoul",extendedRange:"false"}))url.searchParams.set(k,v);
 try{
  const r=await fetcher(url,{method:"GET",redirect:"error",cache:"no-store",
   signal:AbortSignal.timeout(14000),headers:{
    "X-Mc-Auth":env.METRICOOL_API_TOKEN,"Accept":"application/json"}});
  if(!r?.ok)return {status:502,body:{state:"UPSTREAM_UNAVAILABLE",upstreamStatus:Number(r?.status)||null,publishing:false}};
  const x=await r.json();
  const posts=Array.isArray(x)?x:Array.isArray(x?.data)?x.data:Array.isArray(x?.posts)?x.posts:null;
  if(!posts)return {status:502,body:{state:"UPSTREAM_SCHEMA_MISMATCH",publishing:false}};
  const counts={PENDING:0,PUBLISHED:0,FAILED:0,OTHER:0};
  let imagePosts=0,videoPosts=0;
  let nearNext=0;
  const fixedSlotVideoConflicts=[];
  for(const post of posts){
    const networks=Array.isArray(post?.providers)?post.providers:[];
    const kindVideo=networks.some(p=>["youtube","tiktok"].includes(p.network)||
       p?.type==="REEL"||p?.type==="SHORT")||
       ["REEL","TRIAL_REEL","STORY"].includes(String(post?.instagramData?.type??""))||
       ["REEL","STORY"].includes(String(post?.facebookData?.type??""));
    if(kindVideo)videoPosts++;else imagePosts++;
    const local=String(post?.publicationDate?.dateTime??"");
    const clock=/^\\d{4}-\\d{2}-\\d{2}T(\\d{2}):(\\d{2}):(\\d{2})/.exec(local);
    if(kindVideo&&post?.draft!==true&&post?.autoPublish===true&&
       networks.some(p=>["PENDING","SCHEDULED","QUEUED"].includes(p.status))&&
       clock&&Number(clock[3])===0){
      const ts=Date.parse(local.endsWith("Z")||/[+-]\\d{2}:\\d{2}$/.test(local)?local:local+"+09:00");
      if(Number.isFinite(ts)&&ts>=now&&ts<now+72*60*60*1000 &&
         !([0,8,12,20].includes(Number(clock[1]))&&Number(clock[2])===0)){
        fixedSlotVideoConflicts.push({dateKst:local.slice(0,16),
          networks:networks.filter(p=>["PENDING","SCHEDULED","QUEUED"].includes(p.status))
            .map(p=>String(p.network)).sort()});
      }
    }
    for(const n of networks){
     const key=String(n.status??"");
     counts[Object.hasOwn(counts,key)?key:"OTHER"]++;
    }
    const raw=post?.publicationDate?.dateTime;
    if(typeof raw==="string"){
      const eventMs=Date.parse(raw.endsWith("Z")||/[+-]\d{2}:\d{2}$/.test(raw)?raw:raw+"+09:00");
      if(Number.isFinite(eventMs)&&eventMs>=now&&eventMs<now+48*60*60*1000)nearNext++;
    }
  }
  return {status:200,body:{state:"READ_ONLY_AUDIT",kind,checkedAt:new Date(now).toISOString(),
   publishing:false,mediaGeneration:false,postItems:posts.length,
   perNetwork:counts,estimatedTextImageItems:imagePosts,estimatedVideoItems:videoPosts,
   next48hQueueItems:nearNext,quotaNotVerified:true,
   durableJobStoreNotConnected:true,
   fixedSlotVideoConflicts:fixedSlotVideoConflicts.slice(0,12),
   canEnableIndependentVideoPublisher:false,
   requiresExistingReservationsReview:fixedSlotVideoConflicts.length>0,
   source:"metricool_advanced_rest_get"}};
 }catch(_){
  return {status:502,body:{state:"UPSTREAM_NETWORK_OR_JSON_ERROR",publishing:false}};
 }
}
function handlerFor(kind,{env=process.env,fetcher=fetch,now=Date.now()}={}){
 return async (req,res)=>{
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Robots-Tag","noindex,nofollow");
  const auth=req?.headers?.authorization;
  if(!secureEqual(auth,`Bearer ${env.CRON_SECRET??""}`) ||
     req?.method!=="GET"){
   res.statusCode=401;return res.end("Unauthorized");
  }
  const result=await audit(kind,{env,fetcher,now});
  res.statusCode=result.status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  return res.end(JSON.stringify(result.body));
 };
}
module.exports={audit,handlerFor,secureEqual,slot,kstIso};
