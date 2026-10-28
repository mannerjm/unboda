// Server-only bridge to a verified Supabase private Storage bucket.
// Never touches public URL generation or signs download links.
const BUCKET='unboda-social-private-review';
export async function createSupabasePrivateReviewAdapter({client,serviceRoleEnvVerified=false}={}){
 if(serviceRoleEnvVerified!==true||!client?.storage?.getBucket||!client?.storage?.from)
  return null;
 let info;
 try{info=await client.storage.getBucket(BUCKET)}catch{return null}
 const b=info?.data;
 if(info?.error||b?.id!==BUCKET||b?.public!==false||
    b?.file_size_limit!==45000000||
    !Array.isArray(b?.allowed_mime_types)||
    !b.allowed_mime_types.includes('video/mp4'))return null;
 const store=client.storage.from(BUCKET);
 if(typeof store?.upload!=='function'||typeof store?.download!=='function')return null;
 return Object.freeze({bucket:BUCKET,usesServerServiceRole:true,isPrivateBucket:true,
  async upload(path,bytes,opts){
   if(!/^qa\/[a-f0-9]{64}\.mp4$/.test(path)||
      opts?.upsert!==false||opts?.contentType!=='video/mp4')throw Error('INVALID_STORAGE_REQUEST');
   const response=await store.upload(path,bytes,{upsert:false,
     contentType:'video/mp4',cacheControl:'0'});
   if(response?.error)throw Error('SUPABASE_PRIVATE_UPLOAD_FAILED');
   if(response?.data?.path!==path||
      (response.data.fullPath&&response.data.fullPath!==BUCKET+'/'+path))
    throw Error('INVALID_STORAGE_UPLOADED_PATH');
   return {bucket:BUCKET,path};
  },
  async download(path){
   if(!/^qa\/[a-f0-9]{64}\.mp4$/.test(path))throw Error('INVALID_STORAGE_READ_PATH');
   const response=await store.download(path);
   if(response?.error||typeof response?.data?.arrayBuffer!=='function')
    throw Error('SUPABASE_PRIVATE_DOWNLOAD_FAILED');
   return new Uint8Array(await response.data.arrayBuffer());
  }
 });
}
