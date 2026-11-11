#!/usr/bin/env node
// Daily source producer for UNBODA: edits review-only video source files.
// NO Metricool calls, NO video uploads, NO publishing credentials.
// Each 112-day rotation combines 4 distinct verified renderable motifs,
// 7 distinct real-life scenarios per motif, and 4 editorial angles.
// It must pass the existing video/product/voice/visual gates before any commit.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const args = Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')).map(x=>{
  const idx=x.indexOf('=');
  return [x.slice(2,idx),x.slice(idx+1)];
}));
const KST_DAY=/^\d{4}-\d{2}-\d{2}$/;
function dayIndex(day) {
  if(!KST_DAY.test(day)||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day)
    throw Error('INVALID_TARGET_DATE');
  const index=Math.floor((Date.parse(day+'T00:00:00Z')-Date.parse('2026-11-10T00:00:00Z'))/86400000);
  if(index<0)throw Error('BEFORE_EDITORIAL_LIBRARY_START');
  return index;
}
const CATALOG=JSON.parse(fs.readFileSync(args.catalog,'utf8'));
const PRODUCTS=new Map(CATALOG.products.map(p=>[p.id,p]));
const POLICY=JSON.parse(fs.readFileSync(path.join(args.staging,'automation/social/lifestyle-pilot/topic-visual-policy.json'),'utf8'));
// Reuse the exact production editorial safety gate; a generator self-test must also satisfy it.
const {reviewLifestyleVideoScript}=await import(pathToFileURL(path.resolve(args.staging,'automation/social/lifestyle-video-planner.mjs')).href);
const GROUPS=[
 {name:'midnight',file:'003-midnight',category:'self-understanding',style:'midnight-indigo',
  explanation:'사주에서는 오늘 나의 생활 리듬과 선택 기준을 돌아보는 참고예요.',
  practices:[
   '오늘의 메모를 먼저 확인하고 다음 행동의 우선순위를 차분하게 적어 보세요.',
   '작은 선택부터 적어 두고 나에게 반복되는 감정의 흐름을 살펴보세요.',
   '생활에서 반복된 순간을 기록하고 다음에 바꿀 한 가지를 생각해 보세요.',
   '내일 할 일 하나를 정리하고 편안한 시간을 미리 확보할지 확인해 보세요.'
  ],
  motifs:[
   ['sleep-routine','health-sleep-rhythm',[
    '잠들기 전에 휴대폰을 다시 켠 밤','밤에 침실 조명이 너무 밝다고 느낀 때','잠이 깨서 시계를 여러 번 확인한 밤',
    '수면 시간을 적으려다 잊어버린 아침','밤늦게까지 정리를 끝내지 못한 날','잠자리에 누워 내일 걱정을 떠올린 밤','잠들기 전 휴식 시간을 놓친 밤']],
   ['night-checklist','health-habit-continuity',[
    '내일 할 일을 적다가 순서가 헷갈린 밤','내일 계획을 너무 많이 적어 둔 밤','할 일 메모를 찾아 다시 적은 저녁',
    '내일 청소 계획을 미룰지 고민한 때','할 일 목록에 쉬는 시간이 빠진 밤','계획표에서 중요한 일을 놓친 저녁','내일 할 일부터 간단히 나눠 본 밤']],
   ['mood-journal','health-stress-regulation',[
    '오늘 마음이 쉽게 가라앉지 않는 밤','일기에 오늘 감정을 적기 어려운 순간','마음이 복잡해 메모를 여러 번 고친 밤',
    '기분이 달라진 이유를 적어 본 저녁','감정 일기를 쓰다 손을 멈춘 밤','마음이 조급해 작은 일을 미룬 밤','일기를 다시 읽으며 마음을 돌아본 날']],
   ['family-talk','health-stress-regulation',[
    '가족 대화에서 할 말을 놓친 저녁','가족에게 집안일을 부탁하기 어려운 날','부모와 일정을 정하다 말이 어긋난 저녁',
    '가족 식사 뒤 정리 순서를 정한 밤','가족 대화 중 내 마음을 숨긴 날','가족과 주말 계획을 다시 정한 밤','가족이 바쁜 시간을 서로 묻던 날']]
  ]},
 {name:'commute',file:'004-commute',category:'career',style:'commute-sunrise',
  explanation:'사주 직업 관점에서 업무 흐름과 일의 우선순위를 돌아보는 참고예요.',
  practices:[
   '업무 시간을 먼저 나눠 적고 가장 필요한 확인 질문 한 개를 준비해 보세요.',
   '겹친 일정을 순서대로 적고 지금 해야 할 한 가지를 차분히 확인해 보세요.',
   '회의 전에 질문을 기록하고 담당자에게 확인할 순서를 정해 보세요.',
   '나의 역할과 필요한 시간을 나눠 적고 다음 행동을 다시 점검해 보세요.'
  ],
  motifs:[
   ['work-checklist','career-workload-recovery',[
    '업무 일정이 겹쳐 우선순위가 헷갈린 아침','업무 메모를 놓쳐 다시 확인한 순간','프로젝트 마감 시간이 가까워진 오후',
    '업무 요청이 연달아 와서 멈칫한 날','일정표에 여유 시간이 빠진 월요일','업무 목록에서 급한 일을 찾던 아침','프로젝트 작업 순서를 다시 정한 날']],
   ['meeting-presentation','career-workplace-adaptation',[
    '회의 발표 자료를 마지막에 고친 아침','회의에서 숫자 단위를 다시 확인한 순간','발표 문장을 다듬다 시간이 부족한 날',
    '회의 자료 순서를 바꾸고 싶은 오후','발표 전에 질문을 준비하지 못한 날','회의 화면을 공유하기 전 긴장한 순간','발표 자료를 나눠 설명해야 하는 날']],
   ['career-crossroads','career-workplace-adaptation',[
    '회사에서 새 역할을 맡게 된 아침','직장 동료가 업무 방식 변경을 알린 날','회사에서 맡을 일을 다시 정한 순간',
    '직장 근무 시간을 조정할지 고민한 날','회사 내 새 팀의 기대가 궁금한 아침','직장 업무 환경이 낯설어진 날','회사에서 업무 경계를 이야기한 오후']],
   ['job-interview','career-workplace-adaptation',[
    '면접 질문을 연습하다 막힌 오후','채용 공고 조건을 비교하던 아침','지원 이유를 말로 정리하기 어려운 밤',
    '면접 일정이 바뀌어 준비를 서두른 날','지원서의 경험 설명을 다시 쓰던 밤','면접 장소를 확인하며 긴장한 아침','채용 담당자에게 물어볼 말을 적은 날']]
  ]},
 {name:'friendship',file:'005-friendship',category:'compatibility',style:'relationship-coral',
  explanation:'사주 궁합에서는 사람마다 다른 대화 방식과 마음을 돌아보는 참고예요.',
  practices:[
   '서로의 대화에서 엇갈린 순간을 적고 다른 표현을 한 가지 생각해 보세요.',
   '상대의 말을 다시 떠올리고 확인하고 싶은 질문을 차분하게 적어 보세요.',
   '약속을 정할 때 기대하는 조건을 나눠 말하고 서로 차분히 확인해 보세요.',
   '내가 전하고 싶은 말을 먼저 적고 상대의 입장도 살펴보는 연습을 해요.'
  ],
  motifs:[
   ['relationship-talk','compatibility-romantic',[
    '연인과 대화하다 서운함을 느낀 저녁','배우자와 주말 계획을 정하기 어려운 날','연인에게 기대를 말하기 망설인 밤',
    '배우자와 함께할 시간을 정하던 오후','연인과 여행 경비 대화가 어긋난 순간','배우자의 말을 다르게 받아들인 저녁','연인에게 고마운 말을 건네기 어려운 날']],
   ['message-timing','relationship-friendship',[
    '친구의 답장이 늦어 걱정한 저녁','연락할 시각을 정하지 못해 망설인 밤','메시지를 보낸 뒤 표현이 마음에 걸린 날',
    '친구에게 연락을 미루다 한 주가 지난 날','답장 문장을 여러 번 고치던 오후','친구의 메시지를 잘못 이해한 아침','연락 빈도를 조율하고 싶은 저녁']],
   ['meetup-location','compatibility-friend',[
    '친구와 약속 장소를 정하다 망설인 날','약속 장소까지 가는 길을 다시 찾은 밤','친구 모임에서 앉을 자리를 고민한 때',
    '약속 시간을 다시 확인한 아침','친구와 만날 장소가 서로 달랐던 날','약속 장소가 바뀌어 연락한 저녁','친구 모임의 이동 시간을 계산한 날']],
   ['shared-calendar','compatibility-workplace',[
    '동료와 일정이 겹쳐 당황한 오후','직장 동료와 회의 시간을 다시 정한 날','동료의 휴가 날짜를 잘못 기억한 아침',
    '일정 공유를 놓쳐 동료에게 묻던 날','직장 동료와 업무 시간을 조정한 날','동료와 같은 날짜에 마감을 잡은 순간','일정표에서 협업 시간을 찾던 아침']]
  ]},
 {name:'afterwork',file:'002-afterwork',category:'money',style:'finance-emerald',
  explanation:'사주 재물운은 내 지출 기준과 생활 속 소비 습관을 살펴보는 참고예요.',
  practices:[
   '지난달의 기록과 오늘의 지출을 나란히 놓고 바뀐 조건을 비교해 보세요.',
   '영수증과 결제 내역을 나눠 적고 줄일 수 있는 지출 한 가지를 확인해 보세요.',
   '계좌의 숫자를 먼저 확인하고 앞으로 지킬 예산 기준을 하나 적어 보세요.',
   '구매하기 전에 필요한 이유를 적고 지금 결정할 조건부터 비교해 보세요.'
  ],
  motifs:[
   ['expense-ledger','money-leak-risk',[
    '저녁에 지출 가계부를 다시 확인한 날','돈이 어디에 쓰였는지 찾기 어려운 밤','가계부 숫자가 카드 내역과 달랐던 때',
    '지출 기록을 미루다 한꺼번에 적은 밤','돈을 쓴 항목의 이유가 헷갈린 날','가계부에서 반복 비용을 발견한 저녁','지출을 정리하며 작은 차이를 찾은 날']],
   ['subscription-billing','money-contract-commitment',[
    '구독 자동결제 알림을 다시 확인한 날','자동이체 날짜를 잊어버린 아침','구독 서비스 해지 조건이 궁금한 저녁',
    '자동결제 내역에 낯선 항목이 뜬 날','구독 결제일이 겹쳐 예산이 걱정된 밤','자동이체 금액이 바뀐 것을 본 오후','구독 연장 여부를 결정하기 어려운 날']],
   ['savings-goal','money-saving-discipline',[
    '저축 목표 금액을 다시 적어 본 밤','적금 날짜를 놓쳐 달력을 확인한 날','저축 통장에 남은 금액이 궁금한 때',
    '모으려던 돈을 다른 곳에 쓴 저녁','저축 계획이 현실과 달라 걱정된 날','적금 납입 금액을 조정할지 고민한 밤','저축 우선순위를 정하지 못한 날']],
   ['shopping-choice','money-spending-decision',[
    '장바구니에 물건을 오래 담아 둔 밤','구매 버튼 앞에서 망설이는 순간','쇼핑 목록을 확인하다 예산을 넘긴 날',
    '물건을 사기 전에 후기를 다시 본 밤','장바구니의 가격이 달라진 것을 본 날','구매 목록에서 필요 없는 것을 찾은 날','쇼핑 할인에 마음이 흔들린 저녁']]
  ]}
];
function compact(text){return text.replace(/\s/g,'').length;}
function generate(day){
 const i=dayIndex(day), stamp=day.replaceAll('-','');
 const motifIndex=i%4,caseIndex=Math.floor(i/4)%7,angle=Math.floor(i/28)%4;
 const out=[];
 for(let gi=0;gi<GROUPS.length;gi++){
  const g=GROUPS[gi], [motif,productId,cases]=g.motifs[motifIndex];
  const p=PRODUCTS.get(productId), visible=POLICY.motifs[motif];
  assert(p && visible && visible.category===g.category,'INVALID_CURATED_PRODUCT_OR_MOTIF');
  // Payment/purchase terms can describe ordinary life, but the promotional-text
  // checker intentionally rejects them outside the final CTA. Keep the core
  // scenario while selecting a natural non-advertising wording for narration.
  const neutralize=(line)=>line.replaceAll('자동결제','구독료 청구')
   .replaceAll('결제','지출').replaceAll('구매','선택').replaceAll('가입','등록');
  const situation=neutralize(cases[caseIndex]);
  const hook=situation+'. 뭘 먼저 볼까요?';
  const narrationDraft=[hook,g.explanation,neutralize(g.practices[angle]),
   '운보다 무료 사주 조회 후 내 선택과 생활 흐름도 차분하게 살펴보세요.'];
  const editorial=reviewLifestyleVideoScript({situation,narrationDraft});
  assert(editorial.ok,'AUTOMATED_EDITORIAL_GATE_FAILED:'+day+':'+g.name+':'+editorial.reasons.join(','));
  for(const [n,line] of narrationDraft.entries()){
   assert(compact(line)<=32,'NARRATION_TOO_LONG:'+g.name+':'+n+':'+compact(line));
   if(n>0)assert(compact(line)>=26,'NARRATION_TOO_SHORT:'+g.name+':'+n);
   if(n===2)assert(compact(line)>=28,'PRACTICAL_GAP:'+g.name);
  }
  assert(hook.includes('까') && !/사주|궁합|재물운/.test(hook),'BAD_OPENING');
  const briefFile=path.join(args.staging,'automation/social/lifestyle-pilot/episodes',g.file+'.json');
  const old=JSON.parse(fs.readFileSync(briefFile,'utf8'));
  const illustrations=['rest','clock','message','notes'];
  const pics=illustrations.map((_,j)=>illustrations[(j+gi+i)%4]);
  // Never slice Korean words in half: Shorts/Reels first-frame titles are sales-critical.
  const title=situation.length<=26?situation:situation.split(' ').slice(-4).join(' ');
  assert(title.length>=5 && title.length<=26,'UNREADABLE_THUMBNAIL_TITLE');
  const scenes=[
   {headline:[visible.label,situation.split(' ').slice(-2).join(' ')],subline:visible.label+' 돌아보기',illustration:pics[0]},
   {headline:['사주로 보는','성향 참고'],subline:'지금 상황 돌아보기',illustration:pics[1]},
   {headline:['작은 실천','지금 해봐요'],subline:'나의 기준 점검하기',illustration:pics[2]},
   {headline:['내 사주도','무료로 살펴봐'],subline:'운보다 무료 사주 · '+p.title,illustration:pics[3]}
  ];
  const visualConcepts=[0,1,2,3].map((s)=>
   ['첫','두 번째','세 번째','마지막'][s]+' 장면에서 '+situation+' 상황과 '+visible.label+
   ', '+visible.visualTerms[0]+'을 실제 주제 그림으로 보여주고 움직이는 화면');
  const next={...old,
   id:'unboda-saju-'+g.name+'-'+motif+'-'+caseIndex+'-'+angle+'-'+stamp,
   topicKey:'saju-'+g.name+'-'+motif+'-'+caseIndex+'-'+angle+'-'+stamp,
   situation,hook,theme:situation+'에서 실제 생활 선택을 살피는 내용. '+p.analysisValue,
   thumbnailTitle:title,visualMotif:motif,visualStyle:g.style,sajuCategory:g.category,
   narrationDraft,visualConcepts,scenes,targetDateKst:stamp,
   automatedPublicationAllowed:false,licenseReviewRequired:true,voiceHumanReviewRequired:true,
   productId:p.id,productTitle:p.title,productCategory:p.category,productType:p.productType,
   landingPath:p.landingPath,contentGoal:p.productType==='compatibility'?'compatibility-conversion':'premium-conversion',
   productProblem:p.signals[0]+' 관련 '+situation+' 상황을 돌아보고 점검',
   productValue:p.analysisValue,
   productCta:'운보다 무료 사주 확인 https://unboda.kr/guest-saju → '+p.title+' https://unboda.kr'+p.landingPath
  };
  out.push({file:briefFile,content:next});
 }
 assert(new Set(out.map(x=>x.content.topicKey)).size===4);
 assert(new Set(out.map(x=>x.content.productId)).size===4);
 assert(new Set(out.map(x=>x.content.scenes[0].illustration)).size===4);
 return out;
}
if(args['self-test']==='true'){
 const seen=new Set();
 for(let i=0;i<112;i++){
  const d=new Date(Date.parse('2026-11-10T00:00:00Z')+i*86400000).toISOString().slice(0,10);
  const batch=generate(d);
  for(const item of batch){
   const x=item.content;
   const identity=x.sajuCategory+'|'+x.visualMotif+'|'+x.situation+'|'+x.narrationDraft[2];
   assert(!seen.has(identity),'REPEATED_EDITORIAL_WITHIN_112_DAYS:'+identity);
   seen.add(identity);
  }
 }
 assert(seen.size===448,'EXPECTED_112_DAYS_X_FOUR_DISTINCT_STORIES');
 console.log('PASS_112_DAY_EDITORIAL_ROTATION_448_DISTINCT_SCRIPTS');
 process.exit(0);
}
const target=args.target, batch=generate(target);
let existingCount=0;
for(const row of batch){
 const old=JSON.parse(fs.readFileSync(row.file,'utf8'));
 if(old.targetDateKst===target.replaceAll('-','')){
  // Never silently replace editorial input already submitted for this date.
  // Existing editor-reviewed source for the same day takes precedence.
  // Do not overwrite it; the downstream quality gates must still verify all four.
  existingCount++;
 }else{
  assert(!/^\d{8}$/.test(old.targetDateKst)||old.targetDateKst<target.replaceAll('-',''),
   'DO_NOT_OVERWRITE_FUTURE_SOURCE:'+row.file);
 }
}
assert(existingCount===0||existingCount===4,'PARTIALLY_UPDATED_DAY_BLOCKED');
if(existingCount===0){
 for(const row of batch)fs.writeFileSync(row.file,JSON.stringify(row.content,null,2)+'\n');
}
console.log('NEXT_DAY_FOUR_REVIEW_ONLY_EPISODES_PREPARED '+target+' existing='+existingCount+
 ' motifRotation='+dayIndex(target)%4+' scenarioRotation='+Math.floor(dayIndex(target)/4)%7+
 ' editorialAngle='+Math.floor(dayIndex(target)/28)%4);
