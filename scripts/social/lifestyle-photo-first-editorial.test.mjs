import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {preparePhotoFirstEditorial} from "./lifestyle-photo-first-editorial.mjs";
const slots=JSON.parse(fs.readFileSync(new URL("./lifestyle-photo-scenes.json",import.meta.url),"utf8")).slots;
const catalog=JSON.parse(fs.readFileSync(new URL("../../automation/social/saleable-product-catalog.json",import.meta.url),"utf8"));
const hours=["01","04","10","13","16","19","22"];
function fixture(date="2026-11-10"){
 const stories=[],photos=[],review=[];
 for(let i=0;i<hours.length;i++){
  const hour=hours[i],scene=slots[hour].scenes[0];
  const hash=(i+1).toString(16).repeat(64);
  stories.push({hourKst:hour,productId:slots[hour].productId});
  photos.push({hourKst:hour,file:"photo-"+hour+".jpg",sha256:hash,
   phash:(i+1).toString(16).repeat(16),width:1080,height:1350,
   sourcePage:"https://commons.wikimedia.org/wiki/File:Test-"+hour+".jpg",
   sceneCandidates:[scene.id],rights:{license:"CC0",licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/"}
  });
  review.push({hourKst:hour,bestCandidateFile:"photo-"+hour+".jpg",
   candidateSha256:hash,bestSceneId:scene.id,automatedSceneMatch:true});
 }
 return {dateKst:date,
  editorial:{dateKst:date,stories},
  manifest:{dateKst:date,photos},review:{dateKst:date,photos:review},
  catalog};
}
test("all seven photo scenes independently determine actual Korean copy and valid saleable products",()=>{
 const f=fixture(),r=preparePhotoFirstEditorial(f);
 assert.equal(r.generatedPhotoAnchoredStories,7);
 assert.equal(r.unresolved.length,0);
 assert.equal(r.publicationAllowed,false);
 assert.equal(r.photoReadyForSnsPosting,false);
 assert.equal(r.snsRequestsAttempted,0);
 assert.equal(new Set(r.stories.map(s=>s.photoSha256)).size,7);
 for(const s of r.stories){
  const t=slots[s.hourKst].scenes.find(x=>x.id===s.sceneId);
  assert(s.title.startsWith(t.labelKo));
  assert(s.lifeSituation.includes(t.subjectKo));
  assert(s.caption.includes("사주")&&s.caption.includes(s.productTitle));
  assert(s.captionLength<=450);
  assert.equal(s.independentSceneVerified,false);
 }
});
test("failed pixel scene blocks only that slot without making a fake image",()=>{
 const f=fixture();f.review.photos.find(s=>s.hourKst==="13").automatedSceneMatch=false;
 const r=preparePhotoFirstEditorial(f);
 assert.equal(r.generatedPhotoAnchoredStories,6);
 assert.deepEqual(r.unresolved.map(x=>x.hourKst),["13"]);
 assert(!r.stories.some(s=>s.hourKst==="13"));
 assert.equal(r.publicationAllowed,false);
});
test("photo matched to different scene ID cannot be described as unrelated object",()=>{
 const f=fixture();f.review.photos[0].bestSceneId="books";
 const r=preparePhotoFirstEditorial(f);
 assert.equal(r.generatedPhotoAnchoredStories,6);
 assert.equal(r.unresolved[0].reason,"PHOTO_OBJECT_AND_PIXEL_EVIDENCE_MISSING");
});
test("verified metadata photo with different file hash fails",()=>{
 const f=fixture();f.review.photos[0].candidateSha256="f".repeat(64);
 const r=preparePhotoFirstEditorial(f);
 assert.equal(r.generatedPhotoAnchoredStories,6);
});
test("repeat media SHA within 90-day history blocks publication story",()=>{
 const f=fixture(),h=f.manifest.photos[0].sha256;
 const r=preparePhotoFirstEditorial({...f,usedMedia:[{dateKst:"2026-10-30",sha256:h}]});
 assert.equal(r.generatedPhotoAnchoredStories,6);
 assert(r.unresolved.some(x=>x.reason==="DUPLICATE_PHOTO_IN_90_DAY_HISTORY"));
});
test("saleable product ID mismatches stop content rather than hallucinating product",()=>{
 const f=fixture();f.editorial.stories[2].productId="unknown";
 assert.throws(()=>preparePhotoFirstEditorial(f),/UNVERIFIED_SALEABLE_PRODUCT/);
});
test("photo brief with a future date mismatch stops before posting",()=>{
 const f=fixture();f.manifest.dateKst="2026-11-11";
 assert.throws(()=>preparePhotoFirstEditorial(f),/DATED_SOURCES_NOT_ALIGNED/);
});
test("next 90 days retain distinct date-scoped title/topic keys with photo-first scenes",()=>{
 const keys=new Set(),titles=new Set();
 for(let i=0;i<90;i++){
  const date=new Date(Date.parse("2026-11-10T00:00:00Z")+i*86400000).toISOString().slice(0,10);
  const f=fixture(date),r=preparePhotoFirstEditorial(f);
  assert.equal(r.stories.length,7);
  for(const story of r.stories){
   const k=date+"|"+story.hourKst+"|"+story.topicKey;
   assert(!keys.has(k));keys.add(k);
   // One visual scene may recur, but article titles must vary within 90 days
   const t=story.hourKst+"|"+story.title;
   assert(!titles.has(t),"repeated photo-first headline "+t);
   titles.add(t);
  }
 }
 assert.equal(keys.size,630);
});
