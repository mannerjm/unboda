import test from "node:test";
import assert from "node:assert/strict";
import {REEL_LAYOUT,REEL_SCENES,checkReelTextBoxes,validateReelStory} from "./layout.mjs";
test("all main text lives above platform controls",()=>{
 assert.equal(REEL_LAYOUT.safe.bottom,1515);
 assert.equal(REEL_LAYOUT.height,1920);
 assert.equal(REEL_SCENES.length,4);
 assert.equal(REEL_SCENES[3].callToAction,"운보다 무료 사주");
});
test("programmatically detect safe and overflowing Korean text",()=>{
 const good=[{x:122,y:480,width:765,height:76},{x:140,y:1280,width:375,height:47}];
 assert.equal(checkReelTextBoxes({boxes:good}).ok,true);
 assert.equal(checkReelTextBoxes({boxes:[{...good[0],x:900}]}).ok,false);
 assert.equal(checkReelTextBoxes({boxes:[{...good[0],y:1580}]}).ok,false);
 assert.equal(checkReelTextBoxes({boxes:null}).ok,false);
});
test("story requires actual review, not technical render only",()=>{
 const got=validateReelStory();
 assert.equal(got.publishable,false);
 assert.ok(got.reasons.includes("VOICEOVER_NOT_REVIEWED"));
 assert.ok(got.reasons.includes("HUMAN_VISUAL_QA_PENDING"));
});
test("bad scene headlines block approval",()=>{
 const r=validateReelStory({scenes:REEL_SCENES.map((s,i)=>i? s:
  {...s,headline:["more than one","two","three"]}),
  editorialApproved:true,visualReviewApproved:true,
  voiceoverReviewed:true,mediaRightsApproved:true});
 assert.ok(r.reasons.includes("HEADLINE_LAYOUT_INVALID"));
});
test("format gate is not a claim of licensing or actual audio",()=>{
 const r=validateReelStory({editorialApproved:true,visualReviewApproved:true,
  voiceoverReviewed:true,mediaRightsApproved:true});
 assert.equal(r.publishable,true);
 // Other pipeline checks must independently verify actual media and external platform availability.
});
