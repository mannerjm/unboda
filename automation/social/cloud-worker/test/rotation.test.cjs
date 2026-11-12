"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {enabledNetworks}=require("../lib/video-publisher.cjs");
const platforms=["instagram","facebook","youtube","tiktok"];
const hours=["00","08","12","20"];
test("each day four original videos rotate across three of four providers per slot",()=>{
 for(const date of ["20261112","20261113","20261114","20261115","20270101"]){
  const counts=Object.fromEntries(platforms.map(n=>[n,0]));
  const sets=new Set();
  for(const hourKst of hours){
   const triple=enabledNetworks({SOCIAL_VIDEO_NETWORKS:"rotation"},
    {targetDateKst:date,hourKst});
   assert.equal(triple.length,3);
   assert.equal(new Set(triple).size,3);
   assert.equal(triple.every(n=>platforms.includes(n)),true);
   triple.forEach(n=>counts[n]++);
   sets.add([...triple].sort().join(","));
  }
  assert.equal(sets.size,4,"all four omission patterns must be used once");
  assert.deepEqual(counts,{instagram:3,facebook:3,youtube:3,tiktok:3});
 }
});
test("every publishing hour rotates through all omitted providers in 4 days",()=>{
 const dates=["20261112","20261113","20261114","20261115"];
 for(const hourKst of hours){
  const missing=new Set();
  for(const targetDateKst of dates){
   const triple=enabledNetworks({SOCIAL_VIDEO_NETWORKS:"rotation"},
     {targetDateKst,hourKst});
   missing.add(platforms.find(n=>!triple.includes(n)));
  }
  assert.deepEqual(missing,new Set(platforms));
 }
});
test("bad KST dates and unexpected slots fail closed",()=>{
 for(const targetDateKst of ["bad","20261340","20260230","2026111"]){
  assert.equal(enabledNetworks({SOCIAL_VIDEO_NETWORKS:"rotation"},
   {targetDateKst,hourKst:"00"}),null);
 }
 assert.equal(enabledNetworks({SOCIAL_VIDEO_NETWORKS:"rotation"},
   {targetDateKst:"20261113",hourKst:"19"}),null);
});
