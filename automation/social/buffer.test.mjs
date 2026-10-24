import test from "node:test";
import assert from "node:assert/strict";
import {planContentBuffer,plannedJobKey,bufferCoverage} from "./buffer.mjs";
const now=Date.parse("2026-10-24T20:00:00+09:00");
test("48h buffer exactly 16 images and 8 shorts",()=>{
 const jobs=planContentBuffer({now});
 assert.equal(jobs.length,24);
 assert.equal(jobs.filter(j=>j.kind==="text-image").length,16);
 assert.equal(jobs.filter(j=>j.kind==="short-video").length,8);
 assert.equal(new Set(jobs.map(j=>j.jobKey)).size,24);
 assert.ok(jobs.every(j=>j.state==="CANDIDATE_ONLY"));
});
test("stable idempotency keys survive restart",()=>{
 const one=planContentBuffer({now});
 const two=planContentBuffer({now});
 assert.deepEqual(one,two);
 assert.equal(plannedJobKey("short-video",Date.parse(one.find(j=>j.kind==="short-video").scheduledAt)),
  one.find(j=>j.kind==="short-video").jobKey);
});
test("known queued jobs are not regenerated",()=>{
 const jobs=planContentBuffer({now});
 const remaining=planContentBuffer({now,knownJobKeys:[jobs[0].jobKey,jobs[1].jobKey]});
 assert.equal(remaining.length,22);
 assert.ok(!remaining.some(j=>j.jobKey===jobs[0].jobKey));
});
test("buffer readiness requires actual media, rights and QA",()=>{
 const jobs=planContentBuffer({now}).map(j=>({
  ...j,state:"READY",mediaVerified:true,rightsVerified:true,editorialApproved:true
 }));
 assert.equal(bufferCoverage({jobs,now}).ready,true);
 jobs[0].editorialApproved=false;
 assert.equal(bufferCoverage({jobs,now}).ready,false);
});
test("candidate placeholder cannot be counted as ready",()=>{
 const r=bufferCoverage({jobs:planContentBuffer({now}),now});
 assert.equal(r.ready,false);
 assert.deepEqual(r.verifiedReady,{"text-image":0,"short-video":0});
});
test("invalid buffer window fail closed",()=>{
 assert.throws(()=>planContentBuffer({now,hours:0}),/INVALID_BUFFER/);
 assert.throws(()=>planContentBuffer({now,knownJobKeys:null}),/DURABLE_JOB_KEYS/);
 assert.throws(()=>plannedJobKey("long-video",now),/INVALID_SCHEDULE/);
});
