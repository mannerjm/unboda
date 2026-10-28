// Assemble already-generated, independently licensed Korean audio into a 30s
// review-only video. Never calls a paid API, never posts, never declares publish-ready.
import {access,mkdir} from "node:fs/promises";
import {dirname} from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
const exec=promisify(execFile);
export function planVoicedVideo({visualFile,voiceFile,outputFile,
  voiceDurationSeconds,commercialRightsApproved=false,
  KoreanPronunciationReviewed=false,editorialScriptApproved=false}={}) {
 const reasons=[];
 if(typeof visualFile!=="string"||!visualFile.endsWith(".mp4"))
  reasons.push("VERIFIED_30S_VIDEO_REQUIRED");
 if(typeof voiceFile!=="string"||!/[.](wav|mp3|m4a)$/i.test(voiceFile))
  reasons.push("GENERATED_KOREAN_AUDIO_REQUIRED");
 if(typeof outputFile!=="string"||!outputFile.endsWith(".mp4"))
  reasons.push("OUTPUT_MP4_REQUIRED");
 if(!Number.isFinite(voiceDurationSeconds)||voiceDurationSeconds<20||
    voiceDurationSeconds>28.75)
  reasons.push("KOREAN_VOICE_DURATION_OUT_OF_BOUNDS");
 if(commercialRightsApproved!==true) reasons.push("VOICE_COMMERCIAL_LICENSE_REQUIRED");
 if(KoreanPronunciationReviewed!==true) reasons.push("PRONUNCIATION_LISTENING_QA_REQUIRED");
 if(editorialScriptApproved!==true) reasons.push("SCRIPT_EDITORIAL_REVIEW_REQUIRED");
 return {state:reasons.length?"BLOCKED":"RENDER_PLAN_READY",reasons,
  publicationAllowed:false};
}
export function buildVoicedFfmpegArgs({visualFile,voiceFile,outputFile}={}) {
 return ["-hide_banner","-loglevel","error","-y","-i",visualFile,
  "-i",voiceFile,"-filter_complex",
  "[0:a]volume=0.28[bed];" +
  "[1:a]aresample=48000,loudnorm=I=-17:TP=-1.5:LRA=11," +
  "adelay=1200:all=1,apad=pad_dur=4[narrator];" +
  "[bed][narrator]amix=inputs=2:duration=first:dropout_transition=0," +
  "alimiter=limit=0.92[audio]",
  "-map","0:v:0","-map","[audio]","-t","30",
  "-c:v","copy","-c:a","aac","-b:a","160k",
  "-movflags","+faststart",outputFile];
}
export async function assembleVoicedPreview(o={}) {
 for(const f of [o.visualFile,o.voiceFile]) await access(f);
 const p=await exec("ffprobe",["-v","error","-show_entries",
   "format=duration","-of","default=noprint_wrappers=1:nokey=1",o.voiceFile]);
 const seconds=Number(p.stdout.trim());
 const plan=planVoicedVideo({...o,voiceDurationSeconds:seconds});
 if(plan.state!=="RENDER_PLAN_READY")return plan;
 await mkdir(dirname(o.outputFile),{recursive:true});
 await exec("ffmpeg",buildVoicedFfmpegArgs(o),{timeout:180000,maxBuffer:1048576});
 const check=await exec("ffprobe",["-v","error","-show_entries",
   "format=duration:stream=codec_type,codec_name,width,height",
   "-of","json",o.outputFile]);
 const m=JSON.parse(check.stdout);
 if(!(Math.abs(Number(m.format.duration)-30)<.25&&
   m.streams.some(x=>x.codec_type==="audio"&&x.codec_name==="aac")&&
   m.streams.some(x=>x.codec_type==="video"&&x.width===1080&&x.height===1920)))
  throw Error("FINAL_VOICE_RENDER_FORMAT_FAILED");
 return {state:"VOICE_INSERTED_STILL_REQUIRES_RELEASE_QA",
  durationSeconds:Number(m.format.duration),outputFile:o.outputFile,
  publicationAllowed:false};
}
