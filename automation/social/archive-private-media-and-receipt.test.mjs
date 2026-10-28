import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {archiveVideoToPrivateReviewLedger} from './archive-private-media-and-receipt.mjs';
const bytes=new Uint8Array(1800);
bytes.set([0,0,0,20,102,116,121,112],0);
const sha=createHash('sha256').update(bytes).digest('hex');
const objectKey='qa/'+sha+'.mp4';
const qa={state:'PASS_TECHNICAL_ONLY',technicalChecksPassed:true,
 publicationAllowed:false,reasons:[],video:{sha256:sha,bytes:1800}};
let uploads=0,records=0,reads=0;
const provider=()=>({bucket:'unboda-social-private-review',
 usesServerServiceRole:true,isPrivateBucket:true,
 upload:async()=>{uploads++;return {bucket:'unboda-social-private-review',path:objectKey}},
 download:async()=>{reads++;return bytes}});
const persist=async({sha256,objectKey:path,bytes:n,actualReadbackSha256})=>{
 records++;assert.equal(sha256,sha);assert.equal(actualReadbackSha256,sha);
 return {state:'PRIVATE_ARCHIVE_DB_RECORDED',
 sha256,objectKey:path,bytes:n,publicationAllowed:false,
 publicUrl:null,socialPostCreated:false};
};
const approved=()=>({bytes,qa,privateStorage:provider(),
 persistReadbackReceipt:persist,ownerApprovedPrivateStorage:true,
 authorizedMonthlyStorageBytes:1900});
test('unapproved storage or invalid QA performs no writes at all',async()=>{
 uploads=records=reads=0;
 for(const changes of [
  {ownerApprovedPrivateStorage:false},
  {authorizedMonthlyStorageBytes:0},
  {qa:{...qa,publicationAllowed:true}},
  {qa:{...qa,video:{...qa.video,sha256:'f'.repeat(64)}}},
  {privateStorage:{...provider(),isPrivateBucket:false}},
  {persistReadbackReceipt:null}
 ]){
  const r=await archiveVideoToPrivateReviewLedger({...approved(),...changes});
  assert.equal(r.state,'BLOCKED');
 }
 assert.equal(uploads,0);assert.equal(reads,0);assert.equal(records,0);
});
test('staging private object readback must precede one DB record, no SNS',async()=>{
 uploads=records=reads=0;
 const result=await archiveVideoToPrivateReviewLedger(approved());
 assert.equal(result.state,'PRIVATE_MP4_VERIFIED_AND_RECORDED');
 assert.equal(uploads,1);assert.equal(reads,1);assert.equal(records,1);
 assert.equal(result.publicUrl,null);assert.equal(result.publicationAllowed,false);
 assert.equal(result.snsPostCreated,false);
});
test('DB unavailable after upload never triggers a second upload',async()=>{
 uploads=records=reads=0;
 const result=await archiveVideoToPrivateReviewLedger({...approved(),
  persistReadbackReceipt:async()=>{records++;throw Error('DB unavailable')}});
 assert.equal(result.reason,'STORAGE_VERIFIED_BUT_DB_RECONCILIATION_REQUIRED');
 assert.equal(result.doNotBlindlyRetry,true);
 assert.equal(uploads,1);assert.equal(records,1);
});
test('forged DB public URL is rejected after verifying object',async()=>{
 uploads=records=reads=0;
 const result=await archiveVideoToPrivateReviewLedger({...approved(),
  persistReadbackReceipt:async(args)=>({
   ...await persist(args),publicUrl:'https://public.invalid/video.mp4'})});
 assert.equal(result.state,'BLOCKED');
 assert.equal(result.reason,'PRIVATE_DB_RECEIPT_UNVERIFIED');
 assert.equal(result.publicationAllowed,false);
 assert.equal(records,1);
});
