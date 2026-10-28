"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {makeSourceClaim}=require("../lib/video-claim.cjs");
test("one original SHA cannot reserve a second date",async()=>{
 let writes=0;
 const claim=makeSourceClaim({token:"SAFE_FAKE_TEST_TOKEN_AT_LEAST_32_CHARS",
  put:async(path,payload,options)=>{
   writes++;
   assert.equal(options.allowOverwrite,false);
   if(writes>1)throw Error("file already exists");
   return {pathname:path,url:"https://public.blob.example/"+path};
  }});
 const sha="a".repeat(64);
 const common={brandId:"7377653",sourceSha256:sha,
  sourceTag:"unboda-saju-shorts-20261029"};
 const first=await claim({...common,slotUtc:"2026-10-28T15:00:00.000Z"});
 const second=await claim({...common,slotUtc:"2026-10-29T11:00:00.000Z"});
 assert.equal(first.state,"FIRST_ORIGINAL_CLAIM_GRANTED");
 assert.equal(second.state,"ORIGINAL_USED_OR_CLAIM_UNCERTAIN_NO_RETRY");
});
