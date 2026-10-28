import test from "node:test";
import assert from "node:assert/strict";
import {motionAssemblyArgs,verifyMotionInputProbe,verifyVoiceInputProbe} from "./motion-assembly.mjs";
const clips=Array.from({length:4},(_,i)=>({file:"/tmp/motion"+i+".mp4",
 ownedOrLicensed:true,licenseProof:"owned motion asset "+i,editorialApproved:true,
 mediaProbeVerified:true}));
const config={clips,narrationPath:"/tmp/korean-voice.mp3",
 narrationProof:{ownedOrLicensed:true,licenseProof:"official provider audio rights"},
 outputPath:"/tmp/final.mp4"};
test("motion assembly needs four genuine MP4 assets",()=>{
 assert.throws(()=>motionAssemblyArgs({...config,clips:clips.slice(0,2)}),/FOUR_ORIGINAL_VIDEO/);
 assert.throws(()=>motionAssemblyArgs({...config,clips:[{...clips[0],file:"/tmp/a.png"},...clips.slice(1)]}),/MP4_SCENE_REQUIRED/);
});
test("do not assemble without commercial rights, media and editorial review",()=>{
 assert.throws(()=>motionAssemblyArgs({...config,
  clips:[{...clips[0],mediaProbeVerified:false},...clips.slice(1)]}),/CLIP_RIGHTS_OR_MEDIA_QA/);
 assert.throws(()=>motionAssemblyArgs({...config,
  clips:[{...clips[0],editorialApproved:false},...clips.slice(1)]}),/CLIP_RIGHTS_OR_MEDIA_QA/);
 assert.throws(()=>motionAssemblyArgs({...config,
  narrationProof:{ownedOrLicensed:false,licenseProof:"nothing"}}),/NARRATION_PROVENANCE/);
});
test("H264/AAC 30-second xfade with actual motion clips and voice",()=>{
 const args=motionAssemblyArgs(config);
 assert.equal(args.filter(x=>x==="-i").length,5);
 assert.ok(args.includes("libx264"));
 assert.ok(args.includes("aac"));
 assert.ok(args.includes("+faststart"));
 assert.ok(args.some(x=>x.includes("xfade=transition=fade")));
 assert.equal(args.at(-1),"/tmp/final.mp4");
});

test("motion input requires vertical 8+ second file",()=>{
 const good={streams:[{codec_type:"video",width:720,height:1280}],format:{duration:"10"}};
 assert.equal(verifyMotionInputProbe(good).ok,true);
 assert.ok(verifyMotionInputProbe({...good,format:{duration:"5"}})
  .reasons.includes("SOURCE_VIDEO_TOO_SHORT"));
 assert.ok(verifyMotionInputProbe({streams:[{codec_type:"video",width:1920,height:1080}],
  format:{duration:"10"}}).reasons.includes("SOURCE_NOT_VERTICAL_VIDEO"));
});
test("Korean narration must fit 30s short format",()=>{
 const good={streams:[{codec_type:"audio",codec_name:"mp3"}],format:{duration:"28"}};
 assert.equal(verifyVoiceInputProbe(good).ok,true);
 assert.ok(verifyVoiceInputProbe({...good,format:{duration:"65"}})
  .reasons.includes("VOICE_DURATION_NOT_ALIGNED"));
 assert.ok(verifyVoiceInputProbe({streams:[],format:{duration:"27"}})
  .reasons.includes("VOICE_AUDIO_STREAM_MISSING"));
});
