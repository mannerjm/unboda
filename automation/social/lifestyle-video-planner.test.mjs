import test from "node:test";
import assert from "node:assert/strict";
import {planLifestyleVideoCandidate,FOUR_KST_TIMES,SLOT_THEMES,reviewLifestyleVideoScript} from "./lifestyle-video-planner.mjs";
test("exact KST four slots and next-day 24:00",()=>{
 const hours=[0,8,12,20];
 for(const h of hours){
  const stamp=Date.parse("2026-10-28T"+String(h).padStart(2,"0")+":00:00+09:00");
  const x=planLifestyleVideoCandidate({atMs:stamp});
  assert.equal(x.state,"CANDIDATE_ONLY");assert.ok(x.hook.includes("?"));
  assert.equal(x.notForPublication,true);assert.equal(x.sajuAsPerspectiveOnly,true);
 }
 assert.equal(planLifestyleVideoCandidate({atMs:Date.parse("2026-10-28T14:00:00+09:00")}).state,"BLOCKED");
 assert.deepEqual(FOUR_KST_TIMES,["00:00","08:00","12:00","20:00"]);
});
test("prevents reused topic keys even when four-option library exhausted",()=>{
 const at=Date.parse("2026-10-28T08:00:00+09:00");
 const all=new Set(Object.keys(SLOT_THEMES["08:00"].situations).map(i=>"08:00:"+i));
 assert.equal(planLifestyleVideoCandidate({atMs:at,usedTopicKeys:all}).reason,"NO_UNUSED_LIFESTYLE_TOPIC");
});
test("all 4 daily candidates avoid deterministic fortune claims and approval shortcuts",()=>{
 const selected=new Set();
 for(let day=0;day<4;day++)for(const h of [0,8,12,20]){
  const at=Date.parse("2026-10-28T00:00:00+09:00")+day*86400000+h*3600000;
  const x=planLifestyleVideoCandidate({atMs:at,usedTopicKeys:selected});
  assert.equal(x.state,"CANDIDATE_ONLY");selected.add(x.topicKey);
  const body=x.narrationDraft.join(" ");
  assert.doesNotMatch(body,/용신|지장간|십성|운명이 확정|반드시 부자/i);
  assert.equal(x.remoteNinetyDaySimilarityVerified,false);
  assert.ok(x.narrationDraft[0].includes(x.situation));
  assert.equal(x.editorialCheck.ok,true);
  assert.equal(x.editorialCheck.promotionalSharePercent,0);
  assert.equal(x.commercialVideoRightsVerified,false);
 }
 assert.equal(selected.size,16);
});

test("blocks brand-heavy ad scripts and promotion before the last scene",()=>{
 const situation="퇴근 후 마음이 지친 날";
 const x=reviewLifestyleVideoScript({situation,narrationDraft:[
  situation+". 왜 이렇게 지칠까요?",
  "운보다 무료 사주를 지금 확인하고 가입하세요.",
  "운보다에서 심층 분석을 결제해 보세요.",
  "운보다 분석을 바로 신청하세요."
 ]});
 assert.equal(x.ok,false);
 assert.ok(x.reasons.includes("PROMOTION_EXCEEDS_15_PERCENT"));
 assert.ok(x.reasons.includes("PROMOTION_BEFORE_FINAL_LINE"));
 assert.ok(x.reasons.includes("MULTIPLE_PROMOTIONAL_LINES"));
});
test("allows a short final brand reference only after substantive everyday guidance",()=>{
 const situation="퇴근 후 마음이 지친 날";
 const x=reviewLifestyleVideoScript({situation,narrationDraft:[
  situation+". 오늘 가장 마음에 걸린 일이 있었나요?",
  "오늘 있었던 일을 한 가지 적고 내 선택이 어땠는지 돌아보세요.",
  "내가 중요하게 여기는 대화 방식과 일상 습관을 확인해 보세요.",
  "운보다"
 ]});
 assert.equal(x.ok,true);
 assert.ok(x.promotionalSharePercent<=15);
});
test("blocks jargon-first, omitted real-life opener, fatalistic claims and hollow advice",()=>{
 const situation="월급날 이후 통장이 빨리 비는 날";
 const x=reviewLifestyleVideoScript({situation,narrationDraft:[
  "용신부터 보세요. 돈이 생길 운입니다.",
  "사주는 미래를 보장하므로 무조건 대박입니다.",
  "좋습니다.",
  "끝."
 ]});
 assert.equal(x.ok,false);
 assert.ok(x.reasons.includes("FIRST_LINE_NOT_REAL_LIFE_SCENARIO"));
 assert.ok(x.reasons.includes("FIRST_LINE_TOO_TECHNICAL"));
 assert.ok(x.reasons.includes("UNSAFE_STORYBOARD_LANGUAGE"));
 assert.ok(x.reasons.includes("NO_PRACTICAL_LIFE_POINT"));
 assert.equal(reviewLifestyleVideoScript({situation,narrationDraft:[]}).ok,false);
});
