import test from "node:test";
import assert from "node:assert/strict";
import {checkFixedVideoSlot,evaluateOriginalVideo} from "./video-release-gates.mjs";
test("four fixed KST local slots and next day midnight",()=>{
 assert.deepEqual([0,8,12,20].map(h=>checkFixedVideoSlot(h,0)),[true,true,true,true]);
 assert.equal(checkFixedVideoSlot(14,0),false);
 assert.equal(checkFixedVideoSlot(20,30),false);
});
test("current first-party 30-sec silent motion draft may NEVER auto publish",()=>{
 const r=evaluateOriginalVideo({
  slot:{hour:8,minute:0,timezone:"Asia/Seoul"},
  asset:{durationSeconds:30,width:1080,height:1920,fps:30,videoCodec:"h264",audioCodec:"aac",
   hasNaturalKoreanNarration:false,motionFootageVerified:true,onlyAnimatedStillFrames:false},
  remote:{ownOriginalDraftUploaded:false,draftHasVideo:true,realPublicationProof:false}
 });
 assert.equal(r.canActivateFourDailyPublications,false);
 assert.ok(r.blockers.includes("KOREAN_VOICE_UNVERIFIED"));
 assert.ok(r.blockers.includes("OWN_ORIGINAL_UPLOAD_TEST_NOT_PASSED"));
 assert.ok(r.blockers.includes("REAL_PUBLICATION_NOT_VERIFIED"));
});
test("existing 10-second archive draft isn't approved as a 30-second original",()=>{
 const r=evaluateOriginalVideo({asset:{durationSeconds:10,hasNaturalKoreanNarration:false},
  remote:{ownOriginalDraftUploaded:false,draftHasVideo:true}});
 assert.ok(r.blockers.includes("VIDEO_FORMAT_UNVERIFIED"));
 assert.ok(r.blockers.includes("OWN_ORIGINAL_UPLOAD_TEST_NOT_PASSED"));
});
test("simulated all-proof success is only a conditional preflight",()=>{
 const r=evaluateOriginalVideo({
  slot:{hour:20,minute:0,timezone:"Asia/Seoul"},
  asset:{durationSeconds:30,width:1080,height:1920,fps:30,videoCodec:"h264",audioCodec:"aac",
  hasNaturalKoreanNarration:true,narrationKoreanPronunciationChecked:true,motionFootageVerified:true,onlyAnimatedStillFrames:false,
  permanentPublicVideoUrl:"https://owned.example/a.mp4",expiringMediaUrl:false},
  rights:{allMotionCommercialUseApproved:true,narrationCommercialUseApproved:true,musicCommercialUseApproved:true},
  content:{editorialQAApproved:true,captionSafeZoneVerified:true,factualClaimsReviewed:true,notDuplicateLast90Days:true},
  remote:{ownOriginalDraftUploaded:true,draftHasVideo:true,realPublicationProof:true,publicUrlVerified:true},
  account:{monthlyBrandQuotaVerified:true,channelQuotasVerified:true,durableDbSlotLockVerified:true,previousQueueChecked:true,independentWorkerOnly:true},
  owner:{firstCommercialVideoQualityApproved:true,ongoingContentCostBudgetApproved:true}
 });
 assert.equal(r.canActivateFourDailyPublications,true);
 assert.equal(r.thumbnailOrDraftIsNotPublication,true);
});
