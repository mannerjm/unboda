import test from "node:test";
import assert from "node:assert/strict";
import {kstTomorrow,releaseTag,expectedFiles,validateRelease,classifySlot} from "../lib/scheduler.mjs";
test("KST tomorrow rolls over and tags match exact date",()=>{
 assert.equal(kstTomorrow(Date.parse("2026-11-11T12:00:00Z")),"2026-11-12");
 assert.equal(releaseTag("2026-11-12","constellation"),"unboda-constellation-polished-20261112");
 assert.equal(releaseTag("2026-11-13","constellation"),"unboda-constellation-20261113");
 assert.equal(expectedFiles("2026-11-13","zodiac").length,7);
});
test("source is blocked when missing or corrupted; no publication approval",()=>{
 const day="2026-11-13",name=expectedFiles(day,"constellation");
 assert.throws(()=>validateRelease({assets:[],tag_name:releaseTag(day,"constellation"),draft:false},
   {dateKst:day,images:[]},day,"constellation"),/INCOMPLETE/);
 const files=[...name,"constellation-manifest.json","caption.txt"];
 const doc={tag_name:releaseTag(day,"constellation"),draft:false,assets:files.map(name=>({name,size:60000}))};
 const m={dateKst:day,signCount:12,imageCount:5,generalEntertainmentOnly:true,
  images:name.map(name=>({name,sha256:"b".repeat(64),bytes:60000,dimensions:[1080,1350]}))};
 assert.equal(validateRelease(doc,m,day,"constellation").images.length,5);
 m.images[0].sha256="bogus";assert.throws(()=>validateRelease(doc,m,day,"constellation"),/METADATA/);
});
test("provider statuses must be exactly pending on all three, never doubles",()=>{
 const date="2026-11-13";
 const post={id:20,publicationDate:{dateTime:date+"T07:00:00"},media:Array(7).fill("x"),
  draft:false,autoPublish:true,providers:["facebook","instagram","threads"].map(network=>({network,status:"PENDING"}))};
 assert.equal(classifySlot([],date,"zodiac"),"ABSENT");
 assert.equal(classifySlot([post],date,"zodiac"),"ALREADY_RESERVED");
 assert.equal(classifySlot([post,post],date,"zodiac"),"CONFLICT");
 assert.equal(classifySlot([{...post,providers:[{network:"facebook",status:"ERROR"}]}],date,"zodiac"),"CONFLICT");
});
