// Bind independent media QA evidence to the pilot narration receipt.
// This confirms technical media only and NEVER upgrades rights, pronunciation,
// original-footage suitability, permanent storage or SNS publication status.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const HASH=/^[0-9a-f]{64}$/;
export function finalizeReviewProof({voice,qa}={}){
 const invalid=reason=>({state:'BLOCKED',reason,publicationAllowed:false});
 if(voice?.formatVerified!==true||voice?.narrationExists!==true||
   voice?.published!==false||!Array.isArray(voice?.scenes)||voice.scenes.length!==4)
  return invalid('VOICE_RECEIPT_INVALID');
 if(qa?.state!=='PASS_TECHNICAL_ONLY'||qa?.technicalChecksPassed!==true||
   qa?.publicationAllowed!==false||qa?.permanentFinalAssetStored!==false||
   qa?.commercialRightsApproved!==false||qa?.koreanPronunciationReviewed!==false||
   !HASH.test(qa?.video?.sha256??'')||
   !HASH.test(qa?.cover?.sha256??'')||
   !HASH.test(qa?.narration?.sha256??''))
  return invalid('INDEPENDENT_TECHNICAL_QA_PROOF_REQUIRED');
 return Object.freeze({...voice,
   objectiveTechnicalQAReportPassed:true,
   technicalMediaHash:qa.video.sha256,
   coverHash:qa.cover.sha256,
   narrationHash:qa.narration.sha256,
   technicalReviewOnly:true,
   published:false,
   commercialReleaseApproved:false,
   pronunciationHumanReviewed:false,
   originalityReleaseApproved:false,
   fullMediaReviewPending:true,
   finalMediaArchived:false,
   publicationAllowed:false});
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const [voicePath,qaPath]=process.argv.slice(2);
 if(!voicePath||!qaPath)throw Error('VOICE_AND_TECH_QA_JSON_REQUIRED');
 const result=finalizeReviewProof({
  voice:JSON.parse(await readFile(voicePath,'utf8')),
  qa:JSON.parse(await readFile(qaPath,'utf8'))
 });
 if(result.state==='BLOCKED')throw Error('TECH_QA_ATTESTATION_BLOCKED:'+result.reason);
 await writeFile(voicePath,JSON.stringify(result,null,2)+'\n','utf8');
 console.log('OFFLINE_30S_TECH_QA_RECORDED_NO_PUBLICATION',result.technicalMediaHash.slice(0,16));
}
