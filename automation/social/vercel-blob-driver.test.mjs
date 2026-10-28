import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {createVercelPublicBlobWriter} from "./vercel-blob-driver.mjs";
const bytes=new Uint8Array(1600);
bytes.set([0x00,0x00,0x00,0x18,0x66,0x74,0x79,0x70,0x69,0x73,0x6f,0x6d],0);
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


test("source content hash mismatch blocks storage before SDK write",async()=>{
 let calls=0;
 const writer=createVercelPublicBlobWriter({ownerApprovedStorage:true,
   put:async()=>{calls++;throw Error("unexpected")}});
 const r=await writer({key,bytes,sha256:"0".repeat(64),contentType:"video/mp4"});
 assert.equal(r.persisted,false);
 assert.equal(r.reason,"MEDIA_SHA256_MISMATCH");
 assert.equal(calls,0);
});
test("untrusted public URL, deceptive suffix or wrong object key never acknowledges storage",async()=>{
 const urls=[
   "https://evil.example.com/"+key,
   "https://example.public.blob.vercel-storage.com.evil.invalid/"+key,
   "https://example.private.blob.vercel-storage.com/"+key,
   "https://example.public.blob.vercel-storage.com/"+key+"?token=expiring",
   "https://example.public.blob.vercel-storage.com/wrong.mp4"
 ];
 for(const url of urls){
  let calls=0;
  const writer=createVercelPublicBlobWriter({ownerApprovedStorage:true,
   put:async()=>{calls++;return {url,pathname:key}}});
  const r=await writer({key,bytes,sha256,contentType:"video/mp4"});
  assert.equal(calls,1);
  assert.equal(r.persisted,false);
  assert.equal(r.reason,"BLOB_RECEIPT_UNVERIFIED_RECONCILE_BY_PATH");
 }
});

test("renamed picture or invalid video cannot be stored as MP4",async()=>{
 let calls=0;
 const bad=new Uint8Array(1600);
 const writer=createVercelPublicBlobWriter({ownerApprovedStorage:true,
  put:async()=>{calls++;throw Error("unexpected")}});
 const r=await writer({key,bytes:bad,
  sha256:createHash("sha256").update(bad).digest("hex"),contentType:"video/mp4"});
 assert.equal(r.persisted,false);
 assert.equal(r.reason,"MP4_CONTAINER_SIGNATURE_INVALID");
 assert.equal(calls,0);
});
