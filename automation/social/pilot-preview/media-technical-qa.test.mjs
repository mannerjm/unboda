import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {assessProbes,assessSignals,inspectFinalNarratedPilot} from './media-technical-qa.mjs';
const videoProbe={format:{duration:'30.010'},streams:[
 {codec_type:'video',codec_name:'h264',width:1080,height:1920,avg_frame_rate:'30/1'},
 {codec_type:'audio',codec_name:'aac'}]};
const coverProbe={format:{duration:'0'},streams:[{codec_type:'video',codec_name:'mjpeg',width:1080,height:1920}]};
const narrationProbe={format:{duration:'30.000'},streams:[{codec_type:'audio',codec_name:'pcm_s16le'}]};
const good={videoLog:'',voiceLog:'mean_volume: -25.0 dB\nmax_volume: -4.5 dB',
 coverLog:'SSIM Y:0.99 (22) U:0.99 (22) V:0.99 (22) All:0.935 (13)'};
test('rejects wrong codec or orientation and bad voice stem',()=>{
 assert.equal(assessProbes({video:videoProbe,cover:coverProbe,narration:narrationProbe}).ok,true);
 const wrong={...videoProbe,streams:videoProbe.streams.map(x=>
  x.codec_type==='video'?{...x,height:1080}:x)};
 assert.ok(assessProbes({video:wrong,cover:coverProbe,narration:narrationProbe})
  .reasons.includes('VIDEO_ORIENTATION_CODEC_OR_FPS_INVALID'));
 assert.ok(assessProbes({video:videoProbe,cover:coverProbe,
  narration:{...narrationProbe,streams:[{codec_type:'audio',codec_name:'mp3'}]}})
  .reasons.includes('NARRATION_STEM_NOT_30S_PCM'));
});
test('detects frozen/black video, long Korean-voice gaps and mismatched first frame',()=>{
 assert.equal(assessSignals(good).ok,true);
 const r=assessSignals({videoLog:'black_duration:2.6 freeze_duration:8.0',
  voiceLog:'silence_duration:4.5\nmean_volume: -70.0 dB\nmax_volume: -30.0 dB',
  coverLog:'All:0.410 (4)'});
 for(const k of ['LONG_BLACK_SCREEN','LONG_FROZEN_VIDEO','LONG_VOICE_GAP',
  'NARRATION_LEVEL_OUT_OF_RANGE','THUMBNAIL_NOT_MATCHING_FIRST_FRAME'])
   assert.ok(r.reasons.includes(k),k);
 assert.ok(assessSignals({...good,videoLog:'black_start: 25'}).reasons.includes('LONG_BLACK_SCREEN'));
 assert.ok(assessSignals({...good,videoLog:'freeze_start: 20'}).reasons.includes('LONG_FROZEN_VIDEO'));
 assert.ok(assessSignals({...good,voiceLog:good.voiceLog+'\nsilence_start: 24'}).reasons.includes('LONG_VOICE_GAP'));
 assert.equal(assessSignals({}).ok,false);
});
test('stays private, produces hashed technical report but never publish approval',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'unboda-qa-'));
 try{
  const args={videoFile:join(dir,'final.mp4'),coverFile:join(dir,'cover.jpg'),
   narrationFile:join(dir,'voice.wav'),reportFile:join(dir,'qa.json')};
  await Promise.all([args.videoFile,args.coverFile,args.narrationFile]
   .map(f=>writeFile(f,Buffer.alloc(1024,1))));
  let calls=0;
  const runner=async(cmd,argv)=>{
   calls++;
   if(cmd==='ffprobe')return {stdout:JSON.stringify(
    argv.at(-1)===args.videoFile?videoProbe:
    argv.at(-1)===args.coverFile?coverProbe:narrationProbe),stderr:''};
   if(cmd==='ffmpeg'){
    const str=argv.join(' ');
    return {stdout:'',stderr:str.includes('ssim=')?good.coverLog:
      str.includes('silencedetect=')?good.voiceLog:good.videoLog};
   }
   throw Error('UNEXPECTED_COMMAND');
  };
  const r=await inspectFinalNarratedPilot({...args,runner});
  assert.equal(r.state,'PASS_TECHNICAL_ONLY');
  assert.equal(r.publicationAllowed,false);
  assert.equal(r.koreanPronunciationReviewed,false);
  assert.equal(r.commercialRightsApproved,false);
  assert.equal(r.socialPlatformCoverVerified,false);
  assert.equal(calls,6);
  const saved=JSON.parse(await readFile(args.reportFile,'utf8'));
  assert.equal(saved.publicationAllowed,false);
  assert.equal(saved.video.sha256.length,64);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('refuses remote URLs and missing files without any execution',async()=>{
 let count=0;
 for(const file of ['https://example.com/movie.mp4','/tmp/does-not-exist-unboda.mp4']){
  const r=await inspectFinalNarratedPilot({videoFile:file,coverFile:'/tmp/c.jpg',
   narrationFile:'/tmp/voice.wav',reportFile:'/tmp/qa.json',runner:async()=>{count++}});
  assert.equal(r.state,'BLOCKED');
 }
 assert.equal(count,0);
});
