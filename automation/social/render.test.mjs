import test from "node:test";
import assert from "node:assert/strict";
import {assessVideoProbe,buildVideoArgs,renderShortVideo} from "./render.mjs";
const scenes=Array.from({length:4},(_,i)=>({
 file:"/tmp/social-scene-"+i+".png",ownedOrLicensed:true,licenseProof:"original asset "+i
}));
test("refuse missing 4 scenes",()=>assert.throws(
 ()=>buildVideoArgs({scenes:scenes.slice(0,3),narrationPath:"voice.mp3",outputPath:"out.mp4"}),/FOUR_SCENE/
));
test("refuse scenes without license proof",()=>assert.throws(
 ()=>buildVideoArgs({scenes:[{...scenes[0],licenseProof:""},...scenes.slice(1)],
 narrationPath:"voice.mp3",outputPath:"out.mp4"}),/RIGHTS/
));
test("build FFmpeg invocation with transitions and audio",()=>{
 const args=buildVideoArgs({scenes,narrationPath:"voice.mp3",outputPath:"clip.mp4"});
 assert.equal(args.filter(x=>x==="ffmpeg").length,0);
 assert.ok(args.includes("libx264"));assert.ok(args.includes("aac"));
 assert.ok(args.find(s=>s.includes("xfade=transition=fade")));
 assert.equal(args[args.length-1],"clip.mp4");
});
test("check actual rendered stream and narration",()=>{
 const sample={streams:[{codec_type:"video",codec_name:"h264",width:1080,height:1920},
   {codec_type:"audio",codec_name:"aac"}],format:{duration:"30.000"}};
 assert.equal(assessVideoProbe(sample).ok,true);
 assert.ok(assessVideoProbe({...sample,streams:sample.streams.slice(0,1)})
   .problems.includes("NARRATION_AUDIO_NOT_FOUND"));
});
test("cannot render without narration rights",async()=>{
 await assert.rejects(renderShortVideo({scenes,narrationPath:"voice.mp3",
  narrationRights:null,outputPath:"out.mp4"}),/NARRATION_RIGHTS_REQUIRED/);
});
