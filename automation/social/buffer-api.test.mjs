import test from "node:test";
import assert from "node:assert/strict";
import {getBufferOrganizations,getBufferChannels,bufferGraphQL,
 planBufferVideoPost} from "./buffer-api.mjs";
test("read-only organization query requires a secret and makes no attempt without one",async()=>{
 let called=false;
 const r=await getBufferOrganizations({apiKey:"",fetcher:async()=>{called=true;}});
 assert.equal(r.state,"BLOCKED");assert.equal(called,false);
});
test("Buffer organizations read use GraphQL bearer token in mock only",async()=>{
 const r=await getBufferOrganizations({apiKey:"mock-not-real-token",
  fetcher:async(url,req)=>{
   assert.equal(url,"https://api.buffer.com");
   assert.equal(req.method,"POST");
   assert.equal(req.headers.Authorization,"Bearer mock-not-real-token");
   assert.match(JSON.parse(req.body).query,/account\s*\{/);
   return {ok:true,json:async()=>({data:{account:{organizations:[{id:"org_12345",name:"UNBODA"}]}}})};
  }});
 assert.equal(r.state,"READ_ONLY_ORGANIZATIONS");
 assert.equal(r.organizations[0].name,"UNBODA");
});
test("Buffer can inspect exactly three pilot channels with no posting",async()=>{
 const r=await getBufferChannels({organizationId:"org_12345",apiKey:"mock-not-real-token",
  fetcher:async(url,req)=>{
   const q=JSON.parse(req.body).query;
   assert.match(q,/GetChannels/);
   assert.match(q,/org_12345/);
   return {ok:true,json:async()=>({data:{channels:[
    {id:"c1",service:"instagram",name:"unboda.kr"},
    {id:"c2",service:"tiktok",name:"unboda.kr"},
    {id:"c3",service:"youtube",name:"unboda"}
   ]}})};
  }});
 assert.equal(r.allThreeAvailable,true);
 assert.equal(r.publishedAnything,false);
 assert.equal(r.channels.length,3);
});
test("missing one channel is accurately reported",async()=>{
 const r=await getBufferChannels({organizationId:"org_12345",apiKey:"mock-not-real-token",
  fetcher:async()=>({ok:true,json:async()=>({data:{channels:[
   {id:"c1",service:"instagram",name:"unboda"}]}})})});
 assert.deepEqual(r.missingServices,["tiktok","youtube"]);
});
test("GraphQL errors do not masquerade as success",async()=>{
 const r=await bufferGraphQL({query:"query { account { id } }",
  apiKey:"mock-not-real-token",
  fetcher:async()=>({ok:true,json:async()=>({errors:[{message:"Unauthorized"}]})})});
 assert.equal(r.state,"FAILED");
 assert.equal(r.reason,"BUFFER_GRAPHQL_ERRORS");
});
test("video plans default blocked if no license and public MP4 QA",()=>{
 const r=planBufferVideoPost({service:"instagram",channelId:"c1",
  text:"사주에서는 태어난 해·달·날·시간의 네 기둥을 함께 살펴봅니다. 이 내용은 전통문화에 관한 참고 정보이며 미래를 보장하지 않습니다.",
  videoUrl:"https://media.example.org/video.mp4",dueAt:"2026-11-01T11:00:00.000Z"});
 assert.equal(r.state,"BLOCKED");
 assert.ok(r.reasons.includes("MEDIA_RIGHTS_REQUIRED"));
});
test("TikTok rejects captions over 150 characters in dry plan",()=>{
 const r=planBufferVideoPost({service:"tiktok",channelId:"c2",
  text:"가".repeat(151),videoUrl:"https://media.example.org/video.mp4",
  dueAt:"2026-11-01T11:00:00.000Z"});
 assert.ok(r.reasons.includes("TIKTOK_CAPTION_LIMIT_150"));
});
test("fully mock-approved request remains a plan, not an upload",()=>{
 const r=planBufferVideoPost({service:"youtube",channelId:"c3",
  text:"띠만 안다고 사주를 모두 알 수 있는 것은 아닙니다. 사주에서는 네 기둥을 전통적인 관점으로 살펴보며 미래를 보장하지 않습니다.",
  videoUrl:"https://media.example.org/video.mp4",dueAt:"2026-11-01T11:00:00.000Z",
  rightsVerified:true,pronunciationVerified:true,mediaQA:true,editorialApproved:true,
  permanentPublicMediaVerified:true,remoteDuplicateCheckVerified:true,cloudLedgerReserved:true});
 assert.equal(r.state,"PLAN_REQUIRES_EXPLICIT_LIVE_RELEASE");
 assert.equal(r.input.schedulingType,"automatic");
 assert.deepEqual(r.input.assets,[{video:{url:"https://media.example.org/video.mp4"}}]);
 assert.equal(r.liveApiCallMade,false);
});
