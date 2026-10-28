import test from "node:test";
import assert from "node:assert/strict";
import {planVoicedVideo,buildVoicedFfmpegArgs} from "./voice-preview.mjs";
const files={
 visualFile:"/tmp/visual.mp4",voiceFile:"/tmp/voice.mp3",
 outputFile:"/tmp/final.mp4",voiceDurationSeconds:24
};
test("unverified Korean speech can never be represented as a publishable video",()=>{
 const result=planVoicedVideo(files);
 assert.equal(result.state,"BLOCKED");
 assert.ok(result.reasons.includes("VOICE_COMMERCIAL_LICENSE_REQUIRED"));
 assert.ok(result.reasons.includes("PRONUNCIATION_LISTENING_QA_REQUIRED"));
 assert.equal(result.publicationAllowed,false);
});
test("approved review audio only permits render, not automated publication",()=>{
 const p=planVoicedVideo({...files,commercialRightsApproved:true,
  KoreanPronunciationReviewed:true,editorialScriptApproved:true});
 assert.equal(p.state,"RENDER_PLAN_READY");
 assert.equal(p.publicationAllowed,false);
});
test("too long synthetic or invalid voice fails closed",()=>{
 const p=planVoicedVideo({...files,voiceDurationSeconds:33,
  commercialRightsApproved:true,KoreanPronunciationReviewed:true,
  editorialScriptApproved:true});
 assert.equal(p.state,"BLOCKED");
 assert.ok(p.reasons.includes("KOREAN_VOICE_DURATION_OUT_OF_BOUNDS"));
});
test("mix plan retains original video stream and delays Korean speech until after cover",()=>{
 const args=buildVoicedFfmpegArgs(files);
 const g=args[args.indexOf("-filter_complex")+1];
 assert.match(g,/adelay=1200:all=1/);
 assert.match(g,/loudnorm/);
 assert.match(g,/amix/);
 assert.ok(args.includes("copy"));
 assert.ok(!args.some(x=>/https:\/\//.test(x)));
});
