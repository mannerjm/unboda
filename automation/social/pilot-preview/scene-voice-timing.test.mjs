import test from "node:test";
import assert from "node:assert/strict";
import {SCENE_SLOTS,planTimedSceneVoices,sceneVoiceFfmpegArgs} from "./scene-voice-timing.mjs";
const voices=SCENE_SLOTS.map((slot,i)=>({file:"/tmp/scene"+i+".mp3",
 durationSeconds:slot.end-slot.start-.5}));
const options={visualFile:"/tmp/visual.mp4",outputFile:"/tmp/with-voice.mp4",
 voices,rightsApproved:true,pronunciationApproved:true,scriptApproved:true};
test("missing scene speech or duration overrun blocks publishing",()=>{
 const blocked=planTimedSceneVoices({...options,voices:voices.slice(0,3)});
 assert.equal(blocked.state,"BLOCKED");
 assert.ok(blocked.reasons.includes("FOUR_KOREAN_VOICE_SCENES_REQUIRED"));
 const tooLong=planTimedSceneVoices({...options,voices:voices.map((x,i)=>
   i===2?{...x,durationSeconds:18}:x)});
 assert.ok(tooLong.reasons.includes("VOICE_SEGMENT_2_OVERRUN_OR_INVALID"));
});
test("missing rights or Korean pronunciation QA blocks",()=>{
 const r=planTimedSceneVoices({...options,rightsApproved:false,pronunciationApproved:false});
 assert.equal(r.state,"BLOCKED");
 assert.ok(r.reasons.includes("VOICE_LICENSE_REQUIRED"));
 assert.ok(r.reasons.includes("VOICE_PRONUNCIATION_LISTENING_QA_REQUIRED"));
});
test("valid timings only authorize draft mix, never publication",()=>{
 const r=planTimedSceneVoices(options);
 assert.equal(r.state,"MIX_PLAN_READY");
 assert.equal(r.publicationAllowed,false);
 const args=sceneVoiceFfmpegArgs(options),f=args[args.indexOf("-filter_complex")+1];
 assert.match(f,/adelay=1200:all=1/);
 assert.match(f,/adelay=10150:all=1/);
 assert.match(f,/adelay=17200:all=1/);
 assert.match(f,/adelay=24200:all=1/);
 assert.ok(!args.some(v=>String(v).includes("api.runway")));
});
