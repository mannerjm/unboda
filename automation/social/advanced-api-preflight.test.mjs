import test from "node:test";
import assert from "node:assert/strict";
import {verifyAdvancedRestAccess} from "./advanced-api-preflight.mjs";
const env={METRICOOL_API_TOKEN:"mock-token-not-real",METRICOOL_USER_ID:"5729495",METRICOOL_BLOG_ID:"7377653"};
test("read-only preflight fails closed and never calls remote without opt-in",async()=>{
 let called=0;
 const result=await verifyAdvancedRestAccess({env,fetcher:async()=>{called++;throw Error("unexpected");}});
 assert.equal(result.state,"BLOCKED");assert.equal(called,0);
});
test("refuses missing token and wrong account even with read enabled",async()=>{
 let called=0;const fetcher=async()=>{called++;throw Error("unexpected");};
 assert.equal((await verifyAdvancedRestAccess({env:{...env,METRICOOL_API_TOKEN:""},allowNetwork:true,fetcher})).reason,"METRICOOL_API_TOKEN_MISSING");
 assert.equal((await verifyAdvancedRestAccess({env:{...env,METRICOOL_BLOG_ID:"not-unboda"},allowNetwork:true,fetcher})).reason,"BRAND_IDENTITY_UNVERIFIED");
 assert.equal(called,0);
});
test("only authorized GET discovers expected brand without publishing",async()=>{
 let calls=0;
 const result=await verifyAdvancedRestAccess({env,allowNetwork:true,fetcher:async(url,opts)=>{
  calls++;assert.equal(opts.method,"GET");assert.match(url.href,/\/api\/admin\/simpleProfiles/);
  assert.equal(url.searchParams.get("userId"),"5729495");
  assert.equal(opts.headers["X-Mc-Auth"],env.METRICOOL_API_TOKEN);
  return {ok:true,status:200,json:async()=>({data:[{id:7377653,label:"unboda.kr"}]})};
 }});
 assert.equal(calls,1);assert.equal(result.state,"REST_READ_AUTHENTICATED");
 assert.equal(result.externalWrites,false);assert.equal(result.postingNotYetVerified,true);
 assert.ok(!JSON.stringify(result).includes(env.METRICOOL_API_TOKEN));
});
test("401 or wrong-brand token does not count as verification",async()=>{
 const no=await verifyAdvancedRestAccess({env,allowNetwork:true,fetcher:async()=>({ok:false,status:401})});
 assert.equal(no.state,"FAILED");assert.equal(no.httpStatus,401);
 const mismatch=await verifyAdvancedRestAccess({env,allowNetwork:true,fetcher:async()=>({ok:true,json:async()=>({data:[{id:999}]})})});
 assert.equal(mismatch.reason,"BRAND_NOT_VISIBLE_TO_TOKEN");
});
test("unknown API schema fails closed instead of inventing success",async()=>{
 const out=await verifyAdvancedRestAccess({env,allowNetwork:true,fetcher:async()=>({ok:true,json:async()=>({message:"ok"})})});
 assert.equal(out.reason,"UNVERIFIED_PROFILES_RESPONSE_SCHEMA");
});
