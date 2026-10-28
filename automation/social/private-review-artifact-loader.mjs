// Untrusted GitHub Actions artifact intake. No network, no publication.
// Fail closed unless EXACTLY four previously QA-passed files are present.
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join,resolve,sep} from 'node:path';
import {createHash} from 'node:crypto';
const SLOT_NAMES=Object.freeze(['midnight','commute','friendship','afterwork']);
const ROOT_NAME=s=>'unboda-four-daily-'+s+'-private-review-NO-PUBLISH';
const MP4='LIFESTYLE_30S_KOREAN_PRIVATE_REVIEW.mp4';
const QA='LIFESTYLE_TECHNICAL_QA.json';
const hash=buf=>createHash('sha256').update(buf).digest('hex');
const bad=(msg)=>{throw Error('ARTIFACT_INTAKE_'+msg)};
export function readFourTechnicalReviewArtifacts(root,{
 maxTotalBytes=6000000,sourceGithubRunId=40521381382
}={}){
 if(!Number.isSafeInteger(maxTotalBytes)||maxTotalBytes<1024||
   maxTotalBytes>6000000)bad('BYTE_CEILING_REQUIRED');
 if(sourceGithubRunId!==40521381382)bad('EXPECTED_VERIFIED_SOURCE_RUN_REQUIRED');
 const absolute=resolve(root||'.');
 let directories;
 try{directories=readdirSync(absolute,{withFileTypes:true})}catch{bad('ROOT_UNAVAILABLE')}
 if(directories.some(x=>x.isSymbolicLink()))bad('UNTRUSTED_SYMLINK');
 const names=directories.filter(x=>x.isDirectory()).map(x=>x.name);
 const expected=SLOT_NAMES.map(ROOT_NAME);
 if(names.length!==4||new Set(names).size!==4||
  expected.some(x=>!names.includes(x)))bad('EXACT_FOUR_UNIQUE_ARTIFACTS_REQUIRED');
 let sum=0;
 const items=[];
 for(const slot of SLOT_NAMES){
  const dir=join(absolute,ROOT_NAME(slot));
  let entries;try{entries=readdirSync(dir,{withFileTypes:true})}catch{bad('ARTIFACT_UNREADABLE')}
  if(entries.some(x=>x.isSymbolicLink()||!x.isFile()))bad('UNTRUSTED_ARCHIVE_ENTRY');
  if(!entries.some(x=>x.name===MP4)||!entries.some(x=>x.name===QA))
   bad('VIDEO_AND_SIGNED_TECHNICAL_QA_REQUIRED');
  let bytes,report;
  try{
   const file=join(dir,MP4);
   const metadata=statSync(file);
   if(!metadata.isFile()||metadata.size<1024||metadata.size>45000000)
     bad('INVALID_VIDEO_FILE_SIZE');
   bytes=readFileSync(file);
   report=JSON.parse(readFileSync(join(dir,QA),'utf8'));
  }catch{bad('VIDEO_OR_QA_CORRUPT')}
  if(bytes.length<12||bytes.toString('ascii',4,8)!=='ftyp')bad('MP4_HEADER_INVALID');
  const sha256=hash(bytes);
  if(report?.state!=='PASS_TECHNICAL_ONLY'||
   report?.technicalChecksPassed!==true||report?.publicationAllowed!==false||
   report?.commercialRightsApproved!==false||
   report?.koreanPronunciationReviewed!==false||
   report?.permanentFinalAssetStored!==false||
   !Array.isArray(report?.reasons)||report.reasons.length!==0||
   report?.video?.sha256!==sha256||report?.video?.bytes!==bytes.length||
   report?.durationSeconds!==30||report?.fps!==30||
   report?.signals?.ok!==true||report?.signals?.maxVoiceGapSeconds!==0||
   report?.signals?.maxBlackSeconds!==0||report?.signals?.maxFreezeSeconds!==0)
    bad('TECHNICAL_PROOF_OR_SHA256_NOT_VALID');
  sum+=bytes.length;
  if(sum>maxTotalBytes)bad('TOTAL_BYTE_CEILING_EXCEEDED');
  items.push(Object.freeze({slot,sha256,bytes,report,size:bytes.length,
   sourceGithubRunId,publishAllowed:false}));
 }
 if(new Set(items.map(x=>x.sha256)).size!==4)bad('DUPLICATED_MP4_BYTES');
 return Object.freeze({state:'FOUR_VERIFIED_SOURCE_FILES_ONLY',
  sourceGithubRunId,totalBytes:sum,items,published:false,
  commercialRightsVerified:false});
}
