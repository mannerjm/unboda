// FFmpeg short-form renderer. Requires four rights-verified 9:16 scene images
// AND a real licensed Korean narration audio asset from an approved provider.
// Rendering alone does NOT mean editorial quality is approved for publication.
import {access,mkdir} from "node:fs/promises";
import {dirname,extname} from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
const runExec=promisify(execFile);
const FRAMERATE=30;
const WIDTH=1080,HEIGHT=1920;
export function buildVideoArgs({scenes,narrationPath,outputPath}){
 if(!Array.isArray(scenes)||scenes.length!==4)throw Error("FOUR_SCENE_ASSETS_REQUIRED");
 if(!narrationPath||!outputPath)throw Error("NARRATION_AND_OUTPUT_REQUIRED");
 for(const s of scenes){
  if(!s?.file||![".png",".jpg",".jpeg",".webp"].includes(extname(s.file).toLowerCase()))
   throw Error("INVALID_SCENE_ASSET");
  if(s.ownedOrLicensed!==true||typeof s.licenseProof!=="string"||s.licenseProof.length<5)
   throw Error("SCENE_RIGHTS_REQUIRED");
 }
 const args=["-y","-hide_banner","-loglevel","error"];
 for(const s of scenes)args.push("-loop","1","-framerate",String(FRAMERATE),"-t","8","-i",s.file);
 args.push("-i",narrationPath);
 const filters=[];
 for(let i=0;i<4;i++){
  // Slight scene movement with premium-quality supplied assets.
  filters.push(`[${i}:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},zoompan=z='min(zoom+0.00008,1.03)':d=1:s=${WIDTH}x${HEIGHT}:fps=${FRAMERATE},setsar=1,fps=${FRAMERATE},settb=AVTB,format=yuv420p[v${i}]`);
 }
 filters.push("[v0][v1]xfade=transition=fade:duration=0.5:offset=7.5[x1]");
 filters.push("[x1][v2]xfade=transition=fade:duration=0.5:offset=15[x2]");
 filters.push("[x2][v3]xfade=transition=fade:duration=0.5:offset=22.5[vout]");
 args.push("-filter_complex",filters.join(";"),"-map","[vout]","-map","4:a:0",
  "-af","loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=2",
  "-t","30","-r",String(FRAMERATE),"-c:v","libx264","-preset","medium",
  "-crf","20","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k",
  "-movflags","+faststart",outputPath);
 return args;
}
export function assessVideoProbe(probe){
 const streams=probe?.streams??[],video=streams.find(s=>s.codec_type==="video");
 const audio=streams.find(s=>s.codec_type==="audio");
 const duration=Number(probe?.format?.duration);
 const problems=[];
 if(!video||video.codec_name!=="h264"||video.width!==WIDTH||video.height!==HEIGHT)
  problems.push("VIDEO_CODEC_OR_DIMENSIONS_INVALID");
 if(!audio||audio.codec_name!=="aac")problems.push("NARRATION_AUDIO_NOT_FOUND");
 if(!Number.isFinite(duration)||duration<15||duration>45)
  problems.push("VIDEO_DURATION_INVALID");
 return {ok:problems.length===0,problems,durationSeconds:duration};
}
export async function renderShortVideo({scenes,narrationPath,narrationRights,outputPath,
  exec=runExec}){
 if(narrationRights?.ownedOrLicensed!==true||
    typeof narrationRights.licenseProof!=="string"||
    narrationRights.licenseProof.length<5)
  throw Error("NARRATION_RIGHTS_REQUIRED");
 const args=buildVideoArgs({scenes,narrationPath,outputPath});
 for(const path of [...scenes.map(s=>s.file),narrationPath])await access(path);
 await mkdir(dirname(outputPath),{recursive:true});
 await exec("ffmpeg",args,{maxBuffer:1024*1024});
 const result=await exec("ffprobe",["-v","error","-show_entries",
  "format=duration:stream=codec_type,codec_name,width,height",
  "-of","json",outputPath],{maxBuffer:1024*1024});
 const verified=assessVideoProbe(JSON.parse(result.stdout));
 if(!verified.ok)throw Error("RENDERED_ASSET_INVALID:"+verified.problems.join(","));
 return {file:outputPath,...verified,rightsVerified:true,editorialApproved:false};
}
