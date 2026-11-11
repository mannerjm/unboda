import {createHash} from "node:crypto";
const REPO="mannerjm/unboda", BRAND="7377653", USER="5729495";
const ROOT="https://github.com/"+REPO+"/releases/download/";
const API="https://app.metricool.com/api/v2/scheduler/posts";
const CHANNELS=["facebook","instagram","threads"];
export const FIXED_TIME={zodiac:"07:00:00",constellation:"13:00:00"};
export function kstTomorrow(ms=Date.now()){
  const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(ms));
  if(!/^\d{4}-\d{2}-\d{2}$/.test(today))throw Error("INVALID_KST_DATE");
  return new Date(Date.parse(today+"T00:00:00Z")+86400000).toISOString().slice(0,10);
}
export function releaseTag(date,type){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Object.hasOwn(FIXED_TIME,type))throw Error("INVALID_TARGET");
 const stamp=date.replaceAll("-","");
 return type==="zodiac"?"unboda-zodiac-"+stamp:
 stamp==="20261112"?"unboda-constellation-polished-"+stamp:"unboda-constellation-"+stamp;
}
export function expectedFiles(date,type){
 const prefix="unboda-"+date+"-",n=type==="zodiac"?7:5;
 return Array.from({length:n},(_,i)=>prefix+String(i+1).padStart(2,"0")+".png");
}
export function validateRelease(doc,manifest,date,type){
 const tag=releaseTag(date,type),images=expectedFiles(date,type);
 const other=type==="zodiac"?"zodiac-manifest.json":"constellation-manifest.json";
 if(!doc||doc.tag_name!==tag||doc.draft!==false||!Array.isArray(doc.assets)||
    doc.assets.length!==images.length+2||!manifest||manifest.dateKst!==date||
    !Array.isArray(manifest.images)||manifest.images.length!==images.length)
   throw Error("HOROSCOPE_RELEASE_INCOMPLETE_OR_WRONG_DATE");
 const got=doc.assets.map(a=>a.name),want=[...images,other,"caption.txt"];
 if(new Set(got).size!==got.length||got.length!==want.length||want.some(f=>!got.includes(f)))
   throw Error("HOROSCOPE_FILE_SET_INVALID");
 if(type==="zodiac" && (manifest.birthYearCount!==60||manifest.imagesExpected!==7||
    manifest.notPersonalSaju!==true))throw Error("ZODIAC_FACT_OR_CARD_COUNT_INVALID");
 if(type==="constellation" && (manifest.signCount!==12||manifest.imageCount!==5||
    manifest.generalEntertainmentOnly!==true))throw Error("CONSTELLATION_FACT_OR_CARD_COUNT_INVALID");
 for(let i=0;i<images.length;i++){
   const x=manifest.images[i],a=doc.assets.find(v=>v.name===images[i]);
   if(x?.name!==images[i]||!a||!Number.isInteger(a.size)||a.size<20000||
      a.size>7000000||x.bytes!==a.size||
      !/^[a-f0-9]{64}$/.test(x.sha256)||x.dimensions?.join(",")!=="1080,1350")
      throw Error("HOROSCOPE_IMAGE_METADATA_INVALID:"+i);
 }
 return {images,manifestFile:other};
}
export function classifySlot(posts,date,type){
 if(!Array.isArray(posts)||posts.length>=200)return "UNVERIFIED_DAY";
 const clock=date+"T"+FIXED_TIME[type];
 const rows=posts.filter(p=>p?.publicationDate?.dateTime===clock &&
   Array.isArray(p.providers)&&p.providers.some(q=>CHANNELS.includes(q.network)));
 if(rows.length===0)return "ABSENT";
 if(rows.length!==1)return "CONFLICT";
 const p=rows[0],provs=p.providers??[];
 const good=provs.length===3 && CHANNELS.every(n=>provs.filter(q=>q.network===n&&q.status==="PENDING").length===1) &&
   p.draft===false&&p.autoPublish===true&&p.media?.length===(type==="zodiac"?7:5);
 return good?"ALREADY_RESERVED":"CONFLICT";
}
async function json(res,label){
 if(!res.ok)throw Error(label+"_HTTP_"+res.status);
 try{return await res.json()}catch{throw Error(label+"_INVALID_JSON")}
}
async function fetchFile(fetcher,url,limit){
 const r=await fetcher(url,{method:"GET",headers:{"Accept":"application/octet-stream"},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error("GITHUB_ASSET_UNAVAILABLE_"+r.status);
 const raw=Buffer.from(await r.arrayBuffer());
 if(raw.length>limit||raw.length<1)throw Error("ASSET_TOO_LARGE_OR_EMPTY");
 return raw;
}
export async function scheduleKind({date,type,fetcher=fetch,token,userId=USER,brandId=BRAND,claim}){
 if(typeof token!=="string"||token.length<20||String(userId)!==USER||String(brandId)!==BRAND)
   throw Error("SCHEDULER_PROTECTED_CREDENTIALS_MISSING");
 const query=new URL(API);
 for(const [k,v] of Object.entries({userId,blogId:brandId,start:date+"T00:00:00",end:date+"T23:59:59",timezone:"Asia/Seoul"}))
  query.searchParams.set(k,v);
 const headers={"X-Mc-Auth":token,Accept:"application/json"};
 const read=async()=>{
  const j=await json(await fetcher(query,{headers,method:"GET",signal:AbortSignal.timeout(20000)}),"METRICOOL_READ");
  const list=Array.isArray(j.data)?j.data:Array.isArray(j.data?.items)?j.data.items:null;
  const page=j.metadata?.page??j.page;
  if(!list||page?.hasNext===true||page?.hasNextPage===true||page?.next!=null||
     (Number.isFinite(page?.page)&&Number.isFinite(page?.totalPages)&&page.page<page.totalPages))
   throw Error("METRICOOL_DAY_NOT_EXHAUSTIVE");
  return list;
 };
 const before=classifySlot(await read(),date,type);
 if(before!=="ABSENT"){
  if(before==="ALREADY_RESERVED")return {type,date,state:before,scheduled:false};
  throw Error("DUPLICATE_OR_UNVERIFIED_EXISTING_SLOT_"+type);
 }
 const tag=releaseTag(date,type),stamp=date.replaceAll("-"),
   release=await json(await fetcher("https://api.github.com/repos/"+REPO+"/releases/tags/"+tag,
     {headers:{Accept:"application/vnd.github+json"},signal:AbortSignal.timeout(20000)}),"GITHUB_RELEASE"),
   manifestName=type==="zodiac"?"zodiac-manifest.json":"constellation-manifest.json";
 const m=JSON.parse((await fetchFile(fetcher,ROOT+tag+"/"+manifestName,800000)).toString("utf8"));
 const {images}=validateRelease(release,m,date,type);
 const caption=(await fetchFile(fetcher,ROOT+tag+"/caption.txt",2000)).toString("utf8").trim();
 if([...caption].length<50||[...caption].length>450||
    !caption.includes("unboda.kr")||!caption.includes("11월")&&date.slice(5,7)==="11")
   throw Error("HOROSCOPE_CAPTION_INVALID");
 for(let i=0;i<images.length;i++){
  const buf=await fetchFile(fetcher,ROOT+tag+"/"+images[i],7000000);
  if(buf.length!==m.images[i].bytes||buf.subarray(0,8).toString("hex")!=="89504e470d0a1a0a"||
     buf.readUInt32BE(16)!==1080||buf.readUInt32BE(20)!==1350||
     createHash("sha256").update(buf).digest("hex")!==m.images[i].sha256)
   throw Error("HOROSCOPE_PNG_PIXEL_OR_HASH_VERIFICATION_FAILED");
 }
 // Read again before making a durable one-shot claim. Any ambiguity blocks POST.
 if(classifySlot(await read(),date,type)!=="ABSENT")throw Error("RACE_SLOT_BECAME_NONEMPTY");
 if(typeof claim!=="function")throw Error("ATOMIC_CLAIM_REQUIRED");
 await claim("horoscope-scheduler/v1/"+stamp+"/"+type+".json",JSON.stringify({date,type,tag,claimedAt:new Date().toISOString()}));
 const body={publicationDate:{dateTime:date+"T"+FIXED_TIME[type],timezone:"Asia/Seoul"},
   text:caption,providers:CHANNELS.map(network=>({network})),media:images.map(n=>ROOT+tag+"/"+n),
   draft:false,autoPublish:true,shortener:false,
   facebookData:{type:"POST"},instagramData:{type:"POST",isAiGenerated:false},
   threadsData:{type:"POST",replyControl:"EVERYONE"}};
 // Claim is intentionally permanent after ambiguous provider response. Never retry.
 const response=await json(await fetcher(query.origin+query.pathname+"?"+new URLSearchParams({userId,blogId:brandId}),
   {method:"POST",headers:{...headers,"Content-Type":"application/json"},
    body:JSON.stringify(body),signal:AbortSignal.timeout(20000)}),"METRICOOL_POST");
 const id=Number(response.data?.id??response.id);
 if(!Number.isSafeInteger(id)||id<=0)throw Error("AMBIGUOUS_METRICOOL_POST_CLAIM_PERMANENT");
 const after=(await read()).find(p=>Number(p.id)===id);
 if(!after||classifySlot([after],date,type)!=="ALREADY_RESERVED")throw Error("METRICOOL_READBACK_NOT_VERIFIED");
 return {type,date,state:"PENDING_THREE_NETWORKS",scheduled:true,postId:id};
}
