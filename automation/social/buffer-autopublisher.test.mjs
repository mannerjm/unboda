import test from "node:test";
import assert from "node:assert/strict";
import {
 planAutomaticBufferVideo,bufferVideoMutation,bufferRecentPostQuery,
 reconcileBufferVideo,scheduleAutomaticBufferVideo
} from "./buffer-autopublisher.mjs";
const source="https://aq03voydas4sjjuy.public.blob.vercel-storage.com/unboda-social/finished/real30.mp4";
const dueAt="2026-10-28T04:00:00.000Z";
const base={
 organizationId:"org_123456",channelId:"channel_123456",service:"youtube",
 text:"띠는 태어난 해의 전통적인 동물 상징입니다. 사주는 해와 달과 날과 시간을 함께 살펴보는 해석이며 미래를 보장하지 않습니다. 운보다에서 살펴보세요.",
 videoUrl:source,dueAt,videoDurationSeconds:30
};
const flags={
 mediaRightsApproved:true,editorialFactChecked:true,koreanSpeechVerified:true,
 audioRightsVerified:true,mediaProbeVerified:true,mediaBitstreamVerified:true,
 captionSafeAreaVerified:true,sourceNotRepeated:true,
 bakedTextLayerIsolationVerified:true,renderedFrameVisualReviewApproved:true,
 permanentMediaHeadVerified:true,mediaIsFinal30Sec:true,
 channelAutoPublishConfirmed:true,accountQuotaConfirmed:true,
 remoteDeduplicationConfirmed:true,durableLedgerClaimed:true,
 budgetAuthorized:true,livePublishEnabled:true
};
const ready={...base,...flags};
test("no accidental SNS post without final 30sec media and explicit live release",async()=>{
 let calls=0;
 const r=await scheduleAutomaticBufferVideo({apiKey:"fake_test_api_key",
  options:base,fetcher:async()=>{calls++;throw Error("bad network")},ledger:{}});
 assert.equal(r.state,"BLOCKED");assert.equal(calls,0);
 assert.ok(r.reasons.includes("KOREAN_VOICE_QA"));
 assert.ok(r.reasons.includes("LIVE_PUBLISH_DISABLED"));
});
test("baked-in Runway titles or unreviewed frames STOP all uploads",()=>{
 const badSource=planAutomaticBufferVideo({...ready,bakedTextLayerIsolationVerified:false});
 assert.equal(badSource.state,"BLOCKED");
 assert.ok(badSource.reasons.includes("BAKED_TEXT_DOUBLE_OVERLAY_RISK"));
 const unreviewed=planAutomaticBufferVideo({...ready,renderedFrameVisualReviewApproved:false});
 assert.equal(unreviewed.state,"BLOCKED");
 assert.ok(unreviewed.reasons.includes("RENDERED_VISUAL_FRAME_REVIEW_REQUIRED"));
});
test("10-sec original NEVER goes directly to Buffer",()=>{
 const r=planAutomaticBufferVideo({...ready,videoDurationSeconds:10,
   videoUrl:"https://aq03voydas4sjjuy.public.blob.vercel-storage.com/unboda-social/pilots/source10.mp4"});
 assert.equal(r.state,"BLOCKED");
 assert.ok(r.reasons.includes("FINAL_VIDEO_DURATION_REQUIRED"));
});
test("automatic scheduled video mutation uses official GraphQL enums & public MP4",()=>{
 const mutation=bufferVideoMutation(ready);
 assert.match(mutation,/schedulingType: automatic/);
 assert.match(mutation,/mode: customScheduled/);
 assert.match(mutation,/metadata: \{thumbnailOffset: 1000\}/);
 assert.match(mutation,/assets: \[\{video: \{url: "https:/);
 assert.match(mutation,/2026-10-28T04:00:00\.000Z/);
 assert.match(mutation,/__typename/);
 assert.doesNotMatch(mutation,/\bnotification\b/);
});
test("remote POST must be verified no-duplicates before exactly one createPost",async()=>{
 let remoteCalls=0,claimed=0,recorded=0;
 const ledger={claim:async id=>{claimed++;assert.equal(id.length,64);return true},
 recordPost:async p=>{recorded++;assert.equal(p.remotePostId,"post123")}};
 const out=await scheduleAutomaticBufferVideo({
  apiKey:"fake_test_api_key",options:ready,ledger,livePublishEnabled:true,
  fetcher:async(url,req)=>{
   remoteCalls++; assert.equal(url,"https://api.buffer.com");
   assert.equal(req.method,"POST");
   const query=JSON.parse(req.body).query;
   if(remoteCalls===1){
    assert.match(query,/query RecentUNBODAPosts/);
    return {ok:true,json:async()=>({data:{posts:{
     edges:[],pageInfo:{hasNextPage:false,endCursor:null}
    }}})};
   }
   assert.match(query,/mutation ScheduleUNBODAVideo/);
   return {ok:true,json:async()=>({data:{createPost:{
    __typename:"PostActionSuccess",
    post:{id:"post123",status:"scheduled",dueAt,channelId:ready.channelId}
   }}})};
  }
 });
 assert.equal(remoteCalls,2);
 assert.equal(claimed,1); assert.equal(recorded,1);
 assert.equal(out.state,"SCHEDULED_NOT_PUBLISHED");
 assert.equal(out.publishedVerified,false);
});
test("remote existing post blocks duplicate before mutation",async()=>{
 let calls=0;
 const out=await scheduleAutomaticBufferVideo({apiKey:"fake_test_api_key",
 options:ready,livePublishEnabled:true,ledger:{claim:async()=>true,recordPost:async()=>{}},
 fetcher:async()=>{
  calls++;
  return {ok:true,json:async()=>({data:{posts:{edges:[
   {node:{id:"previous_id",text:ready.text,
    channelId:ready.channelId,dueAt,status:"scheduled"}}
  ],pageInfo:{hasNextPage:false,endCursor:null}}}})};
 }});
 assert.equal(calls,1);
 assert.equal(out.state,"REMOTE_STATUS_HOLD");
 assert.equal(out.reason,"REMOTE_POST_EXISTS");
});
test("incomplete remote pages or network failures NEVER allow mutation",async()=>{
 const bad=await reconcileBufferVideo({apiKey:"fake_test_api_key",
  organizationId:ready.organizationId,channelId:ready.channelId,
  text:ready.text,dueAt,fetcher:async()=>({ok:true,
   json:async()=>({data:{posts:{edges:[],pageInfo:{hasNextPage:true,endCursor:"next"}}}})})});
 assert.equal(bad.state,"PAGINATED_UNVERIFIED_HOLD");
 const fail=await reconcileBufferVideo({apiKey:"fake_test_api_key",
  organizationId:ready.organizationId,channelId:ready.channelId,
  text:ready.text,dueAt,fetcher:async()=>{throw Error("timeout")}});
 assert.equal(fail.state,"UNKNOWN_REMOTE_STATUS");
});
test("post result ambiguous -> no blind retries",async()=>{
 let calls=0;
 const r=await scheduleAutomaticBufferVideo({apiKey:"fake_test_api_key",
  options:ready,livePublishEnabled:true,
  ledger:{claim:async()=>true,recordPost:async()=>{}},
  fetcher:async()=>{calls++;return calls===1?
   {ok:true,json:async()=>({data:{posts:{edges:[],pageInfo:{hasNextPage:false}}}})}:
   {ok:false,status:503};
  }});
 assert.equal(calls,2);
 assert.equal(r.state,"UNKNOWN_POST_RESULT_DO_NOT_RETRY");
 assert.equal(r.doNotBlindRetry,true);
});
test("injection-safe GraphQL query literals through JSON quoting",()=>{
 const q=bufferRecentPostQuery({
  organizationId:'org_"+tricky',
  channelId:'channel_"+tricky'
 });
 assert.match(q,/\\\"/);
 assert.match(q,/query RecentUNBODAPosts/);
});
