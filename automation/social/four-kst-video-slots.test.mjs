import test from 'node:test';
import assert from 'node:assert/strict';
import {buildNextVideoSlots,verifyWorkerVideoCron,inspectStagingSlotCoverage}
 from './four-kst-video-slots.mjs';
import {readFileSync} from 'node:fs';
const worker=JSON.parse(readFileSync(new URL('./cloud-worker/vercel.json',import.meta.url)));
test('15-minute prebook of KST 00,08,12,20 uses UTC 14,22 previous day,02,10',()=>{
 const r=verifyWorkerVideoCron(worker);
 assert.equal(r.state,'CORRECT_FOUR_KST_CRON');
 assert.deepEqual(r.utcHours,[2,10,14,22]);
 assert.equal(r.advanceMinutes,15);
 assert.equal(r.actualPublisherConnected,false);
});
test('48h plan always contains eight exact, separate local KST slot starts',()=>{
 const clocks=['2026-10-27T01:26:00+09:00','2026-10-27T20:00:00+09:00',
  '2026-10-31T23:59:59+09:00','2027-01-01T00:00:00+09:00',
  '2028-02-29T21:11:00+09:00'];
 for(const at of clocks){
  const r=buildNextVideoSlots(Date.parse(at));
  assert.equal(r.state,'PRIVATE_48H_SLOT_PLAN');
  assert.equal(r.videoSlots.length,8);
  assert.equal(new Set(r.videoSlots.map(x=>x.utc)).size,8);
  assert.ok(r.videoSlots.every(x=>['00:00','08:00','12:00','20:00'].includes(x.timeKst)));
  assert.equal(r.publishingEnabled,false);
  assert.equal(r.paidGenerationEnabled,false);
 }
});
test('will not accept a fifth hour, wrong minute, missing cron or second source cron',()=>{
 for(const schedule of ['45 2,10,14,21 * * *','0 2,10,14,22 * * *',
  '45 2,10,14,14 * * *','45 2,10,14,22,7 * * *','45 2,10,14,22 * * 1']){
  const invalid={crons:[{path:'/api/cron/video',schedule}]};
  assert.equal(verifyWorkerVideoCron(invalid).state,'BLOCKED',schedule);
 }
 assert.equal(verifyWorkerVideoCron({crons:[]}).state,'BLOCKED');
});
test('48h ledger needs one exact row per slot; extras and duplicates cannot imply readiness',()=>{
 const now=Date.parse('2026-10-27T13:00:00Z');
 const plan=buildNextVideoSlots(now);
 const jobs=plan.videoSlots.map(x=>({scheduled_for:x.utc,kind:'short-video',
   status:'PENDING',content:{realMediaReady:false}}));
 const good=inspectStagingSlotCoverage({atMs:now,jobs});
 assert.equal(good.state,'8_STAGING_SLOT_CANDIDATES_VERIFIED');
 assert.equal(good.canEnablePublisher,false);
 assert.equal(inspectStagingSlotCoverage({atMs:now,jobs:jobs.slice(1)}).state,'BLOCKED');
 assert.equal(inspectStagingSlotCoverage({atMs:now,jobs:[...jobs,jobs[0]]}).state,'BLOCKED');
 assert.equal(inspectStagingSlotCoverage({atMs:now,jobs:jobs.map(j=>({...j,status:'BLOCKED'}))}).state,'BLOCKED');
});
test('invalid offset or arbitrary lookahead does not produce schedulable slots',()=>{
 assert.equal(buildNextVideoSlots(NaN).state,'BLOCKED');
 assert.equal(buildNextVideoSlots(Date.now(),{hoursAhead:72}).state,'BLOCKED');
});
