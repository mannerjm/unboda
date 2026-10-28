import test from "node:test";
import assert from "node:assert/strict";
import {
 syncCompletedRunwayTask,verifyMp4Header,
 validateProviderMediaUrl,verifyPermanentMediaUrl
} from "./runway-asset-sync.mjs";

const id="b7d64306-f5d4-48ef-9bd8-b7c9b0445b36";
const key="runway-key-mock-not-real";
const runwayUrl="https://dnznrvs05pmza.cloudfront.net/original-result.mp4?_jwt=expiringtoken";
const goodUrl="https://public-media.example.net/unboda-social/pilots/cinematic.mp4";
const file=new Uint8Array(1200);
file.set(new TextEncoder().encode("ftypisom"),4);
const fileResp={
 ok:true,
 headers:{get:(n)=>n==="content-type"?"video/mp4":
   n==="content-length"?String(file.length):null},
 arrayBuffer:async()=>file.buffer
};
const mockGet=async(u,opts)=>{
 if(u.includes("/v1/tasks/")){
  assert.equal(opts.method,"GET");
  assert.match(opts.headers.Authorization,/^Bearer runway-key/);
  return {ok:true,json:async()=>({status:"SUCCEEDED",output:[runwayUrl]})};
 }
 assert.equal(u,runwayUrl);
 assert.equal(opts.redirect,"error");
 return fileResp;
};
const base={taskId:id,apiKey:key,ownerCopyrightApproved:true,
 storageBudgetApproved:true,get:mockGet};

test("no user file upload; source fetch requires rights, approved storage cost and driver",async()=>{
 let accessed=0;
 const no=()=>{accessed++;throw Error("unexpected");};
 for(const args of [
  {...base,ownerCopyrightApproved:false},
  {...base,storageBudgetApproved:false},
  {...base,putObject:null},
  {...base,taskId:"wrong"}
 ]){
  const result=await syncCompletedRunwayTask({...args,get:no});
  assert.equal(result.state,"BLOCKED");
  assert.equal(result.externalUploadPerformed,false);
 }
 assert.equal(accessed,0);
});
test("untrusted URL or SSRF cannot bypass Runway output media host allowlist",()=>{
 for(const u of [
  "http://dnznrvs05pmza.cloudfront.net/a.mp4",
  "https://dnznrvs05pmza.cloudfront.net.attacker.com/a.mp4",
  "https://localhost/a.mp4",
  "https://evil.com/a.mp4",
  "https://dnznrvs05pmza.cloudfront.net:444/a.mp4",
  "https://admin@dnznrvs05pmza.cloudfront.net/a.mp4"
 ])assert.equal(validateProviderMediaUrl(u),false);
 assert.equal(validateProviderMediaUrl(runwayUrl),true);
});
test("storage location must remain permanent public HTTPS without signed query",()=>{
 assert.equal(verifyPermanentMediaUrl(goodUrl),true);
 assert.equal(verifyPermanentMediaUrl(runwayUrl),false);
 assert.equal(verifyPermanentMediaUrl("http://public-media.example.net/a.mp4"),false);
 assert.equal(verifyPermanentMediaUrl("https://public-media.example.net/a.mp4?expiry=1"),false);
});
test("automatic transfer from authenticated provider URL to permanent storage after prerequisites",async()=>{
 const saves=[];
 const r=await syncCompletedRunwayTask({...base,putObject:async obj=>{
  saves.push(obj);
  return {url:goodUrl,persisted:true};
 }});
 assert.equal(r.state,"PERMANENT_SOURCE_MP4_STORED");
 assert.equal(r.manualUserFileTransferNeeded,false);
 assert.equal(r.bytes,file.length);
 assert.equal(saves.length,1);
 assert.equal(saves[0].contentType,"video/mp4");
 assert.match(saves[0].key,/\.mp4$/);
 assert.equal(r.permanentUrl,goodUrl);
 assert.equal(r.koreanNarrationNotYetGenerated,true);
 assert.equal(r.publishingNotYetAuthorized,true);
});
test("Runway task that has not finished must not download or save",async()=>{
 let calls=0;
 const r=await syncCompletedRunwayTask({...base,putObject:async()=>{calls++;},
  get:async()=>({ok:true,json:async()=>({status:"RUNNING",output:[runwayUrl]})})});
 assert.equal(r.state,"NOT_READY");
 assert.equal(calls,0);
});
test("reject bogus media content even if Content-Type pretends MP4",async()=>{
 assert.equal(verifyMp4Header(file),true);
 assert.equal(verifyMp4Header(new Uint8Array(10)),false);
 let saves=0;
 const r=await syncCompletedRunwayTask({...base,
  putObject:async()=>{saves++;},
  get:async(u)=>{
   if(u.includes("/tasks/"))return {ok:true,json:async()=>({status:"SUCCEEDED",output:[runwayUrl]})};
   return {ok:true,headers:fileResp.headers,
     arrayBuffer:async()=>new Uint8Array(file.length).buffer};
  }});
 assert.equal(r.state,"BLOCKED");
 assert.equal(r.reason,"MP4_SIGNATURE_OR_SIZE_INVALID");
 assert.equal(saves,0);
});
test("ambiguous storage response must not be reported successful or blind-retried",async()=>{
 const r=await syncCompletedRunwayTask({...base,putObject:async()=>({persisted:true,url:"https://public-media.example.net/a.mp4?t=1"})});
 assert.equal(r.state,"STORAGE_WRITE_UNCONFIRMED_RECONCILE");
 assert.equal(r.doNotBlindRetry,true);
});
test("provider failure or tampered output host stops before external write",async()=>{
 let uploads=0;
 const r=await syncCompletedRunwayTask({...base,
  putObject:async()=>{uploads++;},
  get:async()=>({ok:true,json:async()=>({
   status:"SUCCEEDED",output:["https://evil.example.com/x.mp4"]
  })})});
 assert.equal(r.state,"BLOCKED");
 assert.equal(r.reason,"UNTRUSTED_OR_MISSING_RUNWAY_MEDIA_URL");
 assert.equal(uploads,0);
});
