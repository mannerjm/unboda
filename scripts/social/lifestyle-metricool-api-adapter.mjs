#!/usr/bin/env node
/**
 * UNBODA Metricool HTTP adapter for the protected single-submit scheduler.
 * No token is stored in this repository; production Vercel secret injection
 * is required. Merely importing this file cannot make a network request.
 * Provider is authoritative for PENDING/PUBLISHED/ERROR/DRAFT by network.
 */
const ENDPOINT="https://app.metricool.com/api/v2/scheduler/posts";
const BRAND="7377653";
const NETWORK_DATA={
 facebook:{"facebookData":{"type":"POST"}},
 instagram:{"instagramData":{"type":"POST","isAiGenerated":false}},
 threads:{"threadsData":{}}
};
const HOURS={"01":"facebook","04":"instagram","10":"threads",
 "13":"facebook","16":"instagram","19":"threads","22":"facebook"};
const MEDIA_URL=/^https:\/\/github\.com\/mannerjm\/unboda\/releases\/download\/unboda-lifestyle-photo-(\d{8})\/photo-(01|04|10|13|16|19|22)\.jpg$/;
function checkedSlot(p){
 if(!p||!/^\d{4}-\d{2}-\d{2}$/.test(p.dateKst??"")||
  !Object.hasOwn(HOURS,p.hourKst)||p.network!==HOURS[p.hourKst])throw Error("INVALID_METRICOOL_LIFESTYLE_SLOT");
 const match=p.mediaUrl?.match(MEDIA_URL);
 if(!match||match[1]!==p.dateKst.replaceAll("-","")||match[2]!==p.hourKst)
  throw Error("ONLY_IMMUTABLE_VERIFIED_UNBODA_PHOTO_MEDIA_IS_ACCEPTED");
 if(!p.caption||[...p.caption].length>450)throw Error("UNSAFE_OR_OVERSIZED_METRICOOL_CAPTION");
}
function monthDayPosts(raw){
 if(Array.isArray(raw?.data))return raw.data;
 if(Array.isArray(raw?.data?.items))return raw.data.items;
 return null;
}
function exhaustedPagination(raw){
 const page=raw?.metadata?.page??raw?.page;
 if(!page)return true;
 if(page.hasNext===true||page.hasNextPage===true||page.next!=null||
  page.nextPage!=null)return false;
 if(Number.isFinite(page.page)&&Number.isFinite(page.totalPages)&&page.page<page.totalPages)return false;
 return true;
}
function idOf(p){
 const v=p?.id??p?.postId;
 return Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):null;
}
function statusOf(post,network){
 const providers=post?.providers;
 if(!Array.isArray(providers))return null;
 return providers.find(x=>x?.network===network)||null;
}
async function parseResponse(response){
 if(!response?.ok)throw Error("METRICOOL_SERVER_REQUEST_REJECTED");
 try{return await response.json()}catch{
  throw Error("METRICOOL_RESPONSE_NOT_JSON_OR_UNVERIFIABLE");
 }
}
export function createMetricoolLifestyleHttpAdapter({
 apiToken,userId,blogId=BRAND,fetcher=fetch
}={}){
 if(typeof apiToken!=="string"||apiToken.length<20||!String(userId??"").trim()||
    String(blogId)!==BRAND||typeof fetcher!=="function")
  throw Error("MISSING_OR_INCORRECT_SERVER_ONLY_METRICOOL_CREDENTIALS");
 const params=(extras={})=>{
  const u=new URL(ENDPOINT);
  u.searchParams.set("userId",String(userId));
  u.searchParams.set("blogId",String(blogId));
  for(const [k,v] of Object.entries(extras))u.searchParams.set(k,String(v));
  return u.toString();
 };
 const headers={"X-Mc-Auth":apiToken,"Accept":"application/json"};
 async function dayPosts(dateKst){
  const data=await parseResponse(await fetcher(params({
   start:dateKst+"T00:00:00",end:dateKst+"T23:59:59",timezone:"Asia/Seoul"
  }),{method:"GET",headers}));
  const posts=monthDayPosts(data);
  if(!posts||!exhaustedPagination(data))return {complete:false,posts:[]};
  return {complete:true,posts};
 }
 return {
  async readSlot(post){
   checkedSlot(post);
   const response=await dayPosts(post.dateKst);
   if(!response.complete)return {complete:false,posts:[]};
   const time=post.dateKst+"T"+post.hourKst+":00:00";
   const matches=response.posts.filter(x=>
     String(x?.publicationDate?.dateTime??"")===time &&
     Array.isArray(x.providers)&&x.providers.some(p=>p?.network===post.network)
   );
   // Preserve all statuses, even ERROR or already PUBLISHED; any one blocks a new POST.
   return {complete:true,posts:matches};
  },
  async submitOnce(options){
   if(String(options?.brandId)!==BRAND||options?.autoPublish!==true||
      options?.draft!==false||!options.mediaUrl||!options.text)
    throw Error("UNAUTHORIZED_OR_INCOMPLETE_METRICOOL_SUBMISSION");
   const dateKst=options.date?.slice(0,10);
   const hourKst=options.publicationDate?.dateTime?.slice(11,13);
   checkedSlot({dateKst,hourKst,network:options.network,
     mediaUrl:options.mediaUrl,caption:options.text});
   if(options.publicationDate.timezone!=="Asia/Seoul"||
      options.publicationDate.dateTime!==dateKst+"T"+hourKst+":00:00"||
      options.date!==dateKst+"T"+hourKst+":00:00+09:00")
    throw Error("UNSUPPORTED_TIMEZONE_OR_UNVERIFIED_METRICOOL_TIME");
   const body={
    publicationDate:options.publicationDate,
    text:options.text,media:[options.mediaUrl],
    providers:[{"network":options.network}],
    draft:false,autoPublish:true,shortener:false,
    ...NETWORK_DATA[options.network]
   };
   // POST happens ONCE. Network errors and ambiguous responses are propagated
   // to the durable claim store; never retry this call automatically.
   const response=await parseResponse(await fetcher(params(),{
    method:"POST",
    headers:{...headers,"Content-Type":"application/json"},
    body:JSON.stringify(body)
   }));
   const id=idOf(response?.data??response);
   if(!id)throw Error("METRICOOL_POST_RESPONSE_UNCONFIRMED_NO_RETRY");
   return {id};
  },
  async verifyScheduled(post,actual,submit){
   checkedSlot(post);
   const provider=statusOf(actual,post.network);
   const media=actual?.media;
   const dateTime=actual?.publicationDate?.dateTime;
   return idOf(actual)===submit?.id &&
     actual?.draft===false && actual?.autoPublish===true &&
     dateTime===post.dateKst+"T"+post.hourKst+":00:00" &&
     typeof actual?.text==="string" && actual.text===post.caption &&
     Array.isArray(media) && media.length>0 &&
     provider?.status==="PENDING" &&
     actual.providers.filter(q=>q.network===post.network).length===1 &&
     actual.providers.length===1;
  },
  async verifyActuallyPublished(post){
   checkedSlot(post);
   const state=await this.readSlot(post);
   if(state.complete!==true||state.posts.length!==1)return {verified:false};
   const actual=state.posts[0],provider=statusOf(actual,post.network);
   const url=provider?.publicUrl||actual?.publicUrl;
   if(provider?.status==="PUBLISHED"&&
      typeof url==="string"&&/^https:\/\/[^/\s]+\//.test(url))
    return {verified:true,url,postId:idOf(actual)};
   return {verified:false,providerStatus:provider?.status??"UNKNOWN"};
  }
 };
}
