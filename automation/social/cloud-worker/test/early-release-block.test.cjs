"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {loadReleaseVideo}=require("../lib/release-video.cjs");
test("early-published October 29 money film never reaches upload",async()=>{
 const date="20261029";
 const tag="unboda-saju-shorts-"+date;
 const sha="a581205191b29c0615c577afd9f5009a9062b45b0112e1306c260b212d22ea1f";
 const manifest={schemaVersion:1,targetDateKst:date,
  generatedBy:"github-actions-four-qa-verified",publishAutomatically:false,
  brandSajuVerified:true,fourDistinctVisualStylesVerified:true,
  sourceCommit:"a".repeat(40),videos:[]};
 const items=[
  ["00","midnight","midnight-indigo","self-understanding"],
  ["08","commute","commute-sunrise","career"],
  ["12","friendship","relationship-coral","compatibility"],
  ["20","afterwork","finance-emerald","money"]
 ];
 for(const [hour,name,visualStyle,sajuCategory] of items){
  manifest.videos.push({hourKst:hour,name,visualStyle,sajuCategory,
   mp4:hour+"-"+name+".mp4",sha256:hour==="20"?sha:"b".repeat(64),
   bytes:1500,topicKey:"different-topic-"+date,title:"사주 이야기",
   caption:"운보다 무료 사주 조회를 통해 사주와 재물운을 이해해 보세요.",
   destination:"https://unboda.kr"});
 }
 const base="https://github.com/mannerjm/unboda/releases/download/"+tag+"/";
 const meta={tag_name:tag,draft:false,prerelease:true,assets:[
  {name:"manifest.json",size:2000,state:"uploaded",
   browser_download_url:base+"manifest.json"}]};
 let count=0;
 const fetcher=async(url)=>{
  count++;
  if(url.includes("/releases/tags/"))return {ok:true,json:async()=>meta};
  if(url.endsWith("manifest.json"))return {ok:true,json:async()=>manifest};
  throw Error("MP4 file must not be requested");
 };
 const result=await loadReleaseVideo({
  now:Date.parse("2026-10-29T19:45:00+09:00"),fetcher});
 assert.equal(result.reason,"ALREADY_PUBLISHED_EARLY_20261028_SOURCE_DUPLICATE");
 assert.equal(count,2);
});
