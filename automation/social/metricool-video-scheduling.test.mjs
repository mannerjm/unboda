import test from 'node:test';
import assert from 'node:assert/strict';
import {planSingleNetworkVideoSchedule,scheduleSingleMetricoolVideo}
 from './metricool-video-scheduling.mjs';
const slotMs=Date.parse('2026-10-29T08:00:00+09:00');
const nowMs=slotMs-3*3600000;
const sha256='a'.repeat(64);
const videoUrl='https://my-store.public.blob.vercel-storage.com/unboda-social/videos/'+sha256+'.mp4';
const approvals={humanVideoQuality:true,commercialSourceRights:true,
 commercialKoreanVoiceRights:true,thumbnailReviewed:true,
 fullPublishedHistoryReviewed:true,socialPublishOwnerApproved:true};
const archive={state:'PUBLIC_BLOB_FULL_READBACK_SHA_VERIFIED',sha256,
 originalBytesSha256:sha256,publicUrl:videoUrl};
const env={SOCIAL_PUBLISH_ENABLED:'true',
 METRICOOL_USER_ID:'5729495',METRICOOL_BLOG_ID:'7377653',
 METRICOOL_API_TOKEN:'MOCKED_ONLY_NONPRODUCTION_TOKEN_123456789'};
const slotClaim={state:'EXCLUSIVE_UNPUBLISHED_SLOT_CLAIM',brandId:'7377653',
 network:'instagram',sha256,scheduledFor:new Date(slotMs).toISOString()};
const base={network:'instagram',slotMs,nowMs,videoUrl,sha256,
 title:'출근길 마음이 무거운 날',caption:'출근 전에 마음이 무거울 때, 내가 할 수 있는 작은 선택을 이야기해요. #운보다',
 approvals,archive,mediaVerified:true,slotClaim};
function plan(overrides={}){return planSingleNetworkVideoSchedule({...base,...overrides})}
const fetched={data:{id:101,media:['https://static.metricool.com/planner/202610/private-1234.mp4'],
 providers:[{network:'instagram',status:'PENDING'}],
 publicationDate:{dateTime:'2026-10-29T08:00:00',timezone:'Asia/Seoul'}}};
function mock({duplicate=false,mediaId='metricoolVideo1234',saved=fetched,
 postThrows=false,posted=true}={}){
 const calls=[];
 const fetcher=async(url,opts)=>{
  calls.push({url,method:opts.method,body:opts.body});
  const u=new URL(url);
  if(opts.method==='GET'&&u.pathname==='/api/v2/scheduler/posts'){
    return {ok:true,json:async()=>({data:duplicate?[{
     publicationDate:{dateTime:'2026-10-29T08:00:00'},
     providers:[{network:'instagram'}]}]:[]})};
  }
  if(opts.method==='GET'&&u.pathname==='/api/actions/normalize/image/url'){
    assert.equal(u.searchParams.get('url'),videoUrl);
    return {ok:true,json:async()=>({mediaId})};
  }
  if(opts.method==='POST'&&u.pathname==='/api/v2/scheduler/posts'){
    if(postThrows)throw Error('timeout after write');
    const body=JSON.parse(opts.body);
    assert.equal(body.instagramData.type,'REEL');
    assert.equal(body.autoPublish,true);assert.equal(body.draft,false);
    assert.deepEqual(body.media,[{mediaId:'metricoolVideo1234'}]);
    assert.equal(body.saveExternalMediaFiles,true);
    return {ok:posted,json:async()=>({id:101})};
  }
  if(opts.method==='GET'&&u.pathname==='/api/v2/scheduler/posts/101'){
    return {ok:true,json:async()=>saved};
  }
  throw Error('UNEXPECTED_MOCK_API_'+opts.method+' '+u.pathname);
 };
 return {calls,fetcher};
}
const confirmWriteReserved=async()=>({
 state:'SINGLE_WRITE_PERSISTENTLY_AUTHORIZED',noPreviousRequest:true
});
test('private GitHub artifacts, unknown rights and unverified origin are never schedulable',()=>{
 for(const value of [
  {videoUrl:'sandbox:/mnt/data/afterwork.mp4'},
  {videoUrl:'https://github.com/runner/artifacts/video.mp4'},
  {videoUrl:'https://blob.vercel-storage.com/private.mp4'},
  {approvals:{...approvals,commercialKoreanVoiceRights:false}},
  {approvals:{...approvals,fullPublishedHistoryReviewed:false}},
  {mediaVerified:false},{archive:{...archive,state:'MISSING'}},
  {slotClaim:{...slotClaim,state:'UNCLAIMED'}},
  {slotMs:Date.parse('2026-10-29T09:00:00+09:00')}
 ]){
  const r=plan(value);assert.equal(r.state,'BLOCKED');assert.equal(r.scheduled,false);
 }
});
test('future 4-slot Instagram Reel schedules only after mediaId and gets post with video',async()=>{
 const p=plan();assert.equal(p.state,'REVIEWED_VIDEO_SCHEDULING_PLAN');
 const m=mock();const r=await scheduleSingleMetricoolVideo({
  plan:p,env,fetcher:m.fetcher,confirmWriteReserved});
 assert.equal(r.state,'METRICOOL_VIDEO_SCHEDULED_UNVERIFIED');
 assert.equal(r.metricoolPostId,101);assert.equal(r.providerPublished,false);
 assert.deepEqual(m.calls.map(x=>x.method),['GET','GET','POST','GET']);
});
test('existing post on that time/network blocks preflight before any media calls',async()=>{
 const m=mock({duplicate:true});
 const r=await scheduleSingleMetricoolVideo({plan:plan(),env,fetcher:m.fetcher,confirmWriteReserved});
 assert.equal(r.reason,'EXISTING_POST_AT_NETWORK_AND_KST_SLOT');
 assert.deepEqual(m.calls.map(x=>x.method),['GET']);
});
test('missing Metricool mediaId refuses creating text-only post',async()=>{
 const m=mock({mediaId:null});
 const r=await scheduleSingleMetricoolVideo({plan:plan(),env,fetcher:m.fetcher,confirmWriteReserved});
 assert.equal(r.reason,'METRICOOL_MEDIA_ID_MISSING_REFUSE_TEXT_ONLY_POST');
 assert.deepEqual(m.calls.map(x=>x.method),['GET','GET']);
});
test('after-post missing MP4 is a failure, never treated as successful video scheduling',async()=>{
 const m=mock({saved:{data:{...fetched.data,media:[]}}});
 const r=await scheduleSingleMetricoolVideo({plan:plan(),env,fetcher:m.fetcher,confirmWriteReserved});
 assert.equal(r.reason,'METRICOOL_POST_CREATED_WITHOUT_VERIFIED_VIDEO');
 assert.equal(r.manualReconciliationRequired,true);assert.equal(r.scheduled,false);
 assert.equal(m.calls.filter(c=>c.method==='POST').length,1);
});
test('network timeout after attempted POST never auto-retries',async()=>{
 const m=mock({postThrows:true});
 const r=await scheduleSingleMetricoolVideo({plan:plan(),env,fetcher:m.fetcher,confirmWriteReserved});
 assert.equal(r.reason,'POST_OUTCOME_UNKNOWN_RECONCILE_WITH_METRICOOL');
 assert.equal(r.doNotBlindlyRetry,true);
 assert.equal(m.calls.filter(c=>c.method==='POST').length,1);
});
test('feature flag missing, or reservation already spent, makes no external write',async()=>{
 let n=0;
 const blocker=async()=>{n++;return {state:'ALREADY_SCHEDULED'}};
 const m=mock();
 const r1=await scheduleSingleMetricoolVideo({plan:plan(),env:{...env,SOCIAL_PUBLISH_ENABLED:'false'},
  fetcher:m.fetcher,confirmWriteReserved});
 assert.equal(r1.scheduled,false);assert.equal(m.calls.length,0);
 const r2=await scheduleSingleMetricoolVideo({plan:plan(),env,fetcher:m.fetcher,
 confirmWriteReserved:blocker});
 assert.equal(r2.reason,'PUBLISH_WRITE_ALREADY_STARTED_NO_BLIND_RETRY');
 assert.equal(n,1);assert.equal(m.calls.some(c=>c.method==='POST'),false);
});
test('post schemas cover Shorts, Facebook Reels, TikTok, Threads independently',()=>{
 for(const net of ['facebook','tiktok','youtube','threads']){
  const p=plan({network:net,slotClaim:{...slotClaim,network:net}});
  assert.equal(p.state,'REVIEWED_VIDEO_SCHEDULING_PLAN');
  assert.equal(p.body.providers[0].network,net);
  assert.equal(p.body.media[0],videoUrl);
  if(net==='youtube'){assert.equal(p.body.youtubeData.type,'short');assert.equal(p.body.youtubeData.madeForKids,false)}
  if(net==='tiktok')assert.equal(p.body.tiktokData.isAigc,true);
  if(net==='facebook')assert.equal(p.body.facebookData.type,'REEL');
 }
});
