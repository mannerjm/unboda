// Premium-motion assembly (actual mp4 clips, not still-slide repeats).
// Input assets MUST be created/owned/licensed and externally editorial-reviewed.
// A Runway task URL alone is not a downloaded or validated asset.
import {access,mkdir} from "node:fs/promises";
import {dirname,extname} from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {assessVideoProbe} from "./render.mjs";
const run=promisify(execFile);
const W=1080,H=1920,FPS=30,SEG=8,TRANS=0.5;
const VIDEO_COUNT=4;
export function motionAssemblyArgs({clips,narrationPath,narrationProof,outputPath}={}){
 if(!Array.isArray(clips)||clips.length!==VIDEO_COUNT)
  throw Error("FOUR_ORIGINAL_VIDEO_CLIPS_REQUIRED");
 if(typeof narrationPath!=="string"||!narrationPath||!outputPath)
  throw Error("NARRATION_AND_OUTPUT_REQUIRED");
 if(narrationProof?.ownedOrLicensed!==true||
  typeof narrationProof.licenseProof!=="string"||narrationProof.licenseProof.length<5)
  throw Error("NARRATION_PROVENANCE_REQUIRED");
 for(const c of clips){
  if(!c||typeof c.file!=="string"||extname(c.file).toLowerCase()!==".mp4")
   throw Error("MP4_SCENE_REQUIRED");
  if(c.ownedOrLicensed!==true||typeof c.licenseProof!=="string"||
   c.licenseProof.length<5||!c.editorialApproved||!c.mediaProbeVerified)
   throw Error("CLIP_RIGHTS_OR_MEDIA_QA_MISSING");
 }
 const args=["-y","-hide_banner","-loglevel","error"];
 for(const c of clips)args.push("-i",c.file);
 args.push("-i",narrationPath);
 const filter=[];
 for(let i=0;i<VIDEO_COUNT;i++){
  filter.push(`[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},settb=AVTB,format=yuv420p,trim=duration=${SEG},setpts=PTS-STARTPTS[v${i}]`);
 }
 filter.push(`[v0][v1]xfade=transition=fade:duration=${TRANS}:offset=7.5[x1]`);
 filter.push(`[x1][v2]xfade=transition=fade:duration=${TRANS}:offset=15[x2]`);
 filter.push(`[x2][v3]xfade=transition=fade:duration=${TRANS}:offset=22.5[vout]`);
 args.push("-filter_complex",filter.join(";"),"-map","[vout]","-map","4:a:0",
  "-af","loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=2",
  "-t","30","-r",String(FPS),"-c:v","libx264","-preset","medium",
  "-crf","19","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k",
  "-movflags","+faststart",outputPath);
 return args;
}
export async function assembleMotionVideo({clips,narrationPath,narrationProof,outputPath,
 exec=run}={}){
 const args=motionAssemblyArgs({clips,narrationPath,narrationProof,outputPath});
 for(const p of [...clips.map(c=>c.file),narrationPath])await access(p);
 await mkdir(dirname(outputPath),{recursive:true});
 await exec("ffmpeg",args,{timeout:240000,maxBuffer:1024*1024});
 const data=await exec("ffprobe",["-v","error","-show_entries",
  "format=duration:stream=codec_type,codec_name,width,height","-of","json",
  outputPath],{timeout:20000});
 const quality=assessVideoProbe(JSON.parse(data.stdout));
 if(!quality.ok)throw Error("ASSEMBLED_VIDEO_INVALID:"+quality.problems.join(","));
 return {state:"RENDERED_NEEDS_FINAL_HUMAN_QA",outputPath,
  ...quality,editorialApproved:false,publicMediaUrl:null};
}
