// UNBODA lifestyle-first video editorial planner.
// Returns ORIGINAL STORYBOARD CANDIDATES, never a final publish-approved asset.
// Every candidate requires unique 90-day similarity review, licensed real motion,
// natural Korean voice QA, captions/rights and final human sign-off.
export const SLOT_THEMES=Object.freeze({
 "08:00":{category:"직장·하루의 선택",situations:[
  ["출근길에 이미 기운이 빠지는 날","일이 많은 게 아니라 마음에 걸리는 게 있는 건 아닐까요?","환경과 일하는 방식의 궁합을 돌아보는 질문"],
  ["회의에서 말을 삼키는 순간","말하고 싶은데 자꾸 눈치를 보게 되는 이유는 뭘까요?","표현 방식의 차이를 살피는 관점"],
  ["이직을 고민하는 월요일","회사를 옮기면 정말 마음이 편해질까요?","성향과 현실적인 준비를 함께 살펴보기"],
  ["잘해야 한다는 부담이 큰 날","아무도 뭐라 하지 않았는데 왜 혼자 불안할까요?","내가 중요하게 여기는 기준 알아보기"]
 ]},
 "12:00":{category:"연애·사람 사이",situations:[
  ["연락 빈도 때문에 서운할 때","답장은 오는데 왜 마음은 자꾸 불안할까요?","연락 방식과 기대 차이 생각해 보기"],
  ["친구와 약속 후 지친 날","좋아하는 사람을 만나고도 왜 에너지가 다할까요?","혼자만의 시간이 필요한 성향 이해하기"],
  ["상대가 마음을 잘 표현하지 않을 때","사랑한다는데 왜 서운함은 남을까요?","감정을 표현하는 방식의 차이"],
  ["가까운 사이에서 자주 다툴 때","같은 말인데 왜 서로 다르게 받아들일까요?","상황과 관계의 리듬 돌아보기"]
 ]},
 "20:00":{category:"돈·진로·생활습관",situations:[
  ["월급날 이후 통장이 빨리 비는 때","돈을 버는데도 왜 항상 남는 게 없을까요?","습관을 살피고 작은 예산부터 정하기"],
  ["퇴근 후 아무것도 하기 싫을 때","쉬고 있는데 왜 쉬었다는 기분이 안 들까요?","생활 리듬과 회복 방식 살펴보기"],
  ["새로운 일을 시작하기 두려울 때","정답이 없을 때 무엇부터 결정해야 할까요?","내 성향과 준비 상황 나눠 보기"],
  ["사고 싶은 물건을 망설일 때","갖고 싶은 마음과 필요한 마음은 어떻게 다를까요?","선택을 늦추고 기준 정하기"]
 ]},
 "00:00":{category:"가족·감정·자기 이해",situations:[
  ["잠들기 전 하루를 복기하는 밤","별일 없던 하루인데 왜 마음은 무거울까요?","오늘 느낀 감정을 한 가지 써 보기"],
  ["가족과 대화가 어긋났을 때","좋은 뜻으로 한 말이 왜 서운하게 들릴까요?","서로의 방식이 다를 수 있다는 시선"],
  ["다른 사람과 비교하는 밤","나만 제자리인 것 같은 날엔 뭘 봐야 할까요?","나의 속도와 선택의 이유 돌아보기"],
  ["힘든 마음을 숨기는 습관","괜찮다고 말하면서 왜 속으로는 힘들까요?","내가 편안한 소통 방식 찾아보기"]
 ]}
});
export const FOUR_KST_TIMES=Object.freeze(["00:00","08:00","12:00","20:00"]);
const FORBIDDEN=/용신|지장간|십성|격국|대운이 바뀌면|당첨 확정|무조건 대박|절대 헤어져|100% 맞|미래를 보장/i;
function localDate(ms){
 return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(ms);
}
export function planLifestyleVideoCandidate({atMs,usedTopicKeys=new Set()}={}){
 if(!Number.isFinite(atMs))throw Error("SCHEDULE_TIMESTAMP_REQUIRED");
 const local=localDate(atMs),slot=local.slice(11,16);
 if(!FOUR_KST_TIMES.includes(slot))return {state:"BLOCKED",reason:"NOT_FIXED_KST_VIDEO_SLOT"};
 if(!(usedTopicKeys instanceof Set))throw Error("DEDUP_SET_REQUIRED");
 const category=SLOT_THEMES[slot],items=category.situations;
 const day=Math.floor((atMs+9*3600000)/86400000);
 const start=((day*7+Number(slot.slice(0,2)))%items.length+items.length)%items.length;
 const picked=items.find((it,i)=>!usedTopicKeys.has(slot+":"+((start+i)%items.length).toString()));
 if(!picked)return {state:"BLOCKED",reason:"NO_UNUSED_LIFESTYLE_TOPIC"};
 const index=items.indexOf(picked);
 const [situation,hook,reflection]=picked;
 const script=[
   hook,
   "이럴 땐 먼저 실제 상황과 내 마음이 어땠는지 돌아보세요.",
   reflection+"도 도움이 될 수 있습니다.",
   "사주는 성향을 돌아보는 하나의 전통적 관점일 뿐, 미래를 확정하지는 않아요."
 ];
 const combined=script.join(" ");
 if(FORBIDDEN.test(combined)||/무조건|반드시 성공/.test(combined))return {state:"BLOCKED",reason:"UNSAFE_STORYBOARD_LANGUAGE"};
 return Object.freeze({
  state:"CANDIDATE_ONLY",slotKst:local,topicKey:slot+":"+index,
  theme:category.category,situation,hook,narrationDraft:script,
  suggestedSceneTypes:["움직이는 생활 장면","표정 또는 상황의 변화","해결 실마리","짧은 자기 이해 메시지"],
  format:{seconds:30,width:1080,height:1920,requiredOriginalMotion:true,requiredNaturalKoreanVoice:true},
  sajuAsPerspectiveOnly:true,siteAdDominant:false,
  notForPublication:true,commercialVideoRightsVerified:false,
  koreanVoiceHumanReviewed:false,remoteNinetyDaySimilarityVerified:false,
  publishingRequiresTwoExplicitChannels:true
 });
}
