// Real MP4 + AAC test using synthetic media, never for commercial publication.
// Run with: node --test automation/social/render.integration.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {buildVideoArgs,assessVideoProbe} from "./render.mjs";
const run=promisify(execFile);
test("real FFmpeg creates 30s 1080x1920 narrated-media container", {timeout:180000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),"unboda-e2e-render-"));
 try{
  const scenes=[];
  const colors=["#0E1937","#172C44","#201C45","#152D31"];
  for(let i=0;i<4;i++){
   const file=join(dir,`scene${i}.png`);
   await run("ffmpeg",["-hide_banner","-loglevel","error","-f","lavfi",
    "-i",`color=c=${colors[i]}:s=1080x1920:r=30:d=1`,
    "-frames:v","1","-update","1","-y",file],{timeout:20000});
   scenes.push({file,ownedOrLicensed:true,licenseProof:"synthetic in-test color scene "+i});
  }
  const narrationPath=join(dir,"test-tone.m4a");
  await run("ffmpeg",["-hide_banner","-loglevel","error","-f","lavfi",
    "-i","sine=frequency=320:sample_rate=44100:duration=30",
    "-c:a","aac","-b:a","96k","-y",narrationPath],{timeout:20000});
  const outputPath=join(dir,"test-only.mp4");
  const args=buildVideoArgs({scenes,narrationPath,outputPath});
  const preset=args.indexOf("-preset");args[preset+1]="ultrafast";
  const quality=args.indexOf("-crf");args[quality+1]="28";
  args.splice(args.indexOf("-c:a"),0,"-threads","2");
  await run("ffmpeg",args,{timeout:120000,maxBuffer:1024*1024});
  const probe=await run("ffprobe",["-v","error","-show_entries",
   "format=duration:stream=codec_type,codec_name,width,height","-of","json",
   outputPath],{timeout:20000});
  const result=assessVideoProbe(JSON.parse(probe.stdout));
  assert.equal(result.ok,true);
  assert.ok(result.durationSeconds>=29&&result.durationSeconds<=31);
  console.info("ACTUAL_MP4_PASS",result.durationSeconds,"sec 1080x1920 AVC/AAC (synthetic only)");
 }finally{await rm(dir,{recursive:true,force:true});}
});
