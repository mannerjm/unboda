import test from 'node:test';
import assert from 'node:assert/strict';
import {finalizeReviewProof} from './finalize-review-proof.mjs';
const hash='a'.repeat(64);
const voice={formatVerified:true,narrationExists:true,published:false,
 commercialReleaseApproved:false,pronunciationHumanReviewed:false,
 originalityReleaseApproved:false,scenes:[1,2,3,4]};
const qa={state:'PASS_TECHNICAL_ONLY',technicalChecksPassed:true,
 publicationAllowed:false,permanentFinalAssetStored:false,
 commercialRightsApproved:false,koreanPronunciationReviewed:false,
 video:{sha256:hash},cover:{sha256:hash},narration:{sha256:hash}};
test('records final technical QA but keeps all commercial/publication flags false',()=>{
 const x=finalizeReviewProof({voice,qa});
 assert.equal(x.objectiveTechnicalQAReportPassed,true);
 assert.equal(x.technicalMediaHash,hash);
 assert.equal(x.commercialReleaseApproved,false);
 assert.equal(x.pronunciationHumanReviewed,false);
 assert.equal(x.publicationAllowed,false);
 assert.equal(x.finalMediaArchived,false);
});
test('never upgrades rejected or spoofed QA receipt',()=>{
 for(const data of [{...qa,state:'BLOCKED'},{...qa,publicationAllowed:true},
  {...qa,technicalChecksPassed:false},{...qa,permanentFinalAssetStored:true},
  {...qa,video:{sha256:'invalid'}},{...qa,koreanPronunciationReviewed:true}]){
  const x=finalizeReviewProof({voice,qa:data});
  assert.equal(x.state,'BLOCKED');
  assert.equal(x.publicationAllowed,false);
 }
});
test('voice source and all four scene proofs required',()=>{
 assert.equal(finalizeReviewProof({voice:{...voice,scenes:[1]},qa}).state,'BLOCKED');
 assert.equal(finalizeReviewProof({voice:{...voice,published:true},qa}).state,'BLOCKED');
});
