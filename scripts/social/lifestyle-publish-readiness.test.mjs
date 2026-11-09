import {test} from "node:test";
import assert from "node:assert/strict";
import {inspectLifeReadiness} from "./lifestyle-publish-readiness.mjs";
const DATE="2026-11-10";
const HOURS=["01","04","10","13","16","19","22"];
const PROVIDERS=["facebook","instagram","threads","facebook","instagram","threads","facebook"];
const CATALOG={products:HOURS.map((h,i)=>({
 id:"saleable-"+h,title:"운보다 실제 판매 상품 "+h,landingPath:"/shop/"+h
}))};
function fixture(){
 const stories=HOURS.map((h,i)=>({
  hourKst:h,topicKey:"unboda-"+h+"-20261110",
  productId:CATALOG.products[i].id,productTitle:CATALOG.products[i].title,
  landingPath:CATALOG.products[i].landingPath,
  title:"일상 고민을 사주로 살펴보기 "+h,
  lifeSituation:"하루 생활 속에 반복되는 선택을 살펴보는 시간",
  advice:"내 생활의 기준을 다시 확인하고 다음 행동을 적어 보세요.",
  productCta:"운보다 무료 사주 → "+CATALOG.products[i].title
 }));
 const photos=HOURS.map((h,i)=>({
  hourKst:h,file:"candidate-"+h+"-1.jpg",
  sha256:(i+1).toString(16).repeat(64),
  phash:(i+1).toString(16).repeat(16),
  width:1080,height:1350,bytes:200000,
  sourcePage:"https://commons.wikimedia.org/wiki/File:Example.jpg",
  rights:{license:"CC0",licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",artist:"Photographer"}
 }));
 const vision=HOURS.map((h,i)=>({
  hourKst:h,bestCandidateFile:photos[i].file,
  candidateSha256:photos[i].sha256,automatedSceneMatch:true,
  humanVisualReviewed:true,visualReviewerId:"qa-reviewer-unique",
  visualReviewedAt:"2026-11-09T08:00:00Z"
 }));
 const files=HOURS.map((h,i)=>({
  hourKst:h,publicUrl:"https://unboda.kr/media/photo-"+h+".jpg",
  sha256:photos[i].sha256,mime:"image/jpeg",bytes:200000,
  verifiedPublicMedia:true
 }));
 return {
  editorial:{dateKst:DATE,stories},
  candidates:{dateKst:DATE,publicationAllowed:false,rightsMachineChecked:true,photos},
  vision:{dateKst:DATE,publicationAllowed:false,photos:vision},
  media:{files},
  history:{complete:true,checkedFrom:"2026-08-01",checkedThrough:"2026-11-09",media:[]},
  existing:{complete:true,dateKst:DATE,posts:[],monthTotal:100},
  catalog:CATALOG, atomicClaimReady:true,
  nowMs:Date.parse("2026-11-09T18:00:00+09:00")
 };
}
const kinds=r=>new Set(r.issues.map(x=>x.kind));
test("fully authenticated read-only preflight has no network POST or scheduling effect",()=>{
 const r=inspectLifeReadiness(fixture());
 assert.equal(r.ready,true);
 assert.equal(r.state,"PREFLIGHT_GATES_PASSED_NOT_PUBLISHED");
 assert.equal(r.prepared.length,7);
 assert.equal(r.publishAttempted,false);
 assert.equal(r.bookingAttempted,false);
 assert.deepEqual(r.prepared.map(x=>x.network),PROVIDERS);
 assert(r.prepared.every(x=>x.captionLength<=450));
});
test("candidate unapproved flags are mandatory",()=>{
 const f=fixture();f.candidates.publicationAllowed=true;
 assert(kinds(inspectLifeReadiness(f)).has("CANDIDATE_MUST_REMAIN_PUBLICATION_BLOCKED"));
});
test("second vision evidence or reviewer with audit timestamp is mandatory",()=>{
 const f=fixture();
 for(const v of f.vision.photos) {v.humanVisualReviewed=false;delete v.visualReviewerId;}
 assert(kinds(inspectLifeReadiness(f)).has("SECOND_INDEPENDENT_VISUAL_OR_HUMAN_REVIEW_MISSING"));
});
test("two different independent engines can substitute for manual evidence",()=>{
 const f=fixture();
 for(const v of f.vision.photos){
  v.humanVisualReviewed=false;
  v.independentSceneChecks=[{model:"detector-a",pass:true},{model:"detector-b",pass:true}];
 }
 assert.equal(inspectLifeReadiness(f).ready,true);
});
test("identical independent engine repeated does not count twice",()=>{
 const f=fixture();
 for(const v of f.vision.photos) {v.humanVisualReviewed=false;v.independentSceneChecks=[
  {model:"engine-a",pass:true},{model:"engine-a",pass:true}]}
 assert(kinds(inspectLifeReadiness(f)).has("SECOND_INDEPENDENT_VISUAL_OR_HUMAN_REVIEW_MISSING"));
});
test("90-day historic media prevents a photo from reappearing",()=>{
 const f=fixture();
 f.history.media.push({dateKst:"2026-10-15",
  sha256:f.candidates.photos[1].sha256,phash:f.candidates.photos[1].phash});
 assert(kinds(inspectLifeReadiness(f)).has("NINETY_DAY_PHOTO_DUPLICATE"));
});
test("previous ERROR, pending or published same-slot post prevents a second submission",()=>{
 for(const status of ["ERROR","PENDING","PUBLISHED"]){
  const f=fixture();
  f.existing.posts.push({dateKst:DATE,hourKst:"04",network:"instagram",status});
  assert(kinds(inspectLifeReadiness(f)).has("SLOT_ALREADY_RESERVED_OR_ATTEMPTED_DO_NOT_REPOST"));
 }
});
test("attempt without persistent single-owner atomic claim cannot proceed",()=>{
 const f=fixture();f.atomicClaimReady=false;
 assert(kinds(inspectLifeReadiness(f)).has("NO_ATOMIC_ONE_SHOT_POST_CLAIM"));
});
test("cannot schedule past or near-deadline slots",()=>{
 const f=fixture();f.nowMs=Date.parse("2026-11-10T00:40:00+09:00");
 assert(kinds(inspectLifeReadiness(f)).has("LATE_SCHEDULE_WINDOW_NO_RETRY"));
});
test("no stale or incomplete history waiver",()=>{
 const f=fixture();f.history.checkedFrom="2026-11-09";
 assert(kinds(inspectLifeReadiness(f)).has("UNVERIFIED_NINETY_DAY_PUBLICATION_HISTORY"));
});
test("no fallback to missing publicly reachable JPEG",()=>{
 const f=fixture();f.media.files[0].verifiedPublicMedia=false;
 assert(kinds(inspectLifeReadiness(f)).has("PUBLIC_HOSTED_MEDIA_NOT_VERIFIED"));
});
test("copyright permission and licensing details required",()=>{
 const f=fixture();f.candidates.photos[0].rights.license="All rights reserved";
 assert(kinds(inspectLifeReadiness(f)).has("INVALID_COMMERCIAL_MEDIA_RIGHTS"));
});
test("quota beyond 600 after seven posts is blocked",()=>{
 const f=fixture();f.existing.monthTotal=595;
 assert(kinds(inspectLifeReadiness(f)).has("MONTHLY_SNS_LIMIT_EXCEEDED"));
});
test("cannot silently truncate a long Korean Threads caption",()=>{
 const f=fixture();f.editorial.stories[2].advice="긴 설명 ".repeat(180);
 assert(kinds(inspectLifeReadiness(f)).has("CAPTION_TOO_LONG_OR_PRODUCT_DISCONNECTED"));
});
test("runtime refuses one mismatched date even if files themselves look valid",()=>{
 const f=fixture();f.vision.dateKst="2026-11-11";
 assert(kinds(inspectLifeReadiness(f)).has("SOURCE_DATE_MISMATCH"));
});
