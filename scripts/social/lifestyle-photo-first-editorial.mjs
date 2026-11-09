#!/usr/bin/env node
/**
 * Photo-first editorial drafts for UNBODA's seven lifestyle slots.
 * ONLY DESCRIBES OBJECTS that the actual candidate's source metadata and
 * pixel-scene model identify. This does not independently approve photographs
 * and NEVER schedules or publishes posts.
 */
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
const root=path.dirname(fileURLToPath(import.meta.url));
const SCENES=JSON.parse(fs.readFileSync(path.join(root,"lifestyle-photo-scenes.json"),"utf8")).slots;
const HOURS=["01","04","10","13","16","19","22"];
const editorialAspects=["시작","균형","순서","기록","변화","회복"];
const questions=[
 "오늘 어디부터 정리할지 망설일 때",
 "익숙한 방식이 잘 맞지 않는다고 느낄 때",
 "시간이 부족한데 할 일은 쌓여 있을 때",
 "나와 다른 사람의 리듬이 다르게 느껴질 때",
 "작은 선택이 반복돼 피곤하게 느껴질 때",
 "하던 일을 잠깐 멈추고 확인하고 싶을 때",
 "앞으로의 우선순위가 헷갈릴 때",
 "나에게 맞는 습관이 무엇인지 궁금할 때",
 "목표는 있지만 시작이 막막할 때",
 "어제와 오늘의 차이를 알아보고 싶을 때",
 "한 번 더 확인해야 할 부분이 보일 때",
 "바쁘다는 말에 중요한 것을 놓칠 때",
 "비슷한 실수를 다시 하지 않으려 할 때",
 "내가 너무 서두르고 있는지 궁금할 때",
 "한 번 정한 계획을 바꾸기 어려울 때",
 "내 기준을 다른 사람에게 설명하기 어려울 때",
 "하루를 되돌아보며 다음을 준비할 때"
];
const actions={
 "01":["오늘 공부에서 기억하고 싶은 한 줄을 적어 보세요.","문제를 풀던 순서에서 부담스러운 부분을 살펴보세요.","다음에 복습할 내용을 짧게 정리해 보세요."],
 "04":["잠드는 시각과 조명 밝기를 어제와 비교해 보세요.","잠들기 전 쉬는 시간을 조금 남겨 보세요.","내 생활 리듬에 맞는 휴식 순서를 적어 보세요."],
 "10":["업무에서 먼저 확인할 항목 세 가지를 적어 보세요.","회의 전에 꼭 질문할 내용을 정리해 보세요.","내 역할과 협업할 부분을 분리해서 살펴보세요."],
 "13":["이번 주 장보기 목록을 필요한 순서로 정해 보세요.","고정 지출과 선택 지출을 나누어 적어 보세요.","구매 전 예산 기준을 한 번 더 확인해 보세요."],
 "16":["친구에게 묻고 싶은 말을 한 문장으로 정리해 보세요.","대화에서 서로 다르게 이해한 부분을 확인해 보세요.","연락할 시간을 상대와 맞춰 보세요."],
 "19":["가족이 나눌 일을 작은 목록으로 정해 보세요.","집안일이 한 사람에게 몰리는지 살펴보세요.","서로 가능한 시간을 먼저 확인해 보세요."],
 "22":["내일 할 일 중 첫 번째 항목을 골라 적어 보세요.","마무리하지 못한 일을 작게 나누어 보세요.","무리 없는 생활 습관 하나를 정해 보세요."]
};
function validDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s??"")&&!Number.isNaN(Date.parse(s+"T00:00:00Z"))}
function epoch(s){return Date.parse(s+"T00:00:00Z")}
function trimmed(s){return typeof s==="string"&&s.trim().length>0}
function safeScene(hour,id){return SCENES[hour]?.scenes.find(s=>s.id===id)}
export function preparePhotoFirstEditorial({dateKst,editorial,manifest,review,independent=null,catalog,usedMedia=[]}){
 if(!validDate(dateKst)||editorial?.dateKst!==dateKst||
   manifest?.dateKst!==dateKst||review?.dateKst!==dateKst)
  throw Error("PHOTO_FIRST_DATED_SOURCES_NOT_ALIGNED");
 if(independent && (independent.dateKst!==dateKst||
   independent.publicationAllowed!==false || !Array.isArray(independent.photos)))
  throw Error("SECOND_MODEL_REPORT_INCOMPLETE_OR_UNSAFE");
 if(!Array.isArray(editorial.stories)||editorial.stories.length!==7||
    !Array.isArray(manifest.photos)||!Array.isArray(review.photos)||
    !Array.isArray(catalog?.products))
  throw Error("PHOTO_FIRST_INVALID_INPUTS");
 const prods=new Map(catalog.products.map(p=>[p.id,p]));
 const datesSinceStart=Math.floor((epoch(dateKst)-epoch("2026-11-10"))/86400000);
 if(datesSinceStart<0)throw Error("PHOTO_FIRST_BEFORE_START");
 const stories=[];const unresolved=[];const seen=new Set();
 for(const hour of HOURS){
  const previous=editorial.stories.find(s=>s.hourKst===hour);
  if(!previous)throw Error("PHOTO_FIRST_MISSING_HOUR:"+hour);
  const first=review.photos.find(x=>x.hourKst===hour);
  const second=independent?.photos.find(x=>x.hourKst===hour);
  // Never rewrite CLIP scores or treat a BLIP caption by itself as a pass.
  // The alternate file must have been explicitly approved by both models.
  const firstCandidate=first?.candidateScores?.find(x=>
   x.candidateFile===second?.bestCandidateFile&&
   x.candidateSha256===second?.candidateSha256&&
   x.automatedSceneMatch===true&&
   x.sceneModelCandidates?.some(y=>y.passed===true&&y.sceneId===second?.sceneId));
  const secondPassed=second?.blipSceneMatch===true&&
   Array.isArray(second.independentSceneChecks)&&
   second.independentSceneChecks.length===2&&
   second.independentSceneChecks.every(x=>x.pass===true);
  const v=independent
   ?(secondPassed&&firstCandidate?{
      ...first,bestSceneId:second.sceneId,bestCandidateFile:second.bestCandidateFile,
      candidateSha256:second.candidateSha256,automatedSceneMatch:true
     }:null)
   :first;
  const scene=safeScene(hour,v?.bestSceneId);
  const photo=manifest.photos.find(p=>p.hourKst===hour &&
    p.file===v?.bestCandidateFile&&p.sha256===v?.candidateSha256 &&
    p.sceneCandidates?.includes(v?.bestSceneId));
  const product=prods.get(SCENES[hour].productId);
  if(!product||product.id!==previous.productId||
     !trimmed(product.title)||!product.landingPath)
   throw Error("PHOTO_FIRST_UNVERIFIED_SALEABLE_PRODUCT:"+hour);
  let reason=null;
  if(!scene || !v?.automatedSceneMatch || !photo)reason="PHOTO_OBJECT_AND_PIXEL_EVIDENCE_MISSING";
  else if(!/^[a-f0-9]{64}$/.test(photo.sha256) ||
     !/^[a-f0-9]{16}$/.test(photo.phash??"") ||
     photo.width!==1080||photo.height!==1350 || !photo.rights?.license ||
     !photo.sourcePage?.startsWith("https://commons.wikimedia.org/"))
   reason="PHOTO_RIGHTS_SOURCE_OR_FINGERPRINT_MISSING";
  else if(seen.has(photo.sha256)||
    usedMedia.some(p=>p.sha256===photo.sha256&&
      validDate(p.dateKst)&&Math.abs(epoch(dateKst)-epoch(p.dateKst))<=90*86400000))
   reason="DUPLICATE_PHOTO_IN_90_DAY_HISTORY";
  if(!reason){
   const ix=(datesSinceStart*7+Number(hour))%questions.length;
   const ask=questions[ix],action=actions[hour][(datesSinceStart+Number(hour))%3];
   const aspect=editorialAspects[Math.floor(datesSinceStart/17)%editorialAspects.length];
   const title=scene.labelKo+" · "+aspect+" — "+ask;
   const lifeSituation=scene.subjectKo+"을(를) 보며 평소 생활을 돌아보는 순간";
   const advice=SCENES[hour].theme+"을 살피면서 "+action;
   const topicKey="photo-first-"+hour+"-"+scene.id+"-"+dateKst.replaceAll("-","");
   const productCta="운보다 무료 사주 확인 https://unboda.kr/guest-saju → "+product.title+
     " https://unboda.kr"+product.landingPath;
   const credit=photo.rights.license.startsWith("CC BY")?
     "사진: "+photo.rights.artist+" / "+photo.rights.license+
     " / "+photo.rights.licenseUrl:"";
   const caption=[title,lifeSituation,advice,
    "사주는 미래를 단정하기보다 자신의 습관을 돌아보는 참고 자료입니다.",
    productCta,credit].filter(Boolean).join("\n");
   if([...caption].length>450)reason="FULL_COPYRIGHT_CREDIT_EXCEEDS_CAPTION_LIMIT";
   else {
    stories.push({hourKst:hour,topicKey,sceneId:scene.id,visualMotif:SCENES[hour].motif,
      title,lifeSituation,advice,productId:product.id,productTitle:product.title,
      landingPath:product.landingPath,productCta,caption,captionLength:[...caption].length,
      photoFile:photo.file,photoSha256:photo.sha256,photoPhash:photo.phash,
      photoSourcePage:photo.sourcePage,photoRights:photo.rights,
      photoSceneModelVerified:true,independentSceneVerified:!!(independent&&secondPassed),
      photoReadyForSnsPosting:false});
    seen.add(photo.sha256);
   }
  }
  if(reason)unresolved.push({hourKst:hour,reason});
 }
 return {schemaVersion:1,brand:"UNBODA",dateKst,
  state:unresolved.length?"PHOTO_FIRST_EDITORIAL_INCOMPLETE":"PHOTO_FIRST_EDITORIAL_DRAFT_READY",
  generatedPhotoAnchoredStories:stories.length,requiredStories:7,
  stories,unresolved,photoReadyForSnsPosting:false,publicationAllowed:false,
  humanVisualReviewed:false,wholeSocial90DayCoverageVerified:false,
  snsRequestsAttempted:0};
}
const opts=Object.fromEntries(process.argv.slice(2).filter(s=>s.startsWith("--")&&s.includes("=")).map(s=>{
 const i=s.indexOf("=");return[s.slice(2,i),s.slice(i+1)];
}));
if(opts.editorial&&opts.manifest&&opts.review&&opts.catalog&&opts.output){
 const read=k=>JSON.parse(fs.readFileSync(opts[k],"utf8"));
 const result=preparePhotoFirstEditorial({dateKst:opts.date,editorial:read("editorial"),
  manifest:read("manifest"),review:read("review"),
  independent:opts.independent?read("independent"):null,catalog:read("catalog")});
 fs.writeFileSync(opts.output,JSON.stringify(result,null,2)+"\n");
 console.log("PHOTO_FIRST_EDITORIAL",result.dateKst,result.generatedPhotoAnchoredStories,
   "OF",result.requiredStories,"PUBLICATION_BLOCKED");
}
