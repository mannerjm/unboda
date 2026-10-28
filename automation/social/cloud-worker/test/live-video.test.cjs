"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createHash}=require("node:crypto");
const {nextSlotFromCron,loadReleaseVideo}=require("../lib/release-video.cjs");
const {makeVideoClaim}=require("../lib/video-claim.cjs");
const {runVideoPublishCron}=require("../lib/video-publisher.cjs");
const now=Date.parse("2026-10-28T20:00:00+09:00");
const slot=nextSlotFromCron(now);
const goodMp4=Buffer.alloc(1800);goodMp4.write("ftyp",4);
const sha=createHash("sha256").update(goodMp4).digest("hex");
const tag="unboda-shorts-20261029",base="https://github.com/mannerjm/unboda/releases/download/"+tag+"/";
const hours=[["00","midnight"],["08","commute"],["12","friendship"],["20","afterwork"]];
const manifest={schemaVersion:1,targetDateKst:"20261029",
 generatedBy:"github-actions-four-qa-verified",publishAutomatically:false,
 sourceCommit:"a".repeat(40),videos:hours.map(([hourKst,name])=>({
  hourKst,name,mp4:hourKst+"-"+name+".mp4",jpg:hourKst+"-"+name+".jpg",
  sha256:sha,bytes:goodMp4.length,topicKey:"unique-topic-20261029",
  title:"하루 고민을 가볍게 풀어봐요",caption:"오늘 하루의 작은 고민을 함께 생각하며 편안한 선택을 찾는 일상 이야기예요. 작은 실천부터 시작해요."}))};
const metadata={draft:false,prerelease:true,tag_name:tag,
 assets:[
  {name:"manifest.json",size:JSON.stringify(manifest).length,state:"uploaded",
   browser_download_url:base+"manifest.json"},
  ...hours.map(([hourKst,name])=>({
   name:hourKst+"-"+name+".mp4",size:goodMp4.length,state:"uploaded",
   browser_download_url:base+hourKst+"-"+name+".mp4"
  }))
 ]};
function reply(body,ok=true){return {ok,status:ok?200:404,json:async()=>body,
 arrayBuffer:async()=>body};}
const env={SOCIAL_PUBLISH_ENABLED:"true",SOCIAL_PAID_GENERATION_ENABLED:"false",
 METRICOOL_USER_ID:"5729495",METRICOOL_BLOG_ID:"7377653",
 METRICOOL_API_TOKEN:"SIMULATED_ADVANCED_METRICOOL_TOKEN_SAFE_123456789"};
const seen={calls:[],posts:0};
function fetcherFactory({badSha=false,preExisting=false,noMediaId=false,badPost=false}={}){
 const calls=[];
 const fetcher=async(url,opts)=>{
  const u=new URL(url);calls.push({url,method:opts.method});
  if(u.hostname==="api.github.com"){
   if(u.pathname.includes("/releases/tags/"))return reply(metadata);
  }
  if(u.hostname==="github.com"&&u.pathname.endsWith("/manifest.json"))return reply(manifest);
  if(u.hostname==="github.com"&&u.pathname.endsWith(".mp4")){
   const bytes=Buffer.from(goodMp4);if(badSha)bytes[25]=4;
   return reply(bytes);
  }
  if(u.pathname==="/api/v2/scheduler/posts"&&opts.method==="GET")
   return reply({data:preExisting?[{publicationDate:{dateTime:slot.slotKst},
     providers:[{network:"instagram"}]}]:[]});
  if(u.pathname==="/api/actions/normalize/image/url"&&opts.method==="GET")
   return reply(noMediaId?{}:{mediaId:"metricool-ready-video-123"});
  if(u.pathname==="/api/v2/scheduler/posts"&&opts.method==="POST"){
   const body=JSON.parse(opts.body);
   assert.equal(body.providers[0].network,"instagram");
   assert.equal(body.instagramData.type,"REEL");
   assert.equal(body.autoPublish,true);
   assert.deepEqual(body.media,[{mediaId:"metricool-ready-video-123"}]);
   return reply({id:234567});
  }
  if(u.pathname==="/api/v2/scheduler/posts/234567"&&opts.method==="GET")
   return reply({id:234567,media:badPost?[]:["https://static.metricool.com/planner/video.mp4"],
    providers:[{network:"instagram",status:"PENDING"}],
    publicationDate:{dateTime:slot.slotKst}});
  if(u.pathname==="/api/v2/scheduler/posts/234567"&&opts.method==="DELETE")return reply({});
  throw Error("Unexpected simulated fetch "+u.href);
 };
 return {fetcher,calls};
}
test("exact 4 KST cron events schedule NEXT slot (20 -> 00 tomorrow)",()=>{
 assert.equal(slot.slotKst,"2026-10-29T00:00:00");
 assert.equal(slot.targetDateKst,"20261029");
 assert.equal(nextSlotFromCron(Date.parse("2026-10-29T00:00:00+09:00")).slotKst,"2026-10-29T08:00:00");
 assert.equal(nextSlotFromCron(Date.parse("2026-10-29T08:00:00+09:00")).slotKst,"2026-10-29T12:00:00");
 assert.equal(nextSlotFromCron(Date.parse("2026-10-29T12:00:00+09:00")).slotKst,"2026-10-29T20:00:00");
 assert.equal(nextSlotFromCron(Date.parse("2026-10-28T19:30:00+09:00")),null);
});
test("GitHub release public MP4 is checked byte-for-byte before use",async()=>{
 const x=fetcherFactory();const r=await loadReleaseVideo({now,fetcher:x.fetcher});
 assert.equal(r.state,"ONE_KST_VIDEO_PUBLIC_MEDIA_VERIFIED");assert.equal(r.sha256,sha);
 const bad=fetcherFactory({badSha:true});
 assert.equal((await loadReleaseVideo({now,fetcher:bad.fetcher})).reason,
  "PUBLIC_MP4_SHA256_READBACK_MISMATCH");
});
test("disabled by default: no live post, no fetch",async()=>{
 const m=fetcherFactory();
 const r=await runVideoPublishCron({now,fetcher:m.fetcher,env:{
  ...env,SOCIAL_PUBLISH_ENABLED:"false"},reserveSlot:()=>{throw Error("not called")}});
 assert.equal(r.http,503);assert.equal(m.calls.length,0);
});
test("verified original MP4 -> Metricool mediaId -> POST once -> GET confirms attached",async()=>{
 const m=fetcherFactory();let claims=0;
 const r=await runVideoPublishCron({now,fetcher:m.fetcher,env,
  reserveSlot:async()=>{claims++;return {state:"FIRST_ATOMIC_CLAIM_GRANTED"}}});
 assert.equal(r.http,200);assert.equal(r.body.scheduledCount,1);
 assert.equal(claims,1);
 assert.deepEqual(m.calls.filter(x=>x.method==="POST").map(x=>new URL(x.url).pathname),
  ["/api/v2/scheduler/posts"]);
});
test("existing video time never POSTS or claims again",async()=>{
 const m=fetcherFactory({preExisting:true});let claims=0;
 const r=await runVideoPublishCron({now,fetcher:m.fetcher,env,
  reserveSlot:async()=>{claims++;return {state:"FIRST_ATOMIC_CLAIM_GRANTED"}}});
 assert.equal(r.http,200);assert.equal(claims,0);
 assert.equal(m.calls.filter(x=>x.method==="POST").length,0);
});
test("normalized mediaId missing cannot create text-only post",async()=>{
 const m=fetcherFactory({noMediaId:true});let claims=0;
 const r=await runVideoPublishCron({now,fetcher:m.fetcher,env,
  reserveSlot:async()=>{claims++;return {state:"FIRST_ATOMIC_CLAIM_GRANTED"}}});
 assert.equal(r.http,207);assert.equal(claims,0);
 assert.equal(m.calls.filter(x=>x.method==="POST").length,0);
});
test("bad post GET with no MP4 deletes ONLY newly created id",async()=>{
 const m=fetcherFactory({badPost:true});
 const r=await runVideoPublishCron({now,fetcher:m.fetcher,env,
  reserveSlot:async()=>({state:"FIRST_ATOMIC_CLAIM_GRANTED"})});
 assert.equal(r.http,207);
 assert.equal(m.calls.filter(x=>x.method==="DELETE").length,1);
 assert.match(m.calls.find(x=>x.method==="DELETE").url,/posts\/234567/);
});
test("owner must enable public video provider explicitly",async()=>{
 const m=fetcherFactory();
 const r=await runVideoPublishCron({now,fetcher:m.fetcher,
  env:{...env,SOCIAL_VIDEO_NETWORKS:"instagram,bad-network"},
  reserveSlot:async()=>({state:"FIRST_ATOMIC_CLAIM_GRANTED"})});
 assert.equal(r.http,503);assert.equal(m.calls.length,0);
});
test("atomic blob slot claim can only be inserted once",async()=>{
 let written=0;const claim=makeVideoClaim({token:"MY_LONG_FAKE_BLOB_TOKEN_ABC0123456789",
  put:async(path,data,options)=>{written++;
    assert.equal(options.allowOverwrite,false);
    if(written>1)throw Error("EXISTS");
    return {pathname:path,url:"https://example.public.blob.vercel-storage.com/"+path};
  }});
 const a={brandId:"7377653",network:"instagram",slotUtc:slot.slotUtc,
  sourceSha256:sha,sourceTag:tag};
 assert.equal((await claim(a)).state,"FIRST_ATOMIC_CLAIM_GRANTED");
 assert.equal((await claim(a)).state,"PREVIOUS_OR_UNCERTAIN_ATOMIC_CLAIM_NO_RETRY");
});
