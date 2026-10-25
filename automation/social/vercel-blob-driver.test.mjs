import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {createVercelPublicBlobWriter} from "./vercel-blob-driver.mjs";
const bytes=new Uint8Array(1600);
const sha256=createHash("sha256").update(bytes).digest("hex");
const key="unboda-social/pilots/first123-aabbccdd.mp4";
test("unconfigured or unapproved blob writer never writes",async()=>{
 let calls=0;
 const put=async()=>{calls++;return {}};
 const writer=createVercelPublicBlobWriter({put});
 const r=await writer({key,bytes,sha256,contentType:"video/mp4"});
 assert.equal(r.persisted,false);
 assert.equal(calls,0);
});
test("approved media source automatically enters public Blob store and returns permanent URL",async()=>{
 let calls=0;
 const url="https://example.public.blob.vercel-storage.com/"+key;
 const writer=createVercelPublicBlobWriter({ownerApprovedStorage:true,
  put:async (pathname,data,opts)=>{
   calls++;
   assert.equal(pathname,key);
   assert.equal(data.length,bytes.length);
   assert.equal(opts.access,"public");
   assert.equal(opts.allowOverwrite,false);
   assert.equal(opts.addRandomSuffix,false);
   return {url,pathname};
  }});
 const r=await writer({key,bytes,sha256,contentType:"video/mp4"});
 assert.equal(calls,1);
 assert.equal(r.persisted,true);
 assert.equal(r.url,url);
});
test("malicious pathname is blocked before writing",async()=>{
 let calls=0;
 const writer=createVercelPublicBlobWriter({ownerApprovedStorage:true,
  put:async()=>{calls++}});
 for(const x of ["../foo.mp4","unboda-social/pilots/../../x.mp4",
  "unboda-social/pilots/file.png","other/x.mp4"]){
  const r=await writer({key:x,bytes,sha256,contentType:"video/mp4"});
  assert.equal(r.persisted,false);
 }
 assert.equal(calls,0);
});
test("storage failure remains unconfirmed without blind retry",async()=>{
 const writer=createVercelPublicBlobWriter({ownerApprovedStorage:true,
  put:async()=>{throw Error("rate-limited or conflict")}});
 const r=await writer({key,bytes,sha256,contentType:"video/mp4"});
 assert.equal(r.persisted,false);
 assert.equal(r.reason,"BLOB_WRITE_UNKNOWN_RECONCILE_BY_PATH");
});
