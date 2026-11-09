import {test} from "node:test";
import assert from "node:assert/strict";
import {createOneShotSupabaseClaimStore} from "./lifestyle-supabase-claim-store.mjs";
const URL="https://xdiitqyysmhicjcytckm.supabase.co";
const KEY="fake-service-role-NEVER-PRODUCTION-1234567890";
const uuid="c82d9dbe-8ad1-4525-a34e-f86ad879ad0a";
function harness(){
 const claims=new Map(),usage=new Map(),calls=[];
 const fetcher=async(url,request)=>{
  const u=new URLSearchParams(url.split("?")[1]);
  const table=url.split("/rest/v1/")[1].split("?")[0];
  const payload=JSON.parse(request.body||"{}");
  calls.push({table,method:request.method,headers:request.headers,query:Object.fromEntries(u),payload});
  let out=[];
  if(request.method==="POST" && table==="unboda_social_lifestyle_claims"){
   const id=payload.slot_date+"|"+payload.slot_hour+"|"+payload.network;
   if(!claims.has(id)){claims.set(id,{...payload,claim_token:uuid,state:"claimed"});out=[{claim_token:uuid}]}
  }else if(request.method==="POST" && table==="unboda_social_lifestyle_media_usage"){
   if(!usage.has(payload.media_sha256)){
    usage.set(payload.media_sha256,payload);out=[{media_sha256:payload.media_sha256}]
   }
  }else if(request.method==="PATCH"){
   const id=u.get("slot_date").slice(3)+"|"+u.get("slot_hour").slice(3)+"|"+u.get("network").slice(3);
   const row=claims.get(id);
   if(row && u.get("state")==="eq."+row.state && u.get("claim_token")==="eq."+row.claim_token){
    Object.assign(row,payload);out=[{claim_token:row.claim_token}];
   }
  }
  return {ok:true,status:200,json:async()=>out};
 };
 return {fetcher,calls,claims,usage};
}
function makeStore(h){return createOneShotSupabaseClaimStore({
 projectUrl:URL,serviceKey:KEY,fetcher:h.fetcher
})}
function claim(hour="01",media="a".repeat(64)){
 const network=hour==="01"?"facebook":"instagram";
 return {key:"2026-11-10|"+hour+"|"+network,
  dateKst:"2026-11-10",hourKst:hour,network,
  content:"운보다 테스트",mediaSha256:media,
  imagePhash:"ab".repeat(8),sourcePage:"https://commons.wikimedia.org/wiki/File:Test.jpg",
  attribution:"CC0 public domain"};
}
test("one-shot claim and photo hash are committed in two private staging-only requests",async()=>{
 const h=harness(),s=makeStore(h);
 const r=await s.tryClaim(claim());
 assert.equal(r.created,true);
 assert.equal(r.claimToken,uuid);
 assert.equal(h.claims.size,1);
 assert.equal(h.usage.size,1);
 assert.deepEqual(h.calls.map(x=>x.method+":"+x.table),[
  "POST:unboda_social_lifestyle_claims",
  "POST:unboda_social_lifestyle_media_usage"]);
});
test("repeated slot claim returns created=false without reusing photo",async()=>{
 const h=harness(),s=makeStore(h);
 await s.tryClaim(claim());
 const r=await s.tryClaim(claim());
 assert.equal(r.created,false);
 assert.equal(h.claims.size,1);
 assert.equal(h.usage.size,1);
});
test("photo digest reused at a different slot is rejected",async()=>{
 const h=harness(),s=makeStore(h);
 await s.tryClaim(claim("01"));
 await assert.rejects(s.tryClaim(claim("04")),/MEDIA_ALREADY_RESERVED_NEVER_REUSE/);
});
test("posting then scheduled transitions use exact state and token comparisons",async()=>{
 const h=harness(),s=makeStore(h);
 const r=await s.tryClaim(claim());
 const key=claim().key;
 await s.markPosting({key,claimToken:r.claimToken});
 await s.markScheduled({key,claimToken:r.claimToken,providerPostId:418833307});
 assert.equal(h.claims.get("2026-11-10|1|facebook").state,"scheduled");
 assert.equal(h.claims.get("2026-11-10|1|facebook").metricool_post_id,418833307);
 assert.equal(h.calls.filter(x=>x.method==="PATCH").length,2);
});
test("uncertain POST is tracked in DB without auto-resending",async()=>{
 const h=harness(),s=makeStore(h);
 const r=await s.tryClaim(claim());
 await s.markPosting({key:claim().key,claimToken:r.claimToken});
 await s.markUnknown({key:claim().key,claimToken:r.claimToken});
 assert.equal(h.claims.get("2026-11-10|1|facebook").state,"error_unknown");
 await assert.rejects(s.markScheduled({key:claim().key,claimToken:r.claimToken,providerPostId:1}),
  /SCHEDULED_TRANSITION_NOT_ATOMIC/);
});
test("production connection disabled without explicit verified schema opt-in",()=>{
 assert.throws(()=>createOneShotSupabaseClaimStore({
  projectUrl:"https://eiyvdmorqclirvidihlm.supabase.co",serviceKey:KEY,
  fetcher:()=>{}}),/PRODUCTION_SOCIAL_CLAIM_CONNECTION_DISABLED/);
});
test("bogus non-Supabase URL and too-short secret rejected",()=>{
 assert.throws(()=>createOneShotSupabaseClaimStore({
  projectUrl:"http://example.com",serviceKey:KEY,fetcher:()=>{}}));
 assert.throws(()=>createOneShotSupabaseClaimStore({
  projectUrl:URL,serviceKey:"not-a-key",fetcher:()=>{}}));
});
test("unknown slot network cannot create a claim",async()=>{
 const h=harness(),s=makeStore(h);
 const bad=claim();bad.network="youtube";bad.key="2026-11-10|01|youtube";
 await assert.rejects(s.tryClaim(bad));
 assert.equal(h.calls.length,0);
});
