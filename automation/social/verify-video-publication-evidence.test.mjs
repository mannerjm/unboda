import test from 'node:test';import assert from 'node:assert/strict';
import {verifyVideoPublishReceipt} from './verify-video-publication-evidence.mjs';
const url='https://www.instagram.com/reel/abcdef12/';
const expected={sha256:'a'.repeat(64),jobKey:'video-job-20261028-abcdef12',network:'instagram',brandId:'7377653'};
const provider={source:'metricool-confirmed-published-post',brandId:'7377653',
 network:'instagram',jobKey:expected.jobKey,originalAssetSha256:expected.sha256,
 status:'PUBLISHED',videoMediaAttached:true,providerPostId:'original-vid-a12',
 publishedAt:'2026-10-28T10:00:00Z',publicUrl:url};
const publicCheck={url,httpStatus:200,publiclyReachable:true,
 videoOnPageVerified:true,platformPostId:'original-vid-a12',
 checkedAt:'2026-10-28T10:03:00Z'};
test('one verified real platform URL proves only that specific channel, not four daily automation',()=>{
 const x=verifyVideoPublishReceipt({expected,provider,publicCheck});
 assert.equal(x.state,'SINGLE_CHANNEL_PUBLICATION_PROVED');
 assert.equal(x.recordedPublication,true);assert.equal(x.activateFourPerDay,false);
});
test('actual published post unavailable means scheduled content cannot masquerade as live',()=>{
 assert.equal(verifyVideoPublishReceipt({}).recordedPublication,false);
 for(const o of [
  {...provider,status:'PENDING'}, {...provider,status:'SCHEDULED'},
  {...provider,status:'DRAFT'}, {...provider,videoMediaAttached:false},
  {...provider,originalAssetSha256:'b'.repeat(64)},
  {...provider,jobKey:'someone-else'}
 ]){
  const x=verifyVideoPublishReceipt({expected,provider:o,publicCheck});
  assert.equal(x.state,'PUBLICATION_UNVERIFIED');
 }
});
test('preview, malicious domain and unverified public page never constitute proof',()=>{
 for(const publicUrl of [
  'https://instagram.com.evil.invalid/reel/abc',
  'https://www.instagram.com/p/abcdef12/',
  'http://www.instagram.com/reel/abcdef12/',
  'https://unboda-social-worker.vercel.app/private/preview.mp4'
 ]){
  const r=verifyVideoPublishReceipt({expected,provider:{...provider,publicUrl},
  publicCheck:{...publicCheck,url:publicUrl}});
  assert.equal(r.recordedPublication,false);
 }
 for(const check of [
  {...publicCheck,httpStatus:302}, {...publicCheck,publiclyReachable:false},
  {...publicCheck,videoOnPageVerified:false},
  {...publicCheck,platformPostId:'different-post'}
 ]){
  const r=verifyVideoPublishReceipt({expected,provider,publicCheck:check});
  assert.equal(r.recordedPublication,false);
 }
});
