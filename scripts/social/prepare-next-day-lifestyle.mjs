#!/usr/bin/env node
// Produce ORIGINAL, dated lifestyle editorial JSON for the existing renderer.
// This only writes reviewed-input candidates. No photographs are fabricated,
// and this script NEVER schedules/posts via Metricool or changes customer data.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const argv=Object.fromEntries(process.argv.slice(2).filter(v=>v.startsWith('--')&&v.includes('=')).map(v=>{
  const p=v.indexOf('=');return [v.slice(2,p),v.slice(p+1)];
}));
const START='2026-11-10',DAY=86400000;
const STAGING=argv.staging||'.';
const catalog=JSON.parse(fs.readFileSync(argv.catalog||'automation/social/saleable-product-catalog.json','utf8'));
const products=new Map(catalog.products.map(x=>[x.id,x]));
function indexOfDay(date){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||
      new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)
    throw Error('INVALID_DATE');
  const i=(Date.parse(date+'T00:00:00Z')-Date.parse(START+'T00:00:00Z'))/DAY;
  if(!Number.isInteger(i)||i<0)throw Error('BEFORE_SOURCE_FACTORY_START');
  return i;
}
const SLOTS=[
 {hour:'01',motif:'journal',label:'수첩과 메모',category:'self-understanding',
  product:'study-learning-strategy',anchors:['수첩','메모'],
  location:'수첩을 펼친 책상',query:'notebook notes writing study photograph',
  subjects:['어제 읽은 책의 메모','강의에서 적어 둔 핵심 단어','공부하다 표시한 문장','새로 배운 표현','온라인 강의 필기','학습 목표가 적힌 수첩','시험 공부 순서','처음 접한 개념 설명','복습해야 할 문제','서로 비슷한 영어 단어','책갈피에 써 둔 질문','기억하고 싶은 아이디어','오늘 새로 알게 된 정보'],
  questions:['복습 순서를 정하지 못할 때','핵심이 기억나지 않을 때','중요한 부분을 찾기 어려울 때','한 줄로 정리하기 어려울 때','어디에 적었는지 헷갈릴 때','예시를 떠올리기 힘들 때','기록할지 망설여질 때','다른 내용과 섞여 보일 때','오늘 안에 끝낼지 고민될 때','다시 읽어도 뜻이 낯설 때','다음에 확인할 방법이 막막할 때'],
  actions:['수첩에 중요 내용을 한 줄로 적고 다시 읽어 보세요.','어제 적은 메모와 오늘의 내용을 나란히 놓고 차이를 기록해 보세요.','핵심 단어를 한 개 골라 내 말로 풀어 쓰고 예시를 찾아보세요.','기억나지 않는 부분을 표시해 두고 복습할 시간을 정해 보세요.','오늘의 공부 순서를 수첩에 적고 어려운 부분부터 짧게 확인해 보세요.']},
 {hour:'04',motif:'bedroom',label:'침실 조명과 이불',category:'self-understanding',
  product:'health-sleep-rhythm',anchors:['이불','조명'],
  location:'침실에서 잠자리를 정리하던 때',query:'bedroom lamp pillow bed photograph',
  subjects:['침대 옆의 작은 조명','잠들기 전 알람 시각','이불의 두께','침실 창가의 빛','베개를 놓는 위치','새벽에 보이는 시계','침대 옆 휴대폰','밤에 들리는 생활 소리','잠자기 전의 간단한 정리','휴식 시간에 켠 조명','잠들기 전 마신 물','아침에 접는 이불','침실의 온도'],
  questions:['편안한 기준을 정하기 어려울 때','어제와 다른 점이 느껴질 때','습관을 바꿀지 고민될 때','시간을 자꾸 놓치게 될 때','쉬는 시간이 짧게 느껴질 때','어떤 점이 불편한지 모를 때','다음 날에도 반복될까 걱정될 때','기록하는 것을 미루게 될 때','조금씩 조정하고 싶을 때','예전 방식이 맞는지 궁금할 때','생활 리듬이 흐트러진 느낌일 때'],
  actions:['잠자기 전 주변 조명과 시간을 확인하고 편안한 조건을 기록해 보세요.','어제의 휴식 시간과 오늘의 준비 순서를 적어 두고 차분히 비교해 보세요.','침실에서 불편한 요소 하나를 골라 오늘 바꿀 수 있는지 확인해 보세요.','잠들기 전에 휴대폰을 내려놓을 시각을 정하고 실천 여부를 적어 보세요.','나에게 편안한 이불과 조명 조건을 기록하고 다음 날 다시 살펴보세요.']},
 {hour:'10',motif:'presentation',label:'업무 발표 자료',category:'career',
  product:'career-workplace-adaptation',anchors:['업무 자료','표'],
  location:'회의 자료를 확인하는 업무 시간',query:'office business meeting presentation chart photograph',
  subjects:['회의 발표의 첫 화면','업무 자료에 적힌 숫자','발표 순서를 정리한 표','자료에 표시한 참고 출처','회의에서 사용할 질문','업무 보고서의 핵심 문장','동료가 남긴 검토 의견','발표에 넣을 비교 항목','일정별로 묶은 자료','슬라이드에 들어갈 그래프','업무 표의 금액 단위','회의 전에 준비한 메모','발표 자료의 마지막 장'],
  questions:['설명 순서를 정하기 어려울 때','수치를 다시 확인해야 할 때','동료의 의견이 다르게 보일 때','누락된 자료가 걱정될 때','질문할 부분이 떠오르지 않을 때','한눈에 전달하기 어려울 때','발표 시간이 모자랄 것 같을 때','중요한 부분이 가려질 때','같은 내용이 반복되어 보일 때','확인할 담당자가 헷갈릴 때','기존 자료와 차이가 날 때'],
  actions:['회의 자료의 첫 문장과 핵심 표를 확인하고 질문 하나를 미리 적어 보세요.','발표에 쓰는 숫자의 출처와 단위를 나란히 놓고 다시 확인해 보세요.','업무 문서를 중요한 순서대로 나눠 놓고 동료에게 확인할 점을 적어 보세요.','발표 전 확인할 항목을 세 가지로 줄이고 빠진 부분을 점검해 보세요.','회의에서 설명할 순서를 메모하고 필요하면 담당자에게 다시 물어보세요.']},
 {hour:'13',motif:'receipt',label:'영수증과 가계부',category:'money',
  product:'money-saving-discipline',anchors:['영수증','카드'],
  location:'구매 기록을 정리하는 책상',query:'shopping receipt calculator wallet photograph',
  subjects:['마트에서 받은 영수증','최근 카드 결제 내역','가계부의 식비 항목','지출을 적어 둔 메모','이번 주 장보기 목록','생활비가 적힌 수첩','편의점에서 산 물건','이동하며 쓴 교통비','주말에 주문한 식재료','할인받은 상품의 가격','배달 음식 결제 기록','자주 쓰는 생활용품 비용','카드 명세서의 정기 지출'],
  questions:['예산과 차이가 느껴질 때','꼭 필요한 지출인지 헷갈릴 때','같은 항목이 반복되어 보일 때','한 달 기준을 세우기 어려울 때','예전보다 비용이 늘어난 듯할 때','줄일 항목이 잘 보이지 않을 때','다음 구매를 망설이게 될 때','영수증 금액이 낯설 때','계획한 금액을 넘겼을 때','무엇부터 기록할지 고민될 때','우선순위를 정하지 못할 때'],
  actions:['영수증에서 반복되는 항목을 표시하고 다음 장보기 예산과 비교해 보세요.','카드 결제 내역을 종류별로 나누어 적고 필요한 지출인지 확인해 보세요.','가계부의 지난주 금액과 이번 주 금액을 비교하고 차이를 기록해 보세요.','구매 전 목록과 실제 영수증을 나란히 놓고 예산에서 달라진 점을 찾아보세요.','정기적으로 나가는 비용을 한 줄로 적고 다음 달 기준을 미리 정해 보세요.']},
 {hour:'16',motif:'dialogue',label:'친구와 연락하기',category:'compatibility',
  product:'relationship-friendship',anchors:['친구','대화'],
  location:'친구와 연락한 뒤 휴대폰을 보던 순간',query:'friends talking cafe smartphone conversation photograph',
  subjects:['친구에게 보낸 짧은 메시지','오랜만에 받은 연락','함께 찍은 여행 사진','친구의 근황 이야기','서로 바뀐 약속 시간','주말 만남에 대한 질문','답장에 담긴 짧은 표현','친구가 부탁한 작은 일','생일을 기억해 둔 메모','같이 볼 행사 안내','대화 중 나온 농담','단체 채팅방의 의견','친구와 나눈 고민 이야기'],
  questions:['답장 표현이 어려울 때','마음을 어떻게 전할지 고민될 때','서로의 기대가 다르게 느껴질 때','조금 서운한 마음이 남을 때','연락할 시간을 고르기 어려울 때','상대의 뜻을 잘 모르겠을 때','어디까지 이야기할지 망설일 때','고마운 마음을 표현하고 싶을 때','다시 물어볼지 고민될 때','부담을 줄이는 방법이 궁금할 때','대화가 짧게 끝나 아쉬울 때'],
  actions:['친구에게 전하고 싶은 말 한 줄을 적고 부드러운 표현으로 다시 보내 보세요.','대화에서 오해한 부분이 없는지 살펴보고 필요한 질문을 하나 골라 보세요.','연락 시간을 서로 확인한 뒤 편안한 약속 기준을 함께 정해 보세요.','친구의 이야기를 먼저 읽고 내가 공감한 부분을 짧게 말해 보세요.','서로 다른 생각을 바로 단정하지 말고 확인하고 싶은 내용을 정리해 보세요.']},
 {hour:'19',motif:'family',label:'가족 식탁과 달력',category:'family',
  product:'relationship-family-role',anchors:['식탁','달력'],
  location:'가족이 모여 앉은 식탁',query:'family dinner table home meal photograph',
  subjects:['가족이 함께 정한 식사 시간','주말 집안일을 나눠 적은 달력','공용 물건을 두는 자리','저녁 식사 뒤의 정리 순서','가족 모임의 준비 목록','냉장고에 붙인 일정 메모','다음 주의 가족 약속','가족끼리 맡은 역할','함께 장볼 물건 목록','집에서 돌아가며 하는 일','주말 방문 계획','식탁에 놓인 공용 달력','가족 대화에서 나온 요청'],
  questions:['역할을 나누기 어려울 때','누가 먼저 할지 헷갈릴 때','서로의 시간이 다를 때','바쁜 사람이 한쪽에 몰릴 때','할 일을 자꾸 미루게 될 때','약속한 내용을 잊기 쉬울 때','기대가 다르게 느껴질 때','다시 정할 필요가 생겼을 때','모두가 편안한 방법이 궁금할 때','의견을 조율하기 어려울 때','일정이 겹쳐 당황스러울 때'],
  actions:['가족이 함께 맡을 일을 달력에 한 줄씩 적고 부담을 나누어 보세요.','식탁에서 서로의 가능한 시간을 묻고 공용 일정을 차분히 정해 보세요.','가족이 자주 쓰는 물건의 위치를 정하고 모두가 볼 수 있게 적어 보세요.','집안일 목록을 나누어 적고 한 사람에게 몰린 부담이 없는지 확인해 보세요.','각자 바쁜 시간을 먼저 확인하고 함께 할 일의 순서를 조정해 보세요.']},
 {hour:'22',motif:'checklist',label:'하루 끝의 체크리스트',category:'self-understanding',
  product:'health-habit-continuity',anchors:['체크리스트','표시'],
  location:'다음 날 준비물을 펼쳐 둔 책상',query:'checklist notepad pen desk planning photograph',
  subjects:['다음 날에 필요한 준비물','오늘의 작은 정리 목록','자주 미루는 집안일','퇴근 뒤의 휴식 계획','가방에 넣을 생활용품','주말 청소 순서','매일 확인하는 체크리스트','하루에 정리할 물건','내일 가져갈 서류','하루 끝에 적은 메모','다시 시작하려는 생활 습관','저녁에 정한 간단한 목표','내일 아침의 준비 시간'],
  questions:['하나씩 확인하기 어려울 때','끝까지 지키기 부담스러울 때','무엇부터 할지 헷갈릴 때','미룬 일이 자꾸 떠오를 때','계획이 너무 많아 보일 때','작게 시작하고 싶을 때','반복하는 것이 지루하게 느껴질 때','놓친 항목이 걱정될 때','우선순위를 다시 정하고 싶을 때','더 쉬운 방법을 찾고 싶을 때','하루가 짧게 느껴질 때'],
  actions:['내일 필요한 항목 세 가지를 체크리스트에 적고 하나씩 확인해 보세요.','오늘 미룬 일을 한 가지 골라 작은 단계부터 다시 시작해 보세요.','실행하기 쉬운 생활 습관 하나를 정하고 완료 여부를 표시해 보세요.','저녁에 정한 할 일을 간단히 나눠 적고 실천한 부분을 확인해 보세요.','다음 날 준비 목록을 미리 적고 빠진 물건이 없는지 살펴보세요.']}
];
function compact3(str){
 const t=String(str).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 const set=new Set();for(let i=0;i<t.length-2;i++)set.add(t.slice(i,i+3));return set;
}
function dice(a,b){
 const x=compact3(a),y=compact3(b);
 let common=0;for(const word of x)if(y.has(word))common++;
 return 2*common/Math.max(1,x.size+y.size);
}
function build(date){
 const ix=indexOfDay(date);
 const used=new Set();
 const stories=SLOTS.map((s,n)=>{
  const obj=s.subjects[(ix*7+n*3)%s.subjects.length];
  const problem=s.questions[(ix*5+n*2)%s.questions.length];
  const action=s.actions[(ix+n*3)%s.actions.length];
  const title=obj+' — '+problem;
  // Avoid a shared location prefix: it artificially inflates 90-day similarity.
  const lifeSituation='"'+obj+'"을 살펴보다가 '+problem;
  const p=products.get(s.product);
  assert(p,'MISSING_SALEABLE_PRODUCT:'+s.product);
  const topicKey='lifestyle-'+s.motif+'-'+ix+'-'+date.replaceAll('-','');
  assert(!used.has(topicKey));used.add(topicKey);
  const story={
   hourKst:s.hour,visualMotif:s.motif,topicCategory:s.category,
   label:s.label,title,advice:action,lifeSituation,
   visualAnchors:s.anchors,sceneVariant:(ix+n)%5,topicKey,
   productId:p.id,productTitle:p.title,productCategory:p.category,
   productType:p.productType,landingPath:p.landingPath,
   contentGoal:p.productType==='compatibility'?'compatibility-conversion':'premium-conversion',
   productProblem:p.signals[0]+' 관련 '+obj+'이 중요한 생활 상황을 점검',
   productValue:p.analysisValue,
   productCta:'운보다 무료 사주 확인 https://unboda.kr/guest-saju → '+p.title+' https://unboda.kr'+p.landingPath,
   photoSearchQuery:s.query,photoMustDepict:s.anchors
  };
  for(const [field,min,max] of [
   ['title',12,38],['label',3,22],['advice',20,115],
   ['lifeSituation',12,100],['topicKey',12,90]
  ])assert(story[field].length>=min&&story[field].length<=max,
    'BAD_FIELD_LENGTH:'+date+':'+s.hour+':'+field+':'+story[field]);
  return story;
 });
 return {schemaVersion:2,dateKst:date,brand:'UNBODA',
   firstPartyOriginal:true,notPhotographs:true,
   editorialState:'READY_FOR_AUTOMATED_QA_NOT_HUMAN_REVIEWED',
   photoPostingApproved:false,stories};
}
function checkedAcrossDays(){
 const records=new Map();
 for(let ix=0;ix<112;ix++){
  const date=new Date(Date.parse(START+'T00:00:00Z')+ix*DAY).toISOString().slice(0,10);
  const result=build(date);
  assert(new Set(result.stories.map(x=>x.visualMotif)).size===7);
  for(const s of result.stories){
   const list=records.get(s.hourKst)||[];
   for(const item of list.slice(-90)){
    assert(item.title!==s.title,'REPEATED_90_DAY_TITLE:'+date+':'+s.hourKst);
    assert(dice(item.title,s.title)<.73,'SIMILAR_90_DAY_TITLE:'+date+':'+s.hourKst);
    assert(dice(item.lifeSituation,s.lifeSituation)<.76,
      'SIMILAR_90_DAY_SITUATION:'+date+':'+s.hourKst);
   }
   list.push(s);records.set(s.hourKst,list);
  }
 }
 console.log('PASS_112_DAYS_784_ORIGINAL_LIFESTYLE_BRIEFS_WITH_90_DAY_GUARD');
}
if(argv['self-test']==='true'){checkedAcrossDays();process.exit(0)}
const date=argv.target, result=build(date);
const dir=path.join(STAGING,'automation/social/lifestyle-pilot/daily-images');
fs.mkdirSync(dir,{recursive:true});
const file=path.join(dir,date.replaceAll('-','')+'.json');
if(fs.existsSync(file)){
 const prior=JSON.parse(fs.readFileSync(file,'utf8'));
 assert(JSON.stringify(prior)===JSON.stringify(result),
  'EXISTING_DATED_BRIEF_REQUIRES_HUMAN_REVIEW:'+file);
 console.log('LIFESTYLE_ALREADY_PREPARED_NO_OVERWRITE '+date);
}else{
 fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');
 console.log('SEVEN_NEXT_DAY_LIFESTYLE_BRIEFS_PREPARED '+date);
}
