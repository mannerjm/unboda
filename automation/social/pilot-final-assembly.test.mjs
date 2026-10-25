import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {
 CUTS,validateKoreanTitles,planFinalRender
} from "./pilot-final-assembly.mjs";
test("first premium Runway footage spans full ten seconds, not eight",()=>{
 const total=CUTS.reduce((x,y)=>x+y.length,0);
 assert.equal(total,31.5);
 assert.equal(total-3*0.5,30);
 assert.equal(CUTS[0].length,10.5);
});
test("Korean titles must have <=2 short readable lines",()=>{
 assert.equal(validateKoreanTitles(CUTS.map(x=>x.title)),true);
 assert.throws(()=>validateKoreanTitles([
 "띠만 알면 사주도 알 수 있을까요 너무너무 글자가 길어질 때",
 ...CUTS.slice(1).map(x=>x.title)]),/TITLE_OVERFLOWS/);
 assert.throws(()=>validateKoreanTitles(["가\n나\n다",...CUTS.slice(1).map(x=>x.title)]));
});
test("FFmpeg keeps 1080x1920, correct crossfade offsets, safe Korean subtitle area",()=>{
 const t=planFinalRender({
  clips:["/tmp/a.mp4","/tmp/b.mp4","/tmp/c.mp4","/tmp/d.mp4"],
  narrationFile:"/tmp/voice.mp3",outputFile:"/tmp/out.mp4",
  fontFile:"/tmp/NotoSansCJK.ttc",
  titleFiles:[0,1,2,3].map(i=>"/tmp/title"+i+".txt"),
  narrationProof:{licensed:true,koreanSpeechApproved:true},
  originalRights:true,frameSafeProof:true
 });
 const filters=t.args[t.args.indexOf("-filter_complex")+1];
 assert.match(filters,/tpad=stop_mode=clone:stop_duration=0\.5/);
 assert.match(filters,/offset=10\.0/);
 assert.match(filters,/offset=17\.0/);
 assert.match(filters,/offset=24\.0/);
 assert.match(filters,/crop=1080:1920/);
 assert.match(filters,/drawtext=fontfile=/);
 assert.equal((filters.match(/drawtext=fontfile=/g)??[]).length,1,
  "only first Runway scene gets overlay; other original cards have baked titles");
 assert.equal(t.firstRunwaySecondsPreserved,10);
 assert.equal(t.readyForPublishing,false);
 assert.ok(t.titleSafeBottomPx>=320);
});
test("unverified Korean audio cannot produce final video",()=>{
 const base={
  clips:["/tmp/a.mp4","/tmp/b.mp4","/tmp/c.mp4","/tmp/d.mp4"],
  narrationFile:"/tmp/voice.mp3",outputFile:"/tmp/out.mp4",
  fontFile:"/tmp/font.ttf",titleFiles:[0,1,2,3].map(i=>"/tmp/title"+i+".txt"),
  narrationProof:{licensed:false,koreanSpeechApproved:false},
  originalRights:true,frameSafeProof:true
 };
 assert.throws(()=>planFinalRender(base),/KOREAN_VOICE/);
 assert.throws(()=>planFinalRender({...base,
  narrationProof:{licensed:true,koreanSpeechApproved:true},
  frameSafeProof:false}),/CAPTION_SAFE_ZONE/);
});
