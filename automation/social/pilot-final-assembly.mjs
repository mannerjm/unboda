// Final 30-sec UNBODA Short assembly: original full 10-sec Runway scene
// + 7s + 7s + 6s educational motion scenes. Overlap 0.5s fades and
// preserve first 10s with 0.5s cloned tail. This fixes earlier 4x8s
// assembly that silently trimmed the paid Runway source to eight seconds.
// Korean titles appear only in platform-safe, visually spaced upper zone.
// No paid generation, uploads, publication, or live-site changes.
import {writeFile,mkdir,access} from "node:fs/promises";
import {join,dirname} from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
const exec=promisify(execFile);
export const CUTS=Object.freeze([
 {length:10.5,title:"띠만 알면\n사주도 알 수 있을까?"},
 {length:7.5,title:"띠는 태어난 해의 상징"},
 {length:7.5,title:"사주는 네 기둥을 봐요"},
 {length:6.0,title:"전통 해석으로 가볍게"}
]);
const W=1080,H=1920,TRANS=0.5,FPS=30;
const SAFE_TOP=170,SAFE_BOTTOM=330;
export function validateKoreanTitles(titles){
 if(!Array.isArray(titles)||titles.length!==4)throw Error("FOUR_TITLES_REQUIRED");
 for(const title of titles){
  if(typeof title!=="string"||title.trim().length<5)
   throw Error("KOREAN_TITLE_REQUIRED");
  const lines=title.split("\n");
  if(lines.length>2||lines.some(line=>Array.from(line).length>18))
   throw Error("TITLE_OVERFLOWS_SAFE_AREA");
 }
 return true;
}
function cleanFilePath(p){
 if(typeof p!=="string"||!/^\/[A-Za-z0-9_./-]+$/.test(p))
  throw Error("UNSAFE_FILE_PATH");
 return p.replaceAll("\\","\\\\").replaceAll(":","\\:");
}
export function planFinalRender({clips,narrationFile,narrationProof,outputFile,
 titleFiles,fontFile,originalRights,frameSafeProof}={}){
 if(!Array.isArray(clips)||clips.length!==4||
    clips.some(x=>typeof x!=="string"||!x.endsWith(".mp4")))
  throw Error("FOUR_SCENE_MP4S_REQUIRED");
 if(!narrationFile?.endsWith(".mp3")&&!narrationFile?.endsWith(".m4a")&&!narrationFile?.endsWith(".wav"))
  throw Error("NARRATION_AUDIO_FILE_REQUIRED");
 if(!outputFile?.endsWith(".mp4"))throw Error("OUTPUT_MP4_REQUIRED");
 if(originalRights!==true)throw Error("MEDIA_SOURCE_RIGHTS_REQUIRED");
 if(narrationProof?.licensed!==true||narrationProof?.koreanSpeechApproved!==true)
  throw Error("KOREAN_VOICE_AND_RIGHTS_QA_REQUIRED");
 if(frameSafeProof!==true)throw Error("CAPTION_SAFE_ZONE_QA_REQUIRED");
 if(!Array.isArray(titleFiles)||titleFiles.length!==4)
  throw Error("TITLE_FILES_REQUIRED");
 const safeFont=cleanFilePath(fontFile);
 const args=["-hide_banner","-loglevel","error","-y"];
 for(const c of clips)args.push("-i",c);
 args.push("-i",narrationFile);
 const fg=[];
 for(let i=0;i<4;i++){
  const trim=i===0?10.5:CUTS[i].length;
  const source=i===0?"tpad=stop_mode=clone:stop_duration=0.5,":"";
  const title=cleanFilePath(titleFiles[i]);
  // Use upper safe zone, never near TikTok/Instagram lower controls.
  // The pilot's original artwork for scenes 2-4 already contains
  // its Korean headlines; overlaying them again causes visual ghosts.
  // Only the first actual Runway clip needs a separate title.
  const overlay=i===0?
   "drawbox=x=65:y=178:w=950:h=222:color=0x061424@0.63:t=fill,"+
   "drawtext=fontfile="+safeFont+":textfile="+title+
   ":fontsize=66:fontcolor=0xFFF8E8:line_spacing=19:"+
   "x=(w-text_w)/2:y=232:borderw=3:bordercolor=0x081020" : "null";
  fg.push("["+i+":v]scale="+W+":"+H+":force_original_aspect_ratio=increase,"+
   "crop="+W+":"+H+",fps="+FPS+","+source+
   "trim=duration="+trim+",settb=AVTB,setpts=PTS-STARTPTS,"+
   overlay+",format=yuv420p[v"+i+"]");
 }
 fg.push("[v0][v1]xfade=transition=fade:duration=0.5:offset=10.0[x1]");
 fg.push("[x1][v2]xfade=transition=fade:duration=0.5:offset=17.0[x2]");
 fg.push("[x2][v3]xfade=transition=fade:duration=0.5:offset=24.0[out]");
 args.push("-filter_complex",fg.join(";"),"-map","[out]","-map","4:a:0",
  "-t","30","-r","30","-c:v","libx264","-preset","medium","-crf","20",
  "-pix_fmt","yuv420p","-c:a","aac","-b:a","160k",
  "-af","loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=2",
  "-movflags","+faststart",outputFile);
 return {args,outputWidth:W,outputHeight:H,expectedSeconds:30,
  firstRunwaySecondsPreserved:10,
  titleSafeTopPx:SAFE_TOP,titleSafeBottomPx:SAFE_BOTTOM,
  readyForPublishing:false};
}
export async function renderFirstAutoVideo({clips,narrationFile,outputFile,fontFile,
 titles=CUTS.map(x=>x.title),narrationProof,originalRights=false,
 frameSafeProof=false,execCommand=exec}={}){
 validateKoreanTitles(titles);
 const dir=dirname(outputFile);
 await mkdir(dir,{recursive:true});
 const titleFiles=[];
 for(let i=0;i<titles.length;i++){
  const t=join(dir,"unboda-title-"+i+".txt");
  await writeFile(t,titles[i],"utf8");titleFiles.push(t);
 }
 const plan=planFinalRender({clips,narrationFile,outputFile,fontFile,
  titleFiles,narrationProof,originalRights,frameSafeProof});
 for(const f of [...clips,narrationFile,fontFile])await access(f);
 await execCommand("ffmpeg",plan.args,{timeout:300000,maxBuffer:1024*1024});
 const probe=await execCommand("ffprobe",[
  "-v","error","-show_entries","format=duration:stream=codec_type,codec_name,width,height",
  "-of","json",outputFile],{timeout:30000});
 const parsed=JSON.parse(probe.stdout);
 const dur=Number(parsed.format?.duration);
 const video=parsed.streams?.find(s=>s.codec_type==="video");
 const audio=parsed.streams?.find(s=>s.codec_type==="audio");
 if(!(dur>=29.7&&dur<=30.3&&video?.width===W&&video?.height===H&&
    video.codec_name==="h264"&&audio?.codec_name==="aac"))
  throw Error("FINAL_MP4_FFPROBE_FAILED");
 return {state:"RENDERED_MP4_NEEDS_SEPARATE_CONTENT_QA",outputFile,
  durationSeconds:dur,width:W,height:H,
  hasAACAudio:true,hasH264Video:true,automaticPublishingTriggered:false};
}
