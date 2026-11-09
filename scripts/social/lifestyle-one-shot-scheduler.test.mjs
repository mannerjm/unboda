import {test} from "node:test";
import assert from "node:assert/strict";
import {scheduleSeven,expectedUtcTime} from "./lifestyle-one-shot-scheduler.mjs";
const hrs=["01","04","10","13","16","19","22"];
const nets=["facebook","instagram","threads","facebook","instagram","threads","facebook"];
function fixture(){
 const release={
  state:"PREFLIGHT_GATES_PASSED_NOT_PUBLISHED",ready:true,publishAttempted:false,
  dateKst:"2026-11-10",
  prepared:hrs.map((h,i)=>{
   const caption="운보다 무료 사주 - "+h;
   return {dateKst:"2026-11-10",hourKst:h,network:nets[i],
    photoSha256:(i+1).toString(16).repeat(64),
    topicKey:"unboda-unique-"+h,caption,captionLength:[...caption].length,
    mediaUrl:"https://unboda.kr/media/lifestyle-"+h+".jpg"}
  })};
 const calls=[];
 const posts=new Map();
 const claims=new Map();
 const pending=new Map();
 const store={
  async tryClaim(o){
   calls.push("CLAIM "+o.key);
   if(claims.has(o.key))return {created:false};
   const claimToken="claim-"+o.key;claims.set(o.key,{claimToken,state:"claimed"});
   return {created:true,claimToken};
  },
  async markPosting(o){calls.push("MARK_POSTING "+o.key);claims.get(o.key).state="posting"},
  async markScheduled(o){calls.push("MARK_SCHEDULED "+o.key);claims.get(o.key).state="scheduled"},
  async markUnknown(o){calls.push("MARK_UNKNOWN "+o.key);claims.get(o.key).state="unknown"}
 };
 const provider={
  async readSlot(p){
   calls.push("READ "+p.hourKst);
   return {complete:true,posts:posts.get(p.hourKst)||[]};
  },
  async submitOnce(p){
   calls.push("SUBMIT "+p.network+" "+p.publicationDate.dateTime);
   const id=10000+Number(p.publicationDate.dateTime.slice(11,13));
   posts.set(p.publicationDate.dateTime.slice(11,13),[{
    id,status:"PENDING",network:p.network,autoPublish:true,draft:false
   }]);
   return {id};
  },
  async verifyScheduled(p,actual,result){
   calls.push("VERIFY "+p.hourKst);
   return actual.id===result.id&&actual.status==="PENDING"&&
    actual.network===p.network&&actual.autoPublish===true&&actual.draft===false;
  }
 };
 return {release,calls,posts,claims,pending,store,provider};
}
const baseNow=Date.parse("2026-11-09T18:00:00+09:00");
async function run(f,overrides={}){
 return scheduleSeven({trustedRelease:f.release,claimStore:f.store,
 metricool:f.provider,nowMs:baseNow,
 dryRun:false,publishEnabled:true,...overrides});
}
test("strict date+timezone corresponds to correct UTC slot",()=>{
 assert.equal(new Date(expectedUtcTime("2026-11-10","01")).toISOString(),"2026-11-09T16:00:00.000Z");
});
test("normal dry run checks provider but never claims or posts",async()=>{
 const f=fixture();const r=await run(f,{dryRun:true});
 assert.equal(r.postRequests,0);
 assert.equal(r.confirmedReservations,0);
 assert.equal(f.calls.filter(x=>x.startsWith("CLAIM")).length,0);
 assert.equal(f.calls.filter(x=>x.startsWith("SUBMIT")).length,0);
});
test("publish flag disabled makes zero calls to provider write endpoint",async()=>{
 const f=fixture();const r=await run(f,{publishEnabled:false});
 assert.equal(r.postRequests,0);
 assert.equal(f.claims.size,0);
});
test("seven ready slots each get exactly one durable claim, POST and readback",async()=>{
 const f=fixture();const r=await run(f);
 assert.equal(r.confirmedReservations,7);
 assert.equal(r.postRequests,7);
 assert.equal(f.claims.size,7);
 assert.equal(f.calls.filter(x=>x.startsWith("SUBMIT")).length,7);
 assert(r.results.every(x=>x.state==="METRICOOL_PENDING_CONFIRMED_NOT_PUBLISHED"));
 const k="2026-11-10|01|facebook";
 assert(f.calls.indexOf("CLAIM "+k)<f.calls.indexOf("MARK_POSTING "+k));
 assert(f.calls.indexOf("MARK_POSTING "+k)<f.calls.indexOf("SUBMIT facebook 2026-11-10T01:00:00"));
});
test("same post cannot be auto-scheduled twice even after all slots are confirmed",async()=>{
 const f=fixture();await run(f);
 const r=await run(f);
 assert.equal(r.postRequests,0);
 assert(r.results.every(x=>x.state==="EXISTING_POST_ANY_STATUS_SKIP"));
});
test("a preexisting ERROR in one slot forbids blind retry",async()=>{
 const f=fixture();f.posts.set("10",[{id:11,status:"ERROR"}]);
 const r=await run(f);
 assert.equal(r.postRequests,6);
 assert.equal(r.results.find(x=>x.key.includes("|10|")).state,"EXISTING_POST_ANY_STATUS_SKIP");
});
test("incomplete provider list is NOT enough evidence to post",async()=>{
 const f=fixture();f.provider.readSlot=async()=>({complete:false,posts:[]});
 const r=await run(f);
 assert.equal(r.postRequests,0);
 assert(r.results.every(x=>x.state==="INCOMPLETE_PROVIDER_QUEUE_READ"));
});
test("claim conflict means no further API submit",async()=>{
 const f=fixture();f.store.tryClaim=async()=>({created:false});
 const r=await run(f);
 assert.equal(r.postRequests,0);
 assert(r.results.every(x=>x.state==="SLOT_ALREADY_CLAIMED_NO_POST"));
});
test("failure to commit pre-post state prevents API requests",async()=>{
 const f=fixture();f.store.markPosting=async()=>{throw Error("db unavailable")};
 const r=await run(f);
 assert.equal(r.postRequests,0);
 assert(r.results.every(x=>x.state==="DURABLE_PRE_POST_STATE_FAILED_NO_POST"));
});
test("provider timeout AFTER request marks UNKNOWN and never automatically reposts",async()=>{
 const f=fixture();f.provider.submitOnce=async()=>{throw Error("timeout after POST?")};
 const r=await run(f);
 assert.equal(r.postRequests,7);
 assert.equal(f.calls.filter(x=>x.startsWith("MARK_UNKNOWN")).length,7);
 assert(r.results.every(x=>x.state==="POST_RESPONSE_UNKNOWN_NEVER_RETRY"));
 const once=await run(f);
 assert.equal(once.postRequests,0);
});
test("bad readback after successful provider request requires manual resolution",async()=>{
 const f=fixture();f.provider.verifyScheduled=async()=>false;
 const r=await run(f);
 assert.equal(r.postRequests,7);
 assert.equal(r.confirmedReservations,0);
 assert(r.results.every(x=>x.state==="PENDING_NOT_CONFIRMED_NEVER_RETRY"));
});
test("untrusted release and extra provider networks are blocked before API calls",async()=>{
 const f=fixture();f.release.prepared[3].network="youtube";
 await assert.rejects(run(f),/INVALID_PREPARED_POST_OR_NETWORK/);
 assert.equal(f.calls.length,0);
});
test("near publish time aborts late slots, does not try risky instant repost",async()=>{
 const f=fixture();const r=await run(f,{nowMs:Date.parse("2026-11-10T00:40:00+09:00")});
 assert.equal(r.results[0].state,"LATE_SLOT_BLOCKED");
 assert.equal(r.postRequests,6);
});
