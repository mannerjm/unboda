const test=require("node:test"),assert=require("node:assert/strict");
const {audit,handlerFor,secureEqual,slot,kstIso}=require("../lib/monitor.cjs");
const env={CRON_SECRET:"a".repeat(64),METRICOOL_API_TOKEN:"mock-token",
 METRICOOL_USER_ID:"5729495",METRICOOL_BLOG_ID:"7377653",
 SOCIAL_PUBLISH_ENABLED:"false",SOCIAL_PAID_GENERATION_ENABLED:"false"};
test("secure cron auth denies missing and short secrets",()=>{
 assert.equal(secureEqual("Bearer "+"a".repeat(64),"Bearer "+"a".repeat(64)),true);
 assert.equal(secureEqual("Bearer x","Bearer "+"a".repeat(64)),false);
 assert.equal(secureEqual("Bearer "+"a".repeat(64),""),false);
});
test("KST exact text and video slots",()=>{
 assert.equal(slot("text-image",Date.parse("2026-10-26T19:30:00+09:00")),true);
 for(const hour of [0,8,12,20])assert.equal(slot("short-video",Date.parse(`2026-10-27T${String(hour).padStart(2,"0")}:00:00+09:00`)),true);
 assert.equal(slot("short-video",Date.parse("2026-10-27T02:00:00+09:00")),false);
 assert.equal(slot("short-video",Date.parse("2026-10-27T14:00:00+09:00")),false);
 assert.equal(slot("short-video",Date.parse("2026-10-26T19:30:00+09:00")),false);
 assert.equal(kstIso(Date.parse("2026-10-26T20:00:00+09:00")),"2026-10-26T20:00:00");
});
test("audit only GET and reports aggregate counts",async()=>{
 let methods=[];
 const result=await audit("text-image",{env,now:Date.parse("2026-10-26T19:00:00+09:00"),
 fetcher:async(url,options)=>{
  methods.push(options.method);
  assert.ok(url.toString().includes("blogId=7377653"));
  return {ok:true,status:200,json:async()=>({data:[
   {publicationDate:{dateTime:"2026-10-26T22:30:00"},providers:[{network:"facebook",status:"PENDING"}]},
   {publicationDate:{dateTime:"2026-10-26T13:30:00"},providers:[{network:"threads",status:"PUBLISHED"}]}
  ]})};
 }});
 assert.deepEqual(methods,["GET"]);assert.equal(result.status,200);
 assert.equal(result.body.perNetwork.PENDING,1);assert.equal(result.body.perNetwork.PUBLISHED,1);
 assert.equal(result.body.publishing,false);assert.equal(result.body.quotaNotVerified,true);
 assert.equal(result.body.next48hQueueItems,1);
 assert.equal(JSON.stringify(result).includes("mock-token"),false);
});
test("publishing flags must stay disabled",async()=>{
 let called=false;
 const r=await audit("text-image",{env:{...env,SOCIAL_PUBLISH_ENABLED:"true"},
 fetcher:async()=>{called=true;throw Error("unexpected");}});
 assert.equal(r.status,503);assert.equal(called,false);
});
test("unprivileged requests cannot trigger a remote GET",async()=>{
 let count=0; const response={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}};
 const fn=handlerFor("text-image",{env,fetcher:async()=>{count++;},now:Date.now()});
 await fn({method:"GET",headers:{}},response);
 assert.equal(response.statusCode,401);assert.equal(count,0);
});
test("upstream fails closed",async()=>{
 const r=await audit("short-video",{env,fetcher:async()=>({ok:false,status:401})});
 assert.equal(r.status,502);assert.equal(r.body.publishing,false);
});

test("live IG and Facebook Reels outside fixed KST slots trigger nonpublishing conflict warning",async()=>{
 const now=Date.parse("2026-10-28T20:00:00+09:00");
 const data={data:[
  {draft:false,autoPublish:true,publicationDate:{dateTime:"2026-10-29T11:00:00"},
   instagramData:{type:"REEL"},providers:[{network:"instagram",status:"PENDING"}]},
  {draft:false,autoPublish:true,publicationDate:{dateTime:"2026-10-29T11:00:00"},
   facebookData:{type:"REEL"},providers:[{network:"facebook",status:"PENDING"}]},
  {draft:false,autoPublish:true,publicationDate:{dateTime:"2026-10-29T08:00:00"},
   instagramData:{type:"REEL"},providers:[{network:"instagram",status:"PENDING"}]},
  {draft:true,autoPublish:false,publicationDate:{dateTime:"2026-10-30T08:00:00"},
   instagramData:{type:"REEL"},providers:[{network:"instagram",status:"PENDING"}]}
 ]};
 const r=await audit("short-video",{env,now,fetcher:async(_url,options)=>{
  assert.equal(options.method,"GET");return {ok:true,status:200,json:async()=>data};
 }});
 assert.equal(r.status,200);assert.equal(r.body.estimatedVideoItems,4);
 assert.equal(r.body.fixedSlotVideoConflicts.length,2);
 assert.equal(r.body.requiresExistingReservationsReview,true);
 assert.equal(r.body.canEnableIndependentVideoPublisher,false);
});
test("read-only audit never treats a draft video as a publication conflict",async()=>{
 const r=await audit("short-video",{env,now:Date.parse("2026-10-28T20:00:00+09:00"),
  fetcher:async()=>({ok:true,json:async()=>({data:[{
    draft:true,autoPublish:false,
    publicationDate:{dateTime:"2026-10-29T11:00:00"},instagramData:{type:"REEL"},
    providers:[{network:"instagram",status:"PENDING"}]
   }]})})});
 assert.equal(r.body.fixedSlotVideoConflicts.length,0);
 assert.equal(r.body.canEnableIndependentVideoPublisher,false);
});

test("logs only safe aggregate after authenticated audit, never provider secret or post text",async()=>{
 const logs=[],secret="SUPER-SENSITIVE-TEST-TOKEN";
 const localEnv={...env,METRICOOL_API_TOKEN:secret};
 const response={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}};
 const run=handlerFor("short-video",{env:localEnv,now:Date.parse("2026-10-28T20:00:00+09:00"),
  logger:{info(...args){logs.push(args);}},
  fetcher:async()=>({ok:true,json:async()=>({data:[{
   publicationDate:{dateTime:"2026-10-29T08:00:00"},
   providers:[{network:"instagram",status:"PENDING"}],
   text:"PRIVATE_POST_BODY",title:"PRIVATE_PERSON"
  }]})})});
 await run({method:"GET",headers:{authorization:"Bearer "+localEnv.CRON_SECRET}},response);
 assert.equal(response.statusCode,200);
 assert.equal(logs.length,1);
 assert.ok(logs[0][0].includes("unboda_social_cron_audit"));
 const serialized=JSON.stringify(logs);
 assert.equal(serialized.includes(secret),false);
 assert.equal(serialized.includes("PRIVATE_POST_BODY"),false);
 assert.equal(serialized.includes("PRIVATE_PERSON"),false);
 assert.equal(JSON.parse(logs[0][1]).publishing,false);
});
