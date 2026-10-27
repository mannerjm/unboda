// Objective offline technical QA for the first narrated UNBODA video.
// This checks media streams, decoding, voice levels/gaps and opening cover match.
// It never approves commercial rights, Korean pronunciation, editorial content or publication.
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat,mkdir,writeFile} from 'node:fs/promises';
import {dirname,extname,isAbsolute,resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
const exec=promisify(execFile),MAX_BYTES=160*1024*1024;
const fail=(reasons,extra={})=>({state:'BLOCKED',reasons:[...new Set(reasons)],publicationAllowed:false,...extra});
function checkPath(v,extensions){
 if(typeof v!=='string'||!isAbsolute(v)||!/[\/][^\/]+$/.test(v)||
    !extensions.includes(extname(v).toLowerCase()))
  throw Error('LOCAL_FILE_PATH_REQUIRED');
 return resolve(v);
}
async function checksum(p){
 const st=await lstat(p);
 if(!st.isFile()||st.isSymbolicLink()||st.size<100||st.size>MAX_BYTES)
  throw Error('FILE_NOT_SAFE');
 const h=createHash('sha256');
 for await(const bytes of createReadStream(p))h.update(bytes);
 return {sha256:h.digest('hex'),bytes:st.size};
}
const parseProbe=raw=>{
 try{const d=JSON.parse(raw);return d&&Array.isArray(d.streams)&&d.format?d:null}
 catch{return null}
};
export function assessProbes({video,cover,narration}={}){
 const reasons=[],seconds=Number(video?.format?.duration);
 const vs=video?.streams?.find(x=>x.codec_type==='video');
 const va=video?.streams?.find(x=>x.codec_type==='audio');
 const cs=cover?.streams?.find(x=>x.codec_type==='video');
 const ns=narration?.streams?.find(x=>x.codec_type==='audio');
 const [num,den]=String(vs?.avg_frame_rate||'').split('/').map(Number);
 const fps=den>0?num/den:NaN;
 if(!(seconds>=29.7&&seconds<=30.3))reasons.push('VIDEO_NOT_30_SECONDS');
 if(!(vs?.codec_name==='h264'&&vs.width===1080&&vs.height===1920&&fps>=29.5&&fps<=30.5))
  reasons.push('VIDEO_ORIENTATION_CODEC_OR_FPS_INVALID');
 if(va?.codec_name!=='aac')reasons.push('VIDEO_AUDIO_NOT_AAC');
 if(!(cs?.width===1080&&cs?.height===1920))reasons.push('THUMBNAIL_NOT_1080X1920');
 if(!(ns?.codec_name==='pcm_s16le'&&Number(narration?.format?.duration)>=29.7&&
  Number(narration?.format?.duration)<=30.3))reasons.push('NARRATION_STEM_NOT_30S_PCM');
 return {ok:reasons.length===0,reasons,durationSeconds:seconds,fps};
}
export function assessSignals({videoLog='',voiceLog='',coverLog='',videoDurationSeconds=30}={}){
 const reasons=[];
 const grab=(text,re)=>[...text.matchAll(re)].map(x=>Number(x[1]));
 const black=grab(videoLog,/black_duration:([0-9.]+)/g);
 const frozen=grab(videoLog,/freeze_duration:([0-9.]+)/g);
 const silent=grab(voiceLog,/silence_duration:\s*([0-9.]+)/g);
 const trailingBlack=grab(videoLog,/black_start:\s*([0-9.]+)/g);
 const trailingFreeze=grab(videoLog,/freeze_start:\s*([0-9.]+)/g);
 const trailingSilence=grab(voiceLog,/silence_start:\s*([0-9.]+)/g);
 const mean=Number(/mean_volume:\s*([-0-9.]+)\s*dB/.exec(voiceLog)?.[1]);
 const peak=Number(/max_volume:\s*([-0-9.]+)\s*dB/.exec(voiceLog)?.[1]);
 const ssim=Number(/All:\s*([0-9.]+)/.exec(coverLog)?.[1]);
 if(black.some(x=>x>=2)||trailingBlack.some(x=>videoDurationSeconds-x>=2))
  reasons.push('LONG_BLACK_SCREEN');
 if(frozen.some(x=>x>=7)||trailingFreeze.some(x=>videoDurationSeconds-x>=7))
  reasons.push('LONG_FROZEN_VIDEO');
 if(silent.some(x=>x>=4)||trailingSilence.some(x=>videoDurationSeconds-x>=4))
  reasons.push('LONG_VOICE_GAP');
 if(!Number.isFinite(mean)||mean<=-37||mean>=-8||
  !Number.isFinite(peak)||peak<=-18||peak>0)
  reasons.push('NARRATION_LEVEL_OUT_OF_RANGE');
 if(!Number.isFinite(ssim)||ssim<0.70)reasons.push('THUMBNAIL_NOT_MATCHING_FIRST_FRAME');
 return {ok:reasons.length===0,reasons,
  maxBlackSeconds:Math.max(0,...black),maxFreezeSeconds:Math.max(0,...frozen),
  maxVoiceGapSeconds:Math.max(0,...silent),narrationMeanDb:mean,
  narrationPeakDb:peak,firstFrameSsim:ssim};
}
async function ffLog(runner,args){
 const out=await runner('ffmpeg',args,{timeout:180000,maxBuffer:5*1024*1024});
 return String(out.stderr??'')+'\n'+String(out.stdout??'');
}
export async function inspectFinalNarratedPilot({videoFile,coverFile,narrationFile,reportFile,runner=exec}={}){
 const path={};
 try{
  path.video=checkPath(videoFile,['.mp4']);path.cover=checkPath(coverFile,['.jpg','.jpeg']);
  path.narration=checkPath(narrationFile,['.wav']);path.report=checkPath(reportFile,['.json']);
 }catch{return fail(['INVALID_LOCAL_FILE_ARGUMENT'])}
 let integrity;
 try{integrity={video:await checksum(path.video),cover:await checksum(path.cover),
  narration:await checksum(path.narration)}}catch{return fail(['REQUIRED_LOCAL_MEDIA_FILE_MISSING_OR_UNSAFE'])}
 const probe={},reasons=[];
 for(const [name,file] of [['video',path.video],['cover',path.cover],['narration',path.narration]]){
  try{
   const r=await runner('ffprobe',['-v','error','-show_entries',
    'format=duration,size:stream=codec_type,codec_name,width,height,avg_frame_rate',
    '-of','json',file],{timeout:25000});
   probe[name]=parseProbe(r.stdout);
  }catch{reasons.push('FFPROBE_'+name.toUpperCase()+'_FAILED')}
 }
 if(reasons.length)return fail(reasons);
 const format=assessProbes(probe);reasons.push(...format.reasons);
 if(!format.ok)return fail(reasons,{technicalChecksPassed:false});
 let signals;
 try{
  const [videoLog,voiceLog,coverLog]=await Promise.all([
   ffLog(runner,['-hide_banner','-nostats','-v','info','-i',path.video,
    '-map','0:v:0','-vf','scale=180:320,blackdetect=d=2:pix_th=0.05:pic_th=0.98,freezedetect=n=-50dB:d=7',
    '-an','-f','null','-']),
   ffLog(runner,['-hide_banner','-nostats','-v','info','-i',path.narration,
    '-af','silencedetect=noise=-38dB:d=4,volumedetect','-f','null','-']),
   ffLog(runner,['-hide_banner','-nostats','-v','info','-framerate','2','-loop','1',
    '-i',path.cover,'-i',path.video,'-filter_complex',
    '[0:v]fps=2,scale=270:480,format=yuv420p,trim=duration=0.6,setpts=PTS-STARTPTS[c];'+
    '[1:v]fps=2,scale=270:480,format=yuv420p,trim=duration=0.6,setpts=PTS-STARTPTS[v];'+
    '[c][v]ssim=shortest=1','-an','-f','null','-'])
  ]);
  signals=assessSignals({videoLog,voiceLog,coverLog,videoDurationSeconds:format.durationSeconds});
  reasons.push(...signals.reasons);
 }catch{return fail(['MEDIA_DECODE_OR_QA_COMMAND_FAILED'])}
 const report={schemaVersion:1,source:'isolated-offline-pilot',
  state:reasons.length?'BLOCKED':'PASS_TECHNICAL_ONLY',
  checkedAt:new Date().toISOString(),technicalChecksPassed:reasons.length===0,
  reasons,...integrity,durationSeconds:format.durationSeconds,fps:format.fps,signals,
  koreanPronunciationReviewed:false,commercialRightsApproved:false,
  creativeQualityReviewed:false,socialPlatformCoverVerified:false,
  permanentFinalAssetStored:false,publicationAllowed:false,
  independentlyOperatedPublisherEnabled:false};
 try{
  await mkdir(dirname(path.report),{recursive:true});
  await writeFile(path.report,JSON.stringify(report,null,2)+'\n',{flag:'w'});
 }catch{return fail(['QA_REPORT_WRITE_FAILED'])}
 return report;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const [videoFile,coverFile,narrationFile,reportFile]=process.argv.slice(2);
 inspectFinalNarratedPilot({videoFile,coverFile,narrationFile,reportFile})
  .then(x=>{console.log(JSON.stringify({state:x.state,reasons:x.reasons,publicationAllowed:false}));
   if(x.state!=='PASS_TECHNICAL_ONLY')process.exitCode=1})
  .catch(()=>{console.error('PILOT_TECHNICAL_QA_UNEXPECTED_FAILURE');process.exitCode=1});
}
