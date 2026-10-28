import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {readFourTechnicalReviewArtifacts} from './private-review-artifact-loader.mjs';
import {checkPrivateArchiveEnv,archiveFourVerifiedVideos} from './private-review-staging-upload-cli.mjs';
const NAMES=['midnight','commute','friendship','afterwork'];
const B='unboda-social-private-review';
const PROJECT='xdiitqyysmhicjcytckm';
const env={
 UNBODA_PRIVATE_STAGING_APPROVAL:'PRIVATE_STAGING_REVIEW_ONLY_MAX_6000000_BYTES',
 UNBODA_PRIVATE_MAX_BYTES:'6000000',
 UNBODA_STAGING_SUPABASE_URL:'https://'+PROJECT+'.supabase.co/',
 UNBODA_STAGING_DATABASE_URL:'postgresql://postgres.'+PROJECT+':not-a-real-test-password@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
 UNBODA_STAGING_SERVICE_ROLE_KEY:'TEST_MOCKED_ONLY_NO_REAL_SERVICE_ROLE_KEY_1234567890'
};
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'unboda-qa-'));
 const files=new Map();
 for(let i=0;i<4;i++){
  const dir=join(root,'unboda-four-daily-'+NAMES[i]+'-private-review-NO-PUBLISH');
  mkdirSync(dir);
  const data=Buffer.alloc(1800+i*31,i+1);
  data.write('ftyp',4,'ascii');
  const sha=createHash('sha256').update(data).digest('hex');
  const report={schemaVersion:1,state:'PASS_TECHNICAL_ONLY',technicalChecksPassed:true,
   publicationAllowed:false,commercialRightsApproved:false,
   koreanPronunciationReviewed:false,permanentFinalAssetStored:false,
   reasons:[],video:{sha256:sha,bytes:data.length},
   durationSeconds:30,fps:30,
   signals:{ok:true,maxVoiceGapSeconds:0,maxBlackSeconds:0,maxFreezeSeconds:0}};
  writeFileSync(join(dir,'LIFESTYLE_30S_KOREAN_PRIVATE_REVIEW.mp4'),data);
  writeFileSync(join(dir,'LIFESTYLE_TECHNICAL_QA.json'),JSON.stringify(report));
  files.set('qa/'+sha+'.mp4',data);
 }
 return {root,files,clean:()=>rmSync(root,{recursive:true,force:true})};
}
test('no approvals, wrong staging project or invalid budget prevents any storage',()=>{
 for(const mod of [
  {UNBODA_PRIVATE_STAGING_APPROVAL:''},
  {UNBODA_PRIVATE_MAX_BYTES:'9000000'},
  {UNBODA_STAGING_SUPABASE_URL:'https://unboda.kr/'},
  {UNBODA_STAGING_DATABASE_URL:'postgresql://postgres.other:pw@pooler.supabase.com/postgres'},
  {UNBODA_STAGING_SERVICE_ROLE_KEY:''}
 ]){
  assert.throws(()=>checkPrivateArchiveEnv({...env,...mod}),/STAGING_PRIVATE_ARCHIVE_BLOCKED/);
 }
 assert.equal(checkPrivateArchiveEnv(env).allowedBytes,6000000);
});
test('exact four source files and immutable technical SHA are necessary',()=>{
 const f=fixture();
 try{
  const v=readFourTechnicalReviewArtifacts(f.root);
  assert.equal(v.state,'FOUR_VERIFIED_SOURCE_FILES_ONLY');assert.equal(v.items.length,4);
  assert.ok(v.totalBytes<6000000);
  assert.deepEqual(v.items.map(x=>x.slot),NAMES);
  assert.throws(()=>readFourTechnicalReviewArtifacts(f.root,{sourceGithubRunId:12345}),/EXPECTED_VERIFIED_SOURCE_RUN/);
  const dir=join(f.root,'unboda-four-daily-midnight-private-review-NO-PUBLISH');
  writeFileSync(join(dir,'LIFESTYLE_30S_KOREAN_PRIVATE_REVIEW.mp4'),Buffer.from('FAKE_BAD_VIDEO'));
  assert.throws(()=>readFourTechnicalReviewArtifacts(f.root),/ARTIFACT_INTAKE_/);
 }finally{f.clean()}
});
test('four byte-for-byte checked mock uploads create exactly four DB receipts without publication',async()=>{
 const f=fixture();let uploads=0,downloads=0,dbWrites=0;
 try{
  const fetcher=async(url,options)=>{
   const parsed=new URL(url),path=parsed.pathname;
   assert.equal(parsed.hostname,PROJECT+'.supabase.co');
   assert.ok(options.headers.apikey.startsWith('TEST_MOCKED_ONLY'));
   if(path==='/storage/v1/bucket/'+B)return {ok:true,
    json:async()=>({id:B,public:false,file_size_limit:45000000,
      allowed_mime_types:['video/mp4']})};
   const key=path.slice(path.indexOf('/qa/')+1);
   if(options.method==='POST'){
    uploads++;assert.ok(f.files.has(key));assert.equal(options.headers['x-upsert'],'false');
    return {ok:true};
   }
   if(options.method==='GET'&&path.includes('/object/authenticated/')){
    downloads++;assert.ok(f.files.has(key));
    const data=f.files.get(key);
    return {ok:true,arrayBuffer:async()=>data};
   }
   throw Error('UNEXPECTED_REQUEST_'+path);
  };
  const dbRunner=(name,argv,opts)=>{
   dbWrites++;
   assert.equal(name,'psql');assert.ok(argv.includes('ON_ERROR_STOP=1'));
   assert.ok(opts.env.PGDATABASE.includes(PROJECT));
   const query=argv.at(-1);
   const sha=query.match(/'([a-f0-9]{64})'/)[1],bytes=Number(query.match(/',([0-9]+),'/)[1]);
   return {status:0,stdout:JSON.stringify({
    state:'PRIVATE_ARCHIVE_DB_RECORDED',sha256:sha,
    objectKey:'qa/'+sha+'.mp4',bytes,
    publicationAllowed:false,socialPostCreated:false,publicUrl:null
   })+'\n'};
  };
  const result=await archiveFourVerifiedVideos({
   sourceRoot:f.root,environment:env,fetcher,dbRunner
  });
  assert.equal(result.state,'FOUR_PRIVATE_MP4S_HASH_VERIFIED_AND_JOURNALED');
  assert.equal(result.privateOnly,true);assert.equal(result.publicationAllowed,false);
  assert.equal(result.uploadedToSocialMedia,false);
  assert.equal(uploads,4);assert.equal(downloads,4);assert.equal(dbWrites,4);
 }finally{f.clean()}
});
test('a failed storage request stops immediately, does not retry charged or uncertain writes',async()=>{
 const f=fixture();let calls=0;
 try{
  const result=await archiveFourVerifiedVideos({
   sourceRoot:f.root,environment:env,
   fetcher:async(url,opts)=>{
    if(url.includes('/bucket/'))return {ok:true,json:async()=>({
     id:B,public:false,file_size_limit:45000000,allowed_mime_types:['video/mp4']})};
    calls++;return {ok:false,status:403};
   },
   dbRunner:()=>{throw Error('DB MUST NOT RUN')}
  });
  assert.equal(result.state,'STOPPED_RECONCILE_BEFORE_NEXT_FILE');
  assert.equal(result.doNotBlindlyRetry,true);
  assert.equal(result.publicationAllowed,false);
  assert.equal(calls,1);
 }finally{f.clean()}
});
