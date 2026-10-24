import test from "node:test";
import assert from "node:assert/strict";
import {createIndependentVideoPost,mediaIdFromNormalizeResponse,
 normalizeVideoMedia,createScheduledVideoRest,confirmScheduledVideoRest} from "./metricool-rest.mjs";
const env={METRICOOL_API_TOKEN:"test-secret-never-live",METRICOOL_BLOG_ID:"7377653",
 METRICOOL_USER_ID:"5729495"};
const fixture={network:"instagram",mediaId:"uploaded-media-unique-221",
 text:"사주에서 태어난 해는 하나의 전통적 상징일 뿐입니다. 해와 달, 날, 시간의 네 기둥을 함께 살펴보는 전통 명리 관점을 쉬운 말로 설명합니다. 사주 해석은 참고 정보입니다.",
 title:"띠와 사주의 차이를 쉽게 알아봅시다",dateTime:"2026-11-11T20:00:00"};
test("API body uses normalized mediaId, not a bare unverified URL array",()=>{
 const p=createIndependentVideoPost(fixture);
 assert.deepEqual(p.media,{mediaId:fixture.mediaId});
 assert.equal(p.instagramData.type,"REEL");
 assert.equal(p.instagramData.isAiGenerated,true);
 assert.equal(p.autoPublish,true);
 assert.equal(p.draft,false);
});
test("TikTok and YouTube video disclosures are set",()=>{
 const t=createIndependentVideoPost({...fixture,network:"tiktok"});
 assert.equal(t.tiktokData.isAigc,true);
 assert.equal(t.tiktokData.commercialContentOwnBrand,true);
 const y=createIndependentVideoPost({...fixture,network:"youtube"});
 assert.equal(y.youtubeData.type,"short");
 assert.equal(y.youtubeData.isAiGeneratedContent,true);
});
test("image normalize response requires actual media ID",()=>{
 assert.equal(mediaIdFromNormalizeResponse({data:{mediaId:"x-media-id"}}),"x-media-id");
 assert.throws(()=>mediaIdFromNormalizeResponse({data:{url:"https://cdn.example/video.mp4"}}),
  /NOT_VERIFIED/);
});
test("no media normalization if not public/permanent/license approved",async()=>{
 let called=false;
 const bad=await normalizeVideoMedia({mediaUrl:"https://cdn.example/video.mp4",
  rightsVerified:true,permanentPublicMediaVerified:false,allowExternalAccess:true,
  env,fetcher:async()=>{called=true;throw Error("should not call");}});
 assert.equal(bad.state,"BLOCKED");assert.equal(called,false);
});
test("mock media normalization calls authenticated GET and stores server-issued media ID",async()=>{
 const r=await normalizeVideoMedia({mediaUrl:"https://cdn.example/video.mp4",
  rightsVerified:true,permanentPublicMediaVerified:true,allowExternalAccess:true,
  env,fetcher:async(url,request)=>{
   assert.match(url.toString(),/\/api\/actions\/normalize\/image\/url/);
   assert.equal(url.searchParams.get("blogId"),"7377653");
   assert.equal(request.headers["X-Mc-Auth"],env.METRICOOL_API_TOKEN);
   return {ok:true,json:async()=>({mediaId:"server-verified-id"})};
  }});
 assert.equal(r.state,"NORMALIZED");
 assert.equal(r.mediaId,"server-verified-id");
});
test("mock REST schedule blocks with no ledger or quota evidence",async()=>{
 let hit=false;
 const r=await createScheduledVideoRest({...fixture,env,allowLive:true,
  fetcher:async()=>{hit=true;throw Error("never write");}});
 assert.equal(r.state,"BLOCKED");
 assert.equal(hit,false);
 assert.ok(r.missing.includes("durableReservationConfirmed"));
 assert.ok(r.missing.includes("remoteDuplicateCheckConfirmed"));
});
test("mock REST schedule only accepts remote response ID as request, not PUBLISHED",async()=>{
 const r=await createScheduledVideoRest({...fixture,env,allowLive:true,
  durableReservationConfirmed:true,quotaVerified:true,
  commerciallyApproved:true,ownerCostApproval:true,
  remoteDuplicateCheckConfirmed:true,
  uniqueJobKey:"social-2026-11-11t20:00:00",
  fetcher:async(url,request)=>{
   const body=JSON.parse(request.body);
   assert.deepEqual(body.media,{mediaId:fixture.mediaId});
   assert.equal(request.method,"POST");
   return {ok:true,json:async()=>({id:123456})};
  }});
 assert.equal(r.state,"SCHEDULE_REQUEST_ACCEPTED_NEEDS_GET_VERIFICATION");
 assert.equal(r.doNotCallPublished,true);
});
test("ambiguous accepted response must not trigger a second blind POST",async()=>{
 const r=await createScheduledVideoRest({...fixture,env,allowLive:true,
  durableReservationConfirmed:true,quotaVerified:true,
  commerciallyApproved:true,ownerCostApproval:true,
  remoteDuplicateCheckConfirmed:true,uniqueJobKey:"safe-unique-queue-test-long",
  fetcher:async()=>({ok:true,json:async()=>({})})});
 assert.equal(r.state,"UNKNOWN_REMOTE_OUTCOME_RECONCILE_FIRST");
 assert.equal(r.doNotBlindRetry,true);
});
test("GET verifies original video media and target channel before scheduling confirmation",async()=>{
 const r=await confirmScheduledVideoRest({externalPostId:"123456",
  expectedNetwork:"instagram",expectedMediaId:fixture.mediaId,env,
  fetcher:async()=>({ok:true,json:async()=>({
    data:{autoPublish:true,media:{mediaId:fixture.mediaId},
      providers:[{network:"instagram",status:"PENDING"}]}
  })})});
 assert.equal(r.state,"SCHEDULED_NEEDS_FINAL_PUBLICATION_CHECK");
 assert.equal(r.providerStatus,"PENDING");
});
test("GET without media must fail even if post is scheduled",async()=>{
 const r=await confirmScheduledVideoRest({externalPostId:"123456",
  expectedNetwork:"instagram",expectedMediaId:fixture.mediaId,env,
  fetcher:async()=>({ok:true,json:async()=>({
    data:{autoPublish:true,providers:[{network:"instagram",status:"PENDING"}]}
  })})});
 assert.equal(r.state,"VERIFY_FAILED");
});
