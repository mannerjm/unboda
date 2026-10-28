import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPrivateFourSlotManifest,inspectRepoPreviewBatch}
 from './four-daily-private-validator.mjs';
const manifest={
 schemaVersion:1,mode:'PRIVATE_REVIEW_ONLY',noAutomaticPublishing:true,
 paidProviderCallsAllowed:false,mediaRightsReviewed:false,
 verified90DayPublicHistory:false,scheduledProductionActivation:false,
 slots:[{kst:'00:00',brief:'episodes/003-midnight.json'},
 {kst:'08:00',brief:'episodes/004-commute.json'},
 {kst:'12:00',brief:'episodes/005-friendship.json'},
 {kst:'20:00',brief:'episodes/002-afterwork.json'}]
};
test('four distinct zero-publish daily KST slots have valid source drafts',()=>{
 const r=inspectRepoPreviewBatch();
 assert.equal(r.state,'FOUR_EPISODE_PRIVATE_REVIEW_PLAN',r.reason||'VALID');
 assert.deepEqual(r.slots.map(x=>x.kst),['00:00','08:00','12:00','20:00']);
 assert.equal(r.count,4);assert.equal(r.mediaReady,false);
 assert.equal(r.publicationAllowed,false);
 assert.equal(r.generateUniqueLiveAIContent,false);
});
test('cannot silently treat four static drafts as recurring AI or publishing workflow',()=>{
 let called=0;
 for(const changes of [
  {noAutomaticPublishing:false},{paidProviderCallsAllowed:true},
  {scheduledProductionActivation:true},{verified90DayPublicHistory:true},
  {mediaRightsReviewed:true},{mode:'LIVE_PUBLISH'}
 ]){
  const m={...manifest,...changes};
  const r=inspectPrivateFourSlotManifest(m,()=>{called++;throw Error('MUST_NOT_ACCESS_DISK')});
  assert.equal(r.state,'BLOCKED');
 }
 assert.equal(called,0);
});
test('fixed KST clock duplication and traversal paths fail before reading',()=>{
 for(const change of [
  {slots:[...manifest.slots.slice(0,3),{kst:'08:00',brief:'episodes/002-afterwork.json'}]},
  {slots:[...manifest.slots.slice(0,3),{kst:'20:00',brief:'../../etc/passwd'}]},
  {slots:manifest.slots.slice(1)}
 ]){
  const r=inspectPrivateFourSlotManifest({...manifest,...change},()=>({}));
  assert.equal(r.state,'BLOCKED');
 }
});
test('missing input or malformed live media manifests stay blocked',()=>{
 assert.equal(inspectPrivateFourSlotManifest(null,()=>null).state,'BLOCKED');
 assert.equal(inspectPrivateFourSlotManifest(manifest,()=>null).state,'BLOCKED');
});
