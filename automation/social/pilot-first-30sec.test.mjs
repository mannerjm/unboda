import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const storyboard=JSON.parse(await readFile(new URL("./pilot-first-30sec.storyboard.json",import.meta.url),"utf8"));
const config=JSON.parse(await readFile(new URL("./video-automation.config.json",import.meta.url),"utf8"));
test("30 second educational storyboard reuses ONLY paid and verified Runway 10 second source",()=>{
 assert.equal(storyboard.sourceRunwayTaskId,"b7d64306-f5d4-48ef-9bd8-b7c9b0445b36");
 assert.equal(storyboard.sourceMedia.mime,"video/mp4");
 assert.equal(storyboard.sourceMedia.verifiedByHead,true);
 assert.equal(storyboard.sourceMedia.persistedInPerpetualStorage,true);
 assert.equal(storyboard.sourceMedia.archiveVerifiedTwice,true);
 assert.match(storyboard.sourceMedia.durableMediaUrl,/^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\/.*\.mp4$/);
 assert.equal(storyboard.sourceMedia.sha256.length,64);
 assert.equal(storyboard.scenes.length,4);
 assert.equal(storyboard.scenes[0].durationSeconds,10);
 assert.equal(storyboard.scenes.reduce((n,s)=>n+s.durationSeconds,0),30);
 let next=0;
 for(const scene of storyboard.scenes){
  assert.equal(scene.startSecond,next);
  assert.ok(scene.voice.length>=15);
  assert.ok(scene.title.length>0);
  next+=scene.durationSeconds;
 }
 assert.ok(storyboard.scenes.slice(1).every(s=>s.media.startsWith("custom-original-")));
});
test("editorial text safe zones and CTA on last scene only",()=>{
 assert.equal(storyboard.output.width,1080);
 assert.equal(storyboard.output.height,1920);
 assert.equal(storyboard.output.totalSeconds,30);
 assert.ok(storyboard.scenePolicy.bottomSafePaddingPx>=250);
 assert.equal(storyboard.scenePolicy.textMaxLines,2);
 assert.ok(storyboard.scenes.slice(0,3).every(s=>s.body===null));
 assert.match(storyboard.scenes[3].body,/unboda\.kr/);
});
test("planned Korean narration does not imply voice generation or licensing was approved",()=>{
 const n=storyboard.narration;
 assert.equal(n.language,"ko-KR");
 assert.equal(n.ttsIsNotGenerated,true);
 assert.equal(n.extraPaidVoiceCallsAuthorized,false);
 assert.equal(n.additionalCreditsApproved,0);
 assert.equal(storyboard.release.koreanVoiceAndCommercialRightsVerified,false);
 const length=storyboard.scenes.reduce((sum,x)=>sum+x.voice.length,0);
 assert.ok(length>=100&&length<=180);
});
test("full Buffer autopilot still disabled and unchanged Metricool 3-hour queue is preserved",()=>{
 assert.equal(config.video.distribution.service,"buffer");
 assert.deepEqual(config.video.distribution.supported,["instagram","tiktok","youtube"]);
 assert.equal(config.video.targetCadenceHours,6);
 assert.equal(config.existingTextImage.doNotModify,true);
 assert.equal(config.controls.schedulerEnabled,false);
 assert.equal(config.controls.livePublishingEnabled,false);
 assert.equal(config.controls.paidGenerationEnabled,false);
 assert.equal(storyboard.release.bufferPostCreated,false);
 assert.equal(storyboard.release.liveAutoPostingAllowed,false);
});
test("archived premium source is permanent but finished 30s media is not yet ready for Buffer",()=>{
 assert.equal(storyboard.sourceMedia.runwaySignedUrlEphemeral,true);
 assert.equal(storyboard.release.permanentMediaUrlAvailable,false);
 assert.equal(storyboard.release.actual30sVideoRendered,false);
});
