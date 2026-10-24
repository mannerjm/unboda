import test from "node:test";
import assert from "node:assert/strict";
import {motionRequest,requestMotionClip,readMotionTask} from "./motion.mjs";
const budget={approvedMonthlyLimitCents:2000,spentCents:100,reservedCents:200,
 budgetLockAcquired:true,subscriptionConfirmed:true};
const base={imageUri:"https://assets.example.org/original-first-frame.png",
 prompt:"A cinematic slow push-in through a mystical yet educational Korean zodiac illustration, smooth atmospheric motion.",
 durationSeconds:5,imageRightsApproved:true,editorialApproved:true,
 estimatedCents:100,budget,reservationId:"video-reservation-04",allowPaid:true};
const key="runway_mock_api_key";
const taskId="17f20503-6c24-4c16-946b-35dbbce2af2f";
test("Runway clip needs verified image rights and spending authorization",()=>{
 assert.equal(motionRequest({...base,allowPaid:false}).authorized,false);
 assert.ok(motionRequest({...base,imageRightsApproved:false}).reasons.includes("SOURCE_IMAGE_RIGHTS_REQUIRED"));
 assert.ok(motionRequest({...base,imageUri:"file:///tmp/picture.png"}).reasons.includes("HTTPS_SOURCE_IMAGE_REQUIRED"));
 assert.ok(motionRequest({...base,durationSeconds:20}).reasons.includes("DURATION_UNSUPPORTED"));
 assert.ok(motionRequest({...base,budget:{...budget,approvedMonthlyLimitCents:0}})
  .reasons.includes("MONTHLY_BUDGET_NOT_APPROVED"));
});
test("no paid video task starts without opt-in",async()=>{
 let hit=false;
 const r=await requestMotionClip({...base,allowPaid:false,apiKey:key,
  fetcher:async()=>{hit=true;throw Error("unexpected");}});
 assert.equal(r.state,"BLOCKED");assert.equal(hit,false);
});
test("mock Runway image-to-video task created, not yet rendered",async()=>{
 let count=0;
 const r=await requestMotionClip({...base,apiKey:key,fetcher:async(url,request)=>{
  count++;assert.equal(url,"https://api.dev.runwayml.com/v1/image_to_video");
  assert.equal(request.headers["X-Runway-Version"],"2024-11-06");
  const body=JSON.parse(request.body);
  assert.equal(body.model,"gen4_turbo");
  assert.equal(body.ratio,"720:1280");
  assert.equal(body.duration,5);
  return {ok:true,json:async()=>({id:taskId})};
 }});
 assert.equal(count,1);assert.equal(r.state,"GENERATION_TASK_ACCEPTED");
 assert.equal(r.taskId,taskId);assert.equal(r.outputNotVerified,true);
});
test("polling is restricted to >=5 seconds",async()=>{
 let hit=false;
 const r=await readMotionTask({taskId,apiKey:key,lastPolledAt:1000,now:2000,
  fetcher:async()=>{hit=true;throw Error("no premature poll");}});
 assert.equal(r.state,"WAIT");assert.equal(hit,false);
});
test("Runway completed task still needs download + QC",async()=>{
 const r=await readMotionTask({taskId,apiKey:key,fetcher:async()=>({
  ok:true,json:async()=>({status:"SUCCEEDED",output:["https://cdn.runway.example/clip.mp4"]})
 })});
 assert.equal(r.state,"MOTION_GENERATED_NEEDS_QA");
 assert.equal(r.requires.includes("ffprobe"),true);
});
test("missing remote task output is not a success",async()=>{
 const r=await readMotionTask({taskId,apiKey:key,fetcher:async()=>({
  ok:true,json:async()=>({status:"SUCCEEDED",output:[]})
 })});
 assert.equal(r.reason,"OUTPUT_URL_MISSING");
});
test("failed task or account block remains failed",async()=>{
 const r=await readMotionTask({taskId,apiKey:key,fetcher:async()=>({
  ok:true,json:async()=>({status:"FAILED"})
 })});
 assert.equal(r.state,"FAILED");
});
