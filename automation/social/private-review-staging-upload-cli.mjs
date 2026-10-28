// MANUAL staging-only, no-SNS archive of 4 original verified MP4 previews.
// Must be executed by authorized GitHub workflow_dispatch, never by PR or cron.
// Secrets are env-only; source artifacts must come from fixed GH Actions run.
import {fileURLToPath} from 'node:url';
import {readFourTechnicalReviewArtifacts} from './private-review-artifact-loader.mjs';
import {archiveVideoToPrivateReviewLedger} from './archive-private-media-and-receipt.mjs';
import {createSupabasePrivateReviewAdapter} from './supabase-private-adapter.mjs';
import {spawnSync} from 'node:child_process';
const BUCKET='unboda-social-private-review';
const PROJ='xdiitqyysmhicjcytckm';
const MAX=6000000;
function stop(reason){throw Error('STAGING_PRIVATE_ARCHIVE_BLOCKED:'+reason)}
export function checkPrivateArchiveEnv(env){
 if(env.UNBODA_PRIVATE_STAGING_APPROVAL!=='PRIVATE_STAGING_REVIEW_ONLY_MAX_6000000_BYTES')
  stop('EXPLICIT_OWNER_PRIVATE_STORAGE_APPROVAL_REQUIRED');
 const allowed=Number(env.UNBODA_PRIVATE_MAX_BYTES);
 if(!Number.isSafeInteger(allowed)||allowed<1024||allowed>MAX)
  stop('OWNER_BYTE_LIMIT_INVALID');
 let url,db;
 try{url=new URL(env.UNBODA_STAGING_SUPABASE_URL);db=new URL(env.UNBODA_STAGING_DATABASE_URL)}
 catch{stop('STAGING_URL_OR_DATABASE_SECRET_MISSING')}
 if(url.protocol!=='https:'||url.hostname!==PROJ+'.supabase.co'||
  url.pathname!=='/'||url.username||url.password||url.search||url.hash)
  stop('STAGING_STORAGE_PROJECT_URL_PIN_FAILED');
 if(!['postgres:','postgresql:'].includes(db.protocol)||
    !(db.hostname==='db.'+PROJ+'.supabase.co'||
      db.username==='postgres.'+PROJ))
  stop('STAGING_DB_PROJECT_PIN_FAILED');
 if(!/^(?:.\S{19,})$/.test(env.UNBODA_STAGING_SERVICE_ROLE_KEY??''))
  stop('STAGING_SERVICE_ROLE_SECRET_REQUIRED');
 return Object.freeze({storageOrigin:url.origin,
  databaseUrl:env.UNBODA_STAGING_DATABASE_URL,
  serviceKey:env.UNBODA_STAGING_SERVICE_ROLE_KEY,
  allowedBytes:allowed});
}
function privateStorageHttpClient(config,{fetcher=fetch}={}){
 const auth={
   'apikey':config.serviceKey,
   'Authorization':'Bearer '+config.serviceKey
 };
 async function req(path,init={}){
   const reply=await fetcher(config.storageOrigin+'/storage/v1/'+path,{
    ...init,headers:{...auth,...init.headers},
    signal:AbortSignal.timeout(30000),
    redirect:'error'
   });
   return reply;
 }
 return {storage:{
   getBucket:async(bucket)=>{
    const r=await req('bucket/'+encodeURIComponent(bucket));
    return r.ok?{data:await r.json(),error:null}:{data:null,error:{status:r.status}};
   },
   from:(bucket)=>({
    upload:async(path,bytes,options)=>{
     if(bucket!==BUCKET||!/^(?:qa\/)[0-9a-f]{64}\.mp4$/.test(path)||
        options?.upsert!==false)throw Error('NO_PRIVATE_WRITE');
     const r=await req('object/'+bucket+'/'+path,{
      method:'POST',headers:{'Content-Type':'video/mp4','x-upsert':'false',
       'Cache-Control':'no-store'},body:bytes
     });
     if(!r.ok)return {data:null,error:{status:r.status}};
     return {data:{path,fullPath:bucket+'/'+path},error:null};
    },
    download:async(path)=>{
     if(bucket!==BUCKET||!/^qa\/[0-9a-f]{64}\.mp4$/.test(path))
      throw Error('NO_PRIVATE_GET');
     const r=await req('object/authenticated/'+bucket+'/'+path,{method:'GET'});
     if(!r.ok)return {data:null,error:{status:r.status}};
     return {data:{arrayBuffer:()=>r.arrayBuffer()},error:null};
    }
   })
 }};
}
function recordVerifiedDbReceipt(config,{sha256,objectKey,bytes,actualReadbackSha256},
 {runner=spawnSync}={}){
 if(!/^[0-9a-f]{64}$/.test(sha256)||
    objectKey!=='qa/'+sha256+'.mp4'||
    actualReadbackSha256!==sha256||
    !Number.isSafeInteger(bytes)||bytes<1024||bytes>MAX)
  stop('INVALID_DB_RECEIPT_REQUEST');
 const sql='SELECT social_automation.record_private_video_readback('+
    "'"+sha256+"','"+objectKey+"',"+bytes+",'"+sha256+"');";
 const run=runner('psql',[
  '-X','-q','-t','-A','-v','ON_ERROR_STOP=1','-c',sql
 ],{encoding:'utf8',timeout:30000,
    env:{...process.env,PGDATABASE:config.databaseUrl,
     PGSSLMODE:'require',PGCONNECT_TIMEOUT:'10'}});
 if(run?.status!==0||!run?.stdout)stop('DATABASE_READBACK_RECEIPT_WRITE_FAILED');
 let data;try{data=JSON.parse(run.stdout.trim())}
 catch{stop('DATABASE_RECEIPT_NOT_JSON')}
 return data;
}
export async function archiveFourVerifiedVideos({
 sourceRoot,environment=process.env,fetcher=fetch,dbRunner=spawnSync
}={}){
 const config=checkPrivateArchiveEnv(environment);
 const source=readFourTechnicalReviewArtifacts(sourceRoot,{
  maxTotalBytes:config.allowedBytes
 });
 const client=privateStorageHttpClient(config,{fetcher});
 const storage=await createSupabasePrivateReviewAdapter({
  client,serviceRoleEnvVerified:true
 });
 if(!storage)stop('STAGING_PRIVATE_BUCKET_RIGHTS_OR_LIMIT_UNVERIFIED');
 const receipts=[];
 for(const item of source.items){
  const out=await archiveVideoToPrivateReviewLedger({
   bytes:item.bytes,qa:item.report,privateStorage:storage,
   persistReadbackReceipt:record=>recordVerifiedDbReceipt(config,record,{runner:dbRunner}),
   ownerApprovedPrivateStorage:true,authorizedMonthlyStorageBytes:config.allowedBytes
  });
  if(out.state!=='PRIVATE_MP4_VERIFIED_AND_RECORDED'){
   // The object might exist after a network or DB failure. Never retry blindly.
   return {state:'STOPPED_RECONCILE_BEFORE_NEXT_FILE',
    blockedSlot:item.slot,reason:out.reason??out.state,
    completedSlots:receipts.map(x=>x.slot),
    publicationAllowed:false,paidGenerationAllowed:false,
    doNotBlindlyRetry:true};
  }
  receipts.push({slot:item.slot,sha256:out.sha256,bytes:out.bytes,
   state:out.state});
 }
 return {state:'FOUR_PRIVATE_MP4S_HASH_VERIFIED_AND_JOURNALED',
  sourceRunId:40521381382,files:receipts,
  totalBytes:source.totalBytes,publicationAllowed:false,
  commercialRightsVerified:false,privateOnly:true,
  uploadedToSocialMedia:false,paidModelCalls:0};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 archiveFourVerifiedVideos({sourceRoot:process.argv[2]}).then(
  result=>{
   console.log(JSON.stringify(result));
   if(result.state!=='FOUR_PRIVATE_MP4S_HASH_VERIFIED_AND_JOURNALED')
    process.exitCode=1;
  },
  e=>{console.error(String(e?.message??e).split('\n')[0]);process.exitCode=1}
 );
}
