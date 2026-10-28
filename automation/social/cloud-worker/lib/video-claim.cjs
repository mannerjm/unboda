"use strict";
// Distributed idempotency via Vercel Blob conditional create: first writer wins.
// Public claim content has no credentials, names, captions, or customer data.
const {createHash}=require("node:crypto");
const REPO_BRAND="7377653";
function makeVideoClaim({put,token}={}){
 return async function reserveSlot({brandId,network,slotUtc,sourceSha256,sourceTag}={}){
  if(typeof put!=="function"||typeof token!=="string"||token.length<20||
    brandId!==REPO_BRAND||
    !["instagram","facebook","youtube","tiktok","threads"].includes(network)||
    !/^[a-f0-9]{64}$/.test(sourceSha256??"")||
    !/^unboda-saju-shorts-\d{8}$/.test(sourceTag??"")||
    !Number.isFinite(Date.parse(slotUtc))||
    !/^\d{4}-\d\d-\d\dT(?:\d\d):00:00\.000Z$/.test(slotUtc??""))
    return {state:"INVALID_DURABLE_CLAIM"};
  const date=slotUtc.slice(0,10).replaceAll("-","");
  const salt=createHash("sha256").update(network+"|"+slotUtc).digest("hex").slice(0,20);
  const pathname="unboda-social/video-claims/"+date+"/"+network+"-"+salt+".json";
  const contents=JSON.stringify({brandId,network,slotUtc,sourceSha256,sourceTag,
    state:"PUBLISH_REQUEST_RESERVED_DO_NOT_BLINDLY_RETRY"});
  try{
   const receipt=await put(pathname,contents,{
     access:"public",contentType:"application/json",allowOverwrite:false,
     addRandomSuffix:false,token});
   if(receipt?.pathname!==pathname||typeof receipt?.url!=="string"||
     !receipt.url.startsWith("https://")||!receipt.url.endsWith(pathname))
    return {state:"UNTRUSTED_BLOB_CLAIM_RECEIPT"};
   return {state:"FIRST_ATOMIC_CLAIM_GRANTED",pathname};
  }catch{return {state:"PREVIOUS_OR_UNCERTAIN_ATOMIC_CLAIM_NO_RETRY"}}
 };
}
// A source hash belongs to one publishing slot globally, regardless of which
// two channels receive the same original within that slot.
function makeSourceClaim({put,token}={}){
 return async function reserveSource({brandId,slotUtc,sourceSha256,sourceTag}={}){
  if(typeof put!=="function"||typeof token!=="string"||token.length<20||
     brandId!==REPO_BRAND||!/^[a-f0-9]{64}$/.test(sourceSha256??"")||
     !/^unboda-saju-shorts-\d{8}$/.test(sourceTag??"")||
     !Number.isFinite(Date.parse(slotUtc))||
     !/^\d{4}-\d\d-\d\dT\d\d:00:00\.000Z$/.test(slotUtc??""))
    return {state:"INVALID_DURABLE_SOURCE_CLAIM"};
  const pathname="unboda-social/source-claims/"+sourceSha256+".json";
  try{
   const receipt=await put(pathname,JSON.stringify({brandId,slotUtc,
      sourceSha256,sourceTag,state:"ORIGINAL_RESERVED_FOR_ONE_SLOT_ONLY"}),{
     access:"public",contentType:"application/json",allowOverwrite:false,
     addRandomSuffix:false,token
   });
   if(receipt?.pathname!==pathname||typeof receipt?.url!=="string"||
      !receipt.url.startsWith("https://")||!receipt.url.endsWith(pathname))
     return {state:"UNTRUSTED_SOURCE_CLAIM_RECEIPT"};
   return {state:"FIRST_ORIGINAL_CLAIM_GRANTED",pathname};
  }catch{return {state:"ORIGINAL_USED_OR_CLAIM_UNCERTAIN_NO_RETRY"}}
 };
}
module.exports={makeVideoClaim,makeSourceClaim};
