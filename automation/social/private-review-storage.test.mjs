import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {storeVideoAsPrivateReview} from './private-review-storage.mjs';
const bytes=new Uint8Array(2000);
bytes.set([0,0,0,24,102,116,121,112,105,115,111,109],0);
const sha256=createHash('sha256').update(bytes).digest('hex');
const path='qa/'+sha256+'.mp4';
const bucket='unboda-social-private-review';
const qa={state:'PASS_TECHNICAL_ONLY',technicalChecksPassed:true,
 publicationAllowed:false,reasons:[],video:{sha256,bytes:bytes.length}};
let writes=0,reads=0;
function adapter({overrideReceipt=null,downloaded=bytes}={}){
 return {bucket,usesServerServiceRole:true,isPrivateBucket:true,
  upload:async(key,data,opts)=>{
   writes++;
   assert.equal(key,path);
   assert.equal(data.length,bytes.length);
   assert.equal(opts.contentType,'video/mp4');
   assert.equal(opts.upsert,false);
   return overrideReceipt??{bucket,path};
  },
  download:async(key)=>{reads++;assert.equal(key,path);return downloaded;}
 };
}
const approved=()=>({qa,bytes,storage:adapter(),
 ownerApprovedPrivateStorage:true,authorizedMonthlyStorageBytes:5000});
test('default and unapproved spending never call external storage',async()=>{
 writes=0;reads=0;
 for(const overrides of [{},{ownerApprovedPrivateStorage:false},
  {authorizedMonthlyStorageBytes:0},{authorizedMonthlyStorageBytes:1999},
  {qa:{...qa,publicationAllowed:true}},
  {qa:{...qa,video:{...qa.video,sha256:'1'.repeat(64)}}},
  {bytes:new Uint8Array(2000)},
  {storage:{...adapter(),isPrivateBucket:false}},
  {alreadyWritten:true}
 ]){
  const r=await storeVideoAsPrivateReview({...approved(),...overrides});
  assert.equal(r.stored,false);assert.equal(r.published,false);
 }
 assert.equal(writes,0);assert.equal(reads,0);
});
test('actual server-only private storage success requires independent byte-for-byte SHA download',async()=>{
 writes=0;reads=0;
 const r=await storeVideoAsPrivateReview(approved());
 assert.equal(r.state,'PRIVATE_ARCHIVE_HASH_VERIFIED');
 assert.equal(r.stored,true);assert.equal(r.publicationAllowed,false);
 assert.equal(r.publicUrl,null);assert.equal(r.SNSPublished,false);
 assert.equal(r.objectKey,path);
 assert.equal(writes,1);assert.equal(reads,1);
});
test('public URL disguised as private receipt cannot be approved',async()=>{
 writes=0;reads=0;
 const r=await storeVideoAsPrivateReview({...approved(),
  storage:adapter({overrideReceipt:{bucket,path,publicUrl:'https://public.invalid/private.mp4'}})});
 assert.equal(r.state,'BLOCKED');
 assert.equal(r.reason,'UNTRUSTED_OR_PUBLIC_STORAGE_RECEIPT');
 assert.equal(r.stored,false);assert.equal(reads,0);
});
test('remote checksum mismatch forces reconciliation without blind retry',async()=>{
 writes=0;reads=0;
 const altered=Uint8Array.from(bytes);altered[14]=200;
 const r=await storeVideoAsPrivateReview({...approved(),
  storage:adapter({downloaded:altered})});
 assert.equal(r.state,'STORAGE_RECONCILIATION_REQUIRED');
 assert.equal(r.doNotBlindlyRetry,true);assert.equal(r.stored,false);
 assert.equal(writes,1);assert.equal(reads,1);
});
test('unexpected storage exception is held, never retried inside adapter',async()=>{
 writes=0;
 const r=await storeVideoAsPrivateReview({...approved(),storage:{
  bucket,usesServerServiceRole:true,isPrivateBucket:true,
  upload:async()=>{writes++;throw Error('ambiguous upstream timeout')},
  download:async()=>{throw Error('should not read')}
 }});
 assert.equal(r.state,'STORAGE_RECONCILIATION_REQUIRED');
 assert.equal(writes,1);
});
