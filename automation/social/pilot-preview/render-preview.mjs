// Real paid Runway 10s footage + own original no-additional-charge art.
// THIS IS A NO-VOICE INTERNAL DRAFT. NEVER publish it to social channels.
// Runs unattended on an isolated GitHub Actions machine, not user's PC.
// The production final render must use validated commercial Korean speech.
import {readFile,writeFile,mkdir,access,stat} from "node:fs/promises";
import {createHash} from "node:crypto";
import {join} from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
const run=promisify(execFile);
const SOURCE="https://aq03voydas4sjjuy.public.blob.vercel-storage.com/unboda-social/pilots/runway-b7d64306-f5d4-48ef-9bd8-b7c9b0445b36-c96569dfa94b47a3.mp4";
const SHA="c96569dfa94b47a315b35f44b6a7c165f39fa28da49bf120ceba8fb5bc29f858";
const SCENES=[["zodiac.png",7.5],["pillars.png",7.5],["cta.png",6]];
const BASE="/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc";
const titles=[
 "띠만 알면\n사주도 알 수 있을까?",
 "띠는 태어난 해의 상징",
 "사주는 네 기둥을 봐요",
 "전통 해석으로 가볍게"
];
async function execF(args,timeout=90000){
 return run("ffmpeg",["-hide_banner","-loglevel","error","-y",...args],
 {timeout,maxBuffer:1024*1024});
}
const out=process.argv[2];
if(!out||!/^[A-Za-z0-9_./-]+$/.test(out))throw Error("SAFE_OUTPUT_FOLDER_REQUIRED");
await mkdir(out,{recursive:true});
const f=join(out,"actual-paid-runway-source.mp4");
const res=await fetch(SOURCE,{signal:AbortSignal.timeout(25000)});
if(!res.ok||res.headers.get("content-type")?.split(";")[0]!=="video/mp4")
 throw Error("PERSISTENT_RUNWAY_MP4_UNREACHABLE");
const buf=Buffer.from(await res.arrayBuffer());
if(buf.length!==1799655||createHash("sha256").update(buf).digest("hex")!==SHA)
 throw Error("REAL_SOURCE_SHA256_MISMATCH");
await writeFile(f,buf);
await access(BASE);
const sourceProbe=JSON.parse((await run("ffprobe",["-v","error","-show_entries",
 "format=duration:stream=codec_type,width,height","-of","json",f])).stdout);
if(!(Number(sourceProbe.format?.duration)>=9.7))
 throw Error("REAL_RUNWAY_10S_MISSING");
console.log("ORIGINAL_RUNWAY_SOURCE_VERIFIED_SHA256",SHA.slice(0,16));

const clips=[f];
for(let i=0;i<3;i++){
 const [name,duration]=SCENES[i];
 const card=join(out,name);
 await access(card);
 const target=join(out,"original-motion-"+i+".mp4");
 await execF(["-loop","1","-framerate","30","-i",card,
  "-vf","scale=756:1344,zoompan=z='min(zoom+0.00025,1.045)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=720x1280:fps=30,format=yuv420p",
  "-t",String(duration),"-r","30","-c:v","libx264","-preset","ultrafast",
  "-crf","27","-threads","2",target],140000);
 clips.push(target);
}
const titleFiles=[];
for(let i=0;i<4;i++){
 const path=join(out,"title-"+i+".txt");
 await writeFile(path,titles[i],"utf8");titleFiles.push(path);
}
const fgraph=[];
const durations=[10.5,7.5,7.5,6];
for(let i=0;i<4;i++){
 const pad=i===0?"tpad=stop_mode=clone:stop_duration=0.5,":"";
 fgraph.push("["+i+":v]scale=1080:1920:force_original_aspect_ratio=increase,"+
   "crop=1080:1920,fps=30,"+pad+"trim=duration="+durations[i]+","+
   "settb=AVTB,setpts=PTS-STARTPTS,"+
   "drawbox=x=65:y=178:w=950:h=222:color=0x061424@0.69:t=fill,"+
   "drawtext=fontfile="+BASE+":textfile="+titleFiles[i]+":fontsize=66:"+
   "fontcolor=0xFFF8E8:line_spacing=19:x=(w-text_w)/2:y=232:"+
   "borderw=3:bordercolor=0x081020,"+
   "drawtext=fontfile="+BASE+":text='제작 검증용 · 한국어 음성 미포함':"+
   "fontsize=28:fontcolor=0xDDBD7D:x=(w-text_w)/2:y=1480,"+
   "format=yuv420p[v"+i+"]");
}
fgraph.push("[v0][v1]xfade=transition=fade:duration=0.5:offset=10.0[x1]");
fgraph.push("[x1][v2]xfade=transition=fade:duration=0.5:offset=17.0[x2]");
fgraph.push("[x2][v3]xfade=transition=fade:duration=0.5:offset=24.0[video]");
const video=join(out,"UNBODA_30s_VISUAL_DRAFT_NO_KOREAN_AUDIO.mp4");
const inputs=clips.flatMap(c=>["-i",c]);
await execF([...inputs,"-f","lavfi","-i","anullsrc=r=48000:cl=stereo",
 "-filter_complex",fgraph.join(";"),
 "-map","[video]","-map","4:a:0","-t","30","-r","30",
 "-c:v","libx264","-preset","ultrafast","-crf","28","-threads","2",
 "-pix_fmt","yuv420p","-c:a","aac","-b:a","96k","-movflags","+faststart",
 video],350000);
const meta=JSON.parse((await run("ffprobe",["-v","error","-show_entries",
 "format=duration:stream=codec_type,codec_name,width,height",
 "-of","json",video])).stdout);
const dur=Number(meta.format?.duration);
const v=meta.streams?.find(x=>x.codec_type==="video");
const a=meta.streams?.find(x=>x.codec_type==="audio");
if(!(dur>=29.7&&dur<=30.3&&v?.width===1080&&v?.height===1920&&
 v.codec_name==="h264"&&a?.codec_name==="aac"))
 throw Error("NO_VOICE_VISUAL_DRAFT_MP4_INVALID");
await run("ffmpeg",["-v","error","-i",video,"-f","null","-"],{timeout:120000});
await writeFile(join(out,"VERIFY.txt"),[
 "UNBODA internal motion+layout preview only",
 "NO Korean narration; NEVER publish on any SNS.",
 "Real Runway paid ten-second original verified by SHA-256.",
 "Original script-generated zodiac / four-pillars / CTA moving cards.",
 "Duration "+dur+" seconds; 1080x1920 H264/AAC-silence",
 "This is NOT the user-approved final educational video."
].join("\n")+"\n");
console.log("PREVIEW_30S_REAL_RUNWAY_NO_VOICE_PASS",dur,(await stat(video)).size);
