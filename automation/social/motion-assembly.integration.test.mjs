import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {motionAssemblyArgs} from "./motion-assembly.mjs";
import {assessVideoProbe} from "./render.mjs";
const run=promisify(execFile);
test("moving MP4 scenes and audio assemble into real 30-sec vertical output",
 {timeout:240000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),"unboda-motion-assembly-"));
 try{
  const clips=[];
  for(let i=0;i<4;i++){
   const file=join(dir,"motion"+i+".mp4");
   await run("ffmpeg",["-hide_banner","-loglevel","error",
    "-f","lavfi","-i",`testsrc2=size=360x640:rate=30:duration=8.2`,
    "-vf",`hue=h=${i*45}`,
    "-c:v","libx264","-preset","ultrafast","-crf","35",
    "-pix_fmt","yuv420p","-threads","2","-y",file],{timeout:25000});
   clips.push({file,ownedOrLicensed:true,licenseProof:"synthetic test clip "+i,
    editorialApproved:true,mediaProbeVerified:true});
  }
  const narrationPath=join(dir,"voice-test.m4a");
  await run("ffmpeg",["-hide_banner","-loglevel","error",
   "-f","lavfi","-i","sine=frequency=420:sample_rate=44100:duration=30",
   "-c:a","aac","-b:a","96k","-y",narrationPath],{timeout:20000});
  const outputPath=join(dir,"assembled-synthetic.mp4");
  const args=motionAssemblyArgs({clips,narrationPath,
   narrationProof:{ownedOrLicensed:true,licenseProof:"synthetic test tone"},
   outputPath});
  const preset=args.indexOf("-preset");args[preset+1]="ultrafast";
  const crf=args.indexOf("-crf");args[crf+1]="30";
  args.splice(args.indexOf("-c:a"),0,"-threads","2");
  await run("ffmpeg",args,{timeout:150000,maxBuffer:1024*1024});
  const probed=await run("ffprobe",["-v","error","-show_entries",
   "format=duration:stream=codec_type,codec_name,width,height","-of","json",outputPath]);
  const assessment=assessVideoProbe(JSON.parse(probed.stdout));
  assert.equal(assessment.ok,true);
  assert.ok(assessment.durationSeconds>=29&&assessment.durationSeconds<=31);
  console.info("ACTUAL_MOTION_PASS",assessment.durationSeconds,"sec 1080x1920 H264/AAC (synthetic footage)");
 }finally{await rm(dir,{recursive:true,force:true});}
});
