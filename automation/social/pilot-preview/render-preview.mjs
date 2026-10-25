// SHA-verified paid 10-second Runway source -> 30-second premium Korean edit.
// Internal VISUAL REVIEW ONLY. No TTS, SNS API, billing, or publication.
import {writeFile,mkdir,stat} from "node:fs/promises";
import {createHash} from "node:crypto";
import {join} from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
const run=promisify(execFile);
const SOURCE="https://aq03voydas4sjjuy.public.blob.vercel-storage.com/unboda-social/pilots/runway-b7d64306-f5d4-48ef-9bd8-b7c9b0445b36-c96569dfa94b47a3.mp4";
const SHA="c96569dfa94b47a315b35f44b6a7c165f39fa28da49bf120ceba8fb5bc29f858";
const out=process.argv[2];
if(!out||!/^[A-Za-z0-9_./-]+$/.test(out))throw Error("SAFE_OUTPUT_FOLDER_REQUIRED");
await mkdir(out,{recursive:true});
const sourceFile=join(out,"actual-paid-runway-source.mp4");
const res=await fetch(SOURCE,{signal:AbortSignal.timeout(35000)});
if(!res.ok||res.headers.get("content-type")?.split(";")[0]!=="video/mp4")
 throw Error("PERSISTENT_RUNWAY_MP4_UNREACHABLE");
const buf=Buffer.from(await res.arrayBuffer());
if(buf.length!==1799655||createHash("sha256").update(buf).digest("hex")!==SHA)
 throw Error("REAL_SOURCE_SHA256_MISMATCH");
await writeFile(sourceFile,buf);
const sourceMeta=JSON.parse((await run("ffprobe",["-v","error","-show_entries",
 "format=duration:stream=codec_type,width,height","-of","json",sourceFile])).stdout);
if(!(Number(sourceMeta.format?.duration)>=9.7))throw Error("RUNWAY_REAL_10S_MISSING");
await run("python3",["automation/social/pilot-preview/premium-render.py",
 "--source",sourceFile,"--out",out],{timeout:720000,maxBuffer:4*1024*1024});
const video=join(out,"UNBODA_30s_PREMIUM_TYPOGRAPHY_NO_VOICE.mp4");
const probe=JSON.parse((await run("ffprobe",["-v","error","-show_entries",
 "format=duration:stream=codec_type,codec_name,width,height","-of","json",video])).stdout);
const duration=Number(probe.format?.duration);
if(!(duration>=29.7&&duration<=30.3&&
 probe.streams?.some(x=>x.codec_name==="h264"&&x.width===1080&&x.height===1920)&&
 probe.streams?.some(x=>x.codec_name==="aac")))
 throw Error("PREMIUM_DRAFT_FORMAT_QA_FAILED");
// A separate 9:16 cover plus the same image as the actual first 1.2 seconds.
// This preserves all 10 real Runway seconds, shortening only the final CTA
// by 1.2 seconds. Never assume the social platform used our cover until verified.
const cover=join(out,"UNBODA_REELS_SHORTS_COVER.jpg");
await run("python3",["automation/social/pilot-preview/thumbnail.py",
 "--source",sourceFile,"--out",cover],{timeout:30000,maxBuffer:1024*1024});
const coverFirst=join(out,"UNBODA_30s_COVER_FIRST_VISUAL_DRAFT_NO_VOICE.mp4");
const graph=[
 "[0:v]zoompan=z='min(zoom+0.00038,1.025)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,trim=duration=1.2,setpts=PTS-STARTPTS,format=yuv420p[c]",
 "[1:v]fps=30,trim=duration=28.8,setpts=PTS-STARTPTS,format=yuv420p[m]",
 "[c][m]concat=n=2:v=1:a=0[v]"
].join(";");
await run("ffmpeg",["-hide_banner","-loglevel","error","-y",
 "-loop","1","-framerate","30","-i",cover,"-i",video,
 "-filter_complex",graph,"-map","[v]","-map","1:a:0",
 "-t","30","-r","30","-c:v","libx264","-preset","ultrafast",
 "-crf","21","-pix_fmt","yuv420p","-c:a","aac","-b:a","128k",
 "-movflags","+faststart",coverFirst],{timeout:420000,maxBuffer:1024*1024});
const cp=JSON.parse((await run("ffprobe",["-v","error","-show_entries",
 "format=duration:stream=codec_type,codec_name,width,height",
 "-of","json",coverFirst],{timeout:30000})).stdout);
if(!(Number(cp.format?.duration)>=29.7&&Number(cp.format?.duration)<=30.3&&
 cp.streams?.some(s=>s.codec_name==="h264"&&s.width===1080&&s.height===1920)&&
 cp.streams?.some(s=>s.codec_name==="aac")))
 throw Error("COVER_FIRST_30SEC_QA_FAILED");
console.log("PREMIUM_NO_VOICE_DRAFT_ONLY_PASS",duration,(await stat(video)).size);
console.log("COVER_FIRST_THUMBNAIL_DRAFT_ONLY_PASS",(await stat(coverFirst)).size);
