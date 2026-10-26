// Guard: a test draft is evidence of file transfer, NOT permission to publish.
const EXPECTED=[0,8,12,20];
export function checkFixedVideoSlot(localHour,localMinute){
 return Number.isInteger(localHour)&&EXPECTED.includes(localHour)&&localMinute===0;
}
export function evaluateOriginalVideo({asset={},rights={},content={},remote={},owner={},slot={},account={}}={}){
 const problems=[];
 if(!checkFixedVideoSlot(slot.hour,slot.minute)||slot.timezone!=="Asia/Seoul")
  problems.push("INVALID_FIXED_KST_SLOT");
 if(asset.durationSeconds<15||asset.durationSeconds>45||
   asset.width!==1080||asset.height!==1920||asset.fps<23||
   asset.videoCodec!=="h264"||asset.audioCodec!=="aac")
  problems.push("VIDEO_FORMAT_UNVERIFIED");
 if(asset.hasNaturalKoreanNarration!==true||asset.narrationKoreanPronunciationChecked!==true)
  problems.push("KOREAN_VOICE_UNVERIFIED");
 if(asset.motionFootageVerified!==true||asset.onlyAnimatedStillFrames===true)
  problems.push("REAL_MOVING_SCENES_UNVERIFIED");
 if(rights.allMotionCommercialUseApproved!==true||rights.narrationCommercialUseApproved!==true||
    rights.musicCommercialUseApproved!==true)
  problems.push("COMMERCIAL_RIGHTS_UNVERIFIED");
 if(content.editorialQAApproved!==true||content.captionSafeZoneVerified!==true||
    content.factualClaimsReviewed!==true||content.notDuplicateLast90Days!==true)
  problems.push("CONTENT_QUALITY_OR_DUPLICATE_UNVERIFIED");
 if(!/^https:\/\/\S+\.mp4(?:\?[^\s]+)?$/i.test(asset.permanentPublicVideoUrl??"")||
   asset.expiringMediaUrl===true)
  problems.push("PERMANENT_MP4_URL_UNVERIFIED");
 if(remote.ownOriginalDraftUploaded!==true||remote.draftHasVideo!==true)
  problems.push("OWN_ORIGINAL_UPLOAD_TEST_NOT_PASSED");
 if(remote.realPublicationProof!==true||remote.publicUrlVerified!==true)
  problems.push("REAL_PUBLICATION_NOT_VERIFIED");
 if(account.monthlyBrandQuotaVerified!==true||account.channelQuotasVerified!==true||
   account.durableDbSlotLockVerified!==true||account.previousQueueChecked!==true||
   account.independentWorkerOnly!==true)
  problems.push("PUBLISHER_LOCK_QUOTAS_NOT_READY");
 if(owner.firstCommercialVideoQualityApproved!==true||owner.ongoingContentCostBudgetApproved!==true)
  problems.push("OWNER_QUALITY_AND_COST_APPROVAL_PENDING");
 return Object.freeze({canActivateFourDailyPublications:problems.length===0,
  blockers:problems,thumbnailOrDraftIsNotPublication:true});
}
