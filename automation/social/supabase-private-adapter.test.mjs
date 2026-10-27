import test from 'node:test';import assert from 'node:assert/strict';
import {createSupabasePrivateReviewAdapter} from './supabase-private-adapter.mjs';
const BUCKET='unboda-social-private-review',key='qa/'+'a'.repeat(64)+'.mp4';
const blob=new Uint8Array(1600);
function mock({isPublic=false,limit=45000000,roleAllowed=true}={}){
 let writes=0;
 const bucket={id:BUCKET,public:isPublic,file_size_limit:limit,allowed_mime_types:['video/mp4']};
 const client={storage:{getBucket:async()=>({data:bucket}),from:(bucketId)=>{
  assert.equal(bucketId,BUCKET);
  return {upload:async(path,bytes,opts)=>{writes++;assert.equal(opts.upsert,false);
   return {data:{path,fullPath:BUCKET+'/'+path}}},
   download:async(path)=>({data:{arrayBuffer:async()=>blob.buffer}})};
 }}};
 return {client,roleAllowed,getWrites:()=>writes};
}
test('private role verified client may upload and download an exact object',async()=>{
 const x=mock();const a=await createSupabasePrivateReviewAdapter({client:x.client,serviceRoleEnvVerified:x.roleAllowed});
 assert.equal(a.isPrivateBucket,true);const r=await a.upload(key,blob,{upsert:false,contentType:'video/mp4'});
 assert.equal(r.path,key);assert.equal(x.getWrites(),1);const b=await a.download(key);
 assert.equal(b.length,1600);
});
test('public bucket, wrong limit or missing role never get an adapter',async()=>{
 for(const o of [{isPublic:true},{limit:60000000},{roleAllowed:false}]){
  const x=mock(o);assert.equal(await createSupabasePrivateReviewAdapter({client:x.client,serviceRoleEnvVerified:x.roleAllowed}),null);
  assert.equal(x.getWrites(),0);
 }
});
test('cross-path write injection is rejected before storage API call',async()=>{
 const x=mock();const a=await createSupabasePrivateReviewAdapter({client:x.client,serviceRoleEnvVerified:true});
 await assert.rejects(a.upload('../private.mp4',blob,{upsert:false,contentType:'video/mp4'}),/INVALID_STORAGE_REQUEST/);
 assert.equal(x.getWrites(),0);
});
