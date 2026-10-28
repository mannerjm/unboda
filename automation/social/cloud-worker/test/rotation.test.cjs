"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {enabledNetworks}=require("../lib/video-publisher.cjs");
test("one video selects two of Instagram Facebook YouTube TikTok",()=>{
 const allowed=new Set(["instagram","facebook","youtube","tiktok"]);
 for(const date of ["20261029","20261030","20261031"]){
  const counts={instagram:0,facebook:0,youtube:0,tiktok:0};
  for(const hourKst of ["00","08","12","20"]){
   const pair=enabledNetworks({SOCIAL_VIDEO_NETWORKS:"rotation"},
    {targetDateKst:date,hourKst});
   assert.equal(pair.length,2);
   assert.equal(new Set(pair).size,2);
   pair.forEach(n=>{assert.ok(allowed.has(n));counts[n]++;});
  }
  assert.deepEqual(counts,{instagram:2,facebook:2,youtube:2,tiktok:2});
 }
});
