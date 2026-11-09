import {test} from "node:test";
import assert from "node:assert/strict";
import {createMetricoolLifestyleHttpAdapter} from "./lifestyle-metricool-api-adapter.mjs";
const date="2026-11-10",hour="13",network="facebook";
const media="https://github.com/mannerjm/unboda/releases/download/unboda-lifestyle-photo-20261110/photo-13.jpg";
const post={dateKst:date,hourKst:hour,network,caption:"운보다 저축과 자산 관리",mediaUrl:media};
const token="metricool-fake-only-NEVER-A-REAL-API-KEY";
function mkMock(seed=[]){
 const calls=[],posts=seed;
 const fetcher=async(url,o)=>{
  calls.push({url,options:o});
  const method=o.method||"GET";
  if(method==="GET")return{ok:true,status:200,json:async()=>({data:posts,metadata:{}})};
  if(method==="POST"){
   const body=JSON.parse(o.body);
   const item={
    id:912345,publicationDate:body.publicationDate,
    providers:[{network:body.providers[0].network,status:"PENDING"}],
    text:body.text,media:body.media,autoPublish:true,draft:false
   };
   posts.push(item);
   return {ok:true,status:200,json:async()=>({data:{id:912345}})};
  }
  throw Error("UNEXPECTED_METHOD");
 };
 return {calls,posts,fetcher};
}
function adapter(mock){
 return createMetricoolLifestyleHttpAdapter({apiToken:token,
  userId:"123456",blogId:"7377653",fetcher:mock.fetcher});
}
test("full calendar reads ALL provider statuses, including PUBLISHED and ERROR",async()=>{
 const mock=mkMock([{
  id:33,publicationDate:{dateTime:"2026-11-10T13:00:00"},
  providers:[{network:"facebook",status:"ERROR"}]
 }]);
 const a=adapter(mock),r=await a.readSlot(post);
 assert.equal(r.complete,true);
 assert.equal(r.posts.length,1);
 assert.equal(r.posts[0].providers[0].status,"ERROR");
 assert.equal(mock.calls[0].options.method,"GET");
 assert.equal(mock.calls[0].options.headers["X-Mc-Auth"],token);
 const url=new URL(mock.calls[0].url);
 assert.equal(url.searchParams.get("userId"),"123456");
 assert.equal(url.searchParams.get("blogId"),"7377653");
 assert.equal(url.searchParams.get("timezone"),"Asia/Seoul");
});
test("unknown page continuation blocks scheduling rather than assume empty",async()=>{
 const fetcher=async()=>({ok:true,json:async()=>({data:[],metadata:{page:{hasNext:true}}})});
 const a=createMetricoolLifestyleHttpAdapter({apiToken:token,userId:"123456",fetcher});
 const r=await a.readSlot(post);
 assert.equal(r.complete,false);
});
test("one POST with exact provider, image, KST date and autoPublish",async()=>{
 const m=mkMock(),a=adapter(m);
 const result=await a.submitOnce({
  brandId:"7377653",autoPublish:true,draft:false,network,
  publicationDate:{dateTime:"2026-11-10T13:00:00",timezone:"Asia/Seoul"},
  date:"2026-11-10T13:00:00+09:00",text:post.caption,mediaUrl:media
 });
 assert.equal(result.id,912345);
 assert.equal(m.calls.filter(q=>q.options.method==="POST").length,1);
 const body=JSON.parse(m.calls[0].options.body);
 assert.deepEqual(body.providers,[{network:"facebook"}]);
 assert.deepEqual(body.media,[media]);
 assert.equal(body.autoPublish,true);
 assert.equal(body.draft,false);
 assert.equal(body.facebookData.type,"POST");
 assert(!("instagramData" in body));
 assert.equal(await a.verifyScheduled(post,m.posts[0],result),true);
});
test("published only after status PUBLISHED AND real public URL",async()=>{
 const m=mkMock([{
  id:123,publicationDate:{dateTime:"2026-11-10T13:00:00"},
  providers:[{network:"facebook",status:"PENDING",publicUrl:"https://facebook.com/example/123"}]
 }]);
 let x=await adapter(m).verifyActuallyPublished(post);
 assert.equal(x.verified,false);
 m.posts[0].providers[0].status="PUBLISHED";
 x=await adapter(m).verifyActuallyPublished(post);
 assert.equal(x.verified,true);
 assert.equal(x.postId,123);
});
test("provider error response cannot be interpreted as success, no retry",async()=>{
 let count=0;
 const m={fetcher:async(url,options)=>{
  count++;
  return {ok:false,status:504,json:async()=>({detail:"gateway timeout"})}
 }};
 const a=adapter(m);
 await assert.rejects(a.submitOnce({
  brandId:"7377653",autoPublish:true,draft:false,network,
  publicationDate:{dateTime:"2026-11-10T13:00:00",timezone:"Asia/Seoul"},
  date:"2026-11-10T13:00:00+09:00",text:post.caption,mediaUrl:media
 }),/REQUEST_REJECTED/);
 assert.equal(count,1);
});
test("unverified public media URL cannot cross a live API boundary",async()=>{
 const m=mkMock(),a=adapter(m);
 await assert.rejects(a.submitOnce({
  brandId:"7377653",autoPublish:true,draft:false,network,
  publicationDate:{dateTime:"2026-11-10T13:00:00",timezone:"Asia/Seoul"},
  date:"2026-11-10T13:00:00+09:00",
  text:post.caption,mediaUrl:"https://example.com/unsafe.jpg"
 }),/ONLY_IMMUTABLE/);
 assert.equal(m.calls.length,0);
});
test("wrong account token or brand cannot submit anything",()=>{
 assert.throws(()=>createMetricoolLifestyleHttpAdapter({
  apiToken:"short",userId:"123",fetcher:()=>{}}));
 assert.throws(()=>createMetricoolLifestyleHttpAdapter({
  apiToken:token,userId:"123",blogId:"4321",fetcher:()=>{}}));
});
test("no posts are made on import or adapter construction",()=>{
 const m=mkMock(),a=adapter(m);
 assert(a.verifyActuallyPublished);
 assert.equal(m.calls.length,0);
});
test("no incorrect network or timezone permitted",async()=>{
 const m=mkMock(),a=adapter(m);
 await assert.rejects(a.submitOnce({
  brandId:"7377653",autoPublish:true,draft:false,network:"youtube",
  publicationDate:{dateTime:"2026-11-10T13:00:00",timezone:"Asia/Seoul"},
  date:"2026-11-10T13:00:00+09:00",text:post.caption,mediaUrl:media
 }));
 await assert.rejects(a.submitOnce({
  brandId:"7377653",autoPublish:true,draft:false,network,
  publicationDate:{dateTime:"2026-11-10T13:00:00",timezone:"UTC"},
  date:"2026-11-10T13:00:00+09:00",text:post.caption,mediaUrl:media
 }));
 assert.equal(m.calls.length,0);
});
