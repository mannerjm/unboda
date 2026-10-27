import test from "node:test";
import assert from "node:assert/strict";
import {planLifestyleVideoCandidate,FOUR_KST_TIMES,SLOT_THEMES} from "./lifestyle-video-planner.mjs";
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
  assert.equal(x.commercialVideoRightsVerified,false);
 }
 assert.equal(selected.size,16);
});
