import {createHash} from "node:crypto";
// Adapter around Vercel Blob SDK put(), passed from cloud worker after
// connecting a PUBLIC blob store and an explicitly approved storage budget.
// No owner file upload; Buffer consumes the resulting durable public URL.
// Docs: https://vercel.com/docs/vercel-blob/using-blob-sdk
export function createVercelPublicBlobWriter({
 put,
 ownerApprovedStorage=false,
 approvedStoragePathPrefix="unboda-social/pilots"
}={}){
 return async ({key,bytes,sha256,contentType}={})=>{
  if(!ownerApprovedStorage||typeof put!=="function")
   return {persisted:false,reason:"VERCEL_BLOB_STORAGE_NOT_APPROVED_OR_CONFIGURED"};
  if(typeof key!=="string"||!key.startsWith(approvedStoragePathPrefix+"/")||
     !/^[a-z0-9/_-]+\.mp4$/i.test(key)||
     !(bytes instanceof Uint8Array)||bytes.length<1000||
     typeof sha256!=="string"||!/^[0-9a-f]{64}$/.test(sha256)||
     contentType!=="video/mp4")
   return {persisted:false,reason:"INVALID_FILE_OR_STORAGE_PATH"};
  // Never trust a caller-supplied checksum: verify source bytes before any write.
  if(createHash("sha256").update(bytes).digest("hex")!==sha256)
   return {persisted:false,reason:"MEDIA_SHA256_MISMATCH"};
  // First-generation content hash gives each source an idempotent object path.
  // Never add random suffix or silently overwrite another source.
  try{
   const object=await put(key,Buffer.from(bytes),{
    access:"public",contentType:"video/mp4",
    addRandomSuffix:false,allowOverwrite:false
   });
   let valid=false;
   try{
    const url=new URL(object?.url);
    valid=url.protocol==="https:"&&
     /^[a-z0-9-]+\\.public\\.blob\\.vercel-storage\\.com$/i.test(url.hostname)&&
     !url.username&&!url.password&&!url.search&&!url.hash&&
     decodeURIComponent(url.pathname)==="/"+key&&
     object?.pathname===key;
   }catch{/* blob receipt must be independently validated */}
   if(!valid)return {persisted:false,reason:"BLOB_RECEIPT_UNVERIFIED_RECONCILE_BY_PATH"};
   return {persisted:true,url:object.url,pathname:key,sha256};
  }catch{
   return {persisted:false,reason:"BLOB_WRITE_UNKNOWN_RECONCILE_BY_PATH"};
  }
 };
}
