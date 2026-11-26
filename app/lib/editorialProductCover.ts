import { PREMIUM_PRODUCT_PHOTOS } from "./premiumProductPhotos";
import { getCustomerProductCopy } from "./customerProductCopy";

/** Presentation only. Original licensed photography is reused; no product identifiers, prices or entitlements are changed. */
type Entry = {category:string;label:string;title:string;hook:string;photoId:string};
const EDITORIAL_COVERS: Readonly<Record<string,Entry>> = {
  "study-learning-strategy": {"category":"growth","label":"학업·성장운","title":"나에게 맞는 공부법","hook":"어떻게 해야 잘 배울까?","photoId":"study-learning-strategy"},
  "study-exam-preparation": {"category":"growth","label":"학업·성장운","title":"나의 시험운","hook":"시험 앞에서 흔들린다면","photoId":"study-exam-preparation"},
  "study-focus-routine": {"category":"growth","label":"학업·성장운","title":"집중하는 힘","hook":"왜 자꾸 딴생각이 날까?","photoId":"study-focus-routine"},
  "study-credential-decision": {"category":"growth","label":"학업·성장운","title":"자격증 도전","hook":"지금 시작해도 좋을까?","photoId":"study-credential-decision"},
  "business-startup-readiness": {"category":"business","label":"사업운","title":"나의 창업운","hook":"어떤 시작이 나와 맞을까?","photoId":"business-startup-readiness"},
  "business-expansion-control": {"category":"business","label":"사업운","title":"사업을 넓힐 때","hook":"지금 더 키워도 좋을까?","photoId":"business-expansion-control"},
  "business-client-relationship": {"category":"business","label":"사업운","title":"고객과의 인연","hook":"오래 믿고 찾는 관계","photoId":"business-client-relationship"},
  "business-team-management": {"category":"business","label":"사업운","title":"함께 일하는 사람들","hook":"우리 팀은 어떻게 맞춰갈까?","photoId":"business-team-management"},
  "health-energy-recovery": {"category":"health","label":"건강운","title":"나의 휴식법","hook":"지친 하루, 어떻게 쉴까?","photoId":"health-energy-recovery"},
  "health-sleep-rhythm": {"category":"health","label":"건강운","title":"편안한 잠","hook":"나에게 맞는 생활 리듬","photoId":"health-sleep-rhythm"},
  "health-stress-regulation": {"category":"health","label":"건강운","title":"마음의 여유","hook":"답답한 마음을 쉬게 하려면","photoId":"health-stress-regulation"},
  "health-burnout-risk": {"category":"health","label":"건강운","title":"지친 몸과 마음","hook":"나를 돌봐야 할 순간","photoId":"health-burnout-risk"},
  "health-habit-continuity": {"category":"health","label":"건강운","title":"좋은 생활 습관","hook":"꾸준히 이어가는 나만의 방법","photoId":"health-habit-continuity"},
  "health-body-signal-review": {"category":"health","label":"건강운","title":"몸의 작은 신호","hook":"불편할 때 살펴볼 이야기","photoId":"health-body-signal-review"},
  "career": {"category":"career","label":"직업운","title":"나의 직업운","hook":"나에게 어울리는 일은?","photoId":"career"},
  "career-job-change": {"category":"career","label":"직업운","title":"이직 고민","hook":"새로운 직장이 나와 맞을까?","photoId":"career-job-change"},
  "career-job-fit": {"category":"career","label":"직업운","title":"나에게 맞는 일","hook":"어떤 일에서 빛날까?","photoId":"career-job-fit"},
  "career-specialization": {"category":"career","label":"직업운","title":"나만의 강점","hook":"어떤 분야를 더 깊게 배울까?","photoId":"career-specialization"},
  "career-promotion-readiness": {"category":"career","label":"직업운","title":"승진과 성장","hook":"더 큰 역할을 맡는다면","photoId":"career-promotion-readiness"},
  "career-workplace-adaptation": {"category":"career","label":"직업운","title":"새 직장에 적응하기","hook":"낯선 곳에서 편해지는 법","photoId":"career-workplace-adaptation"},
  "career-leadership-readiness": {"category":"career","label":"직업운","title":"사람을 이끄는 힘","hook":"나는 어떤 리더일까?","photoId":"career-leadership-readiness"},
  "career-freelance-transition": {"category":"career","label":"직업운","title":"혼자 일하는 삶","hook":"프리랜서가 나와 맞을까?","photoId":"career-freelance-transition"},
  "career-workload-recovery": {"category":"career","label":"직업운","title":"일에 지쳤을 때","hook":"다시 힘을 얻으려면","photoId":"career-workload-recovery"},
  "career-workplace-relationships": {"category":"career","label":"직업운","title":"직장 사람들과 나","hook":"왜 자꾸 말이 엇갈릴까?","photoId":"career-workplace-relationships"},
  "relationship-friendship": {"category":"social","label":"대인관계운","title":"나의 친구 관계","hook":"오래 마음이 통하는 친구","photoId":"relationship-friendship"},
  "relationship-family-role": {"category":"social","label":"대인관계운","title":"가족과 나","hook":"가족도 내 마음을 알까?","photoId":"relationship-family-role"},
  "social-helper": {"category":"social","label":"대인관계운","title":"도움과 믿음","hook":"누구와 마음을 나눌까?","photoId":"social-helper"},
  "social-conflict": {"category":"social","label":"대인관계운","title":"사람 사이의 오해","hook":"비슷한 갈등이 반복된다면","photoId":"social-conflict"},
  "social-network-expansion": {"category":"social","label":"대인관계운","title":"새로운 만남","hook":"나에게 편안한 관계는?","photoId":"social-network-expansion"},
  "relationship": {"category":"relationship","label":"연애운","title":"나의 연애운","hook":"내 사랑은 어떤 모습일까?","photoId":"relationship"},
  "relationship-long-distance": {"category":"relationship","label":"연애운","title":"멀리 있는 사랑","hook":"떨어져도 마음이 통할까?","photoId":"relationship-long-distance"},
  "relationship-unrequited": {"category":"relationship","label":"연애운","title":"짝사랑의 마음","hook":"내 마음을 어떻게 전할까?","photoId":"relationship-unrequited"},
  "relationship-current": {"category":"relationship","label":"연애운","title":"지금의 사랑","hook":"우리 마음은 잘 맞을까?","photoId":"relationship-current"},
  "relationship-new-connection": {"category":"relationship","label":"연애운","title":"새로운 인연","hook":"어떤 만남이 나와 맞을까?","photoId":"relationship-new-connection"},
  "relationship-marriage": {"category":"relationship","label":"연애운","title":"나의 결혼운","hook":"함께 살아가는 두 사람","photoId":"relationship-marriage"},
  "relationship-partner-pattern": {"category":"relationship","label":"연애운","title":"내가 끌리는 사람","hook":"왜 이런 인연에 마음이 갈까?","photoId":"relationship-partner-pattern"},
  "relationship-conflict": {"category":"relationship","label":"연애운","title":"반복되는 말다툼","hook":"서운한 마음을 풀려면","photoId":"relationship-conflict"},
  "relationship-boundary": {"category":"relationship","label":"연애운","title":"사랑과 나만의 시간","hook":"서로 편한 거리를 찾기","photoId":"relationship-boundary"},
  "relationship-reunion": {"category":"relationship","label":"연애운","title":"다시 만나고 싶을 때","hook":"지난 사랑을 돌아보는 시간","photoId":"relationship-reunion"},
  "relationship-intimacy": {"category":"relationship","label":"연애운","title":"마음을 여는 속도","hook":"가까워지는 나만의 방식","photoId":"relationship-intimacy"},
  "monthly-current": {"category":"period","label":"기간별 운세","title":"이번 달 운세","hook":"이번 달, 눈여겨볼 이야기","photoId":"monthly-current"},
  "monthly-next": {"category":"period","label":"기간별 운세","title":"다음 달 운세","hook":"미리 챙겨보는 다음 달","photoId":"monthly-next"},
  "yearly-current": {"category":"period","label":"기간별 운세","title":"올해의 운세","hook":"올 한 해 나의 흐름","photoId":"yearly-current"},
  "annual-next": {"category":"period","label":"기간별 운세","title":"내년의 운세","hook":"새로운 해를 맞이하며","photoId":"annual-next"},
  "annual-3years": {"category":"period","label":"기간별 운세","title":"앞으로 3년 운세","hook":"해마다 달라지는 나의 흐름","photoId":"annual-3years"},
  "daeun-current": {"category":"period","label":"기간별 운세","title":"나의 큰 운의 흐름","hook":"지금 지나가는 인생의 시기","photoId":"daeun-current"},
  "lifetime-overview": {"category":"period","label":"기간별 운세","title":"나의 평생운","hook":"한눈에 보는 인생 이야기","photoId":"lifetime-overview"},
  "compatibility-romantic": {"category":"compatibility","label":"궁합","title":"연인·배우자 궁합","hook":"우리 마음은 어떻게 맞을까?","photoId":"relationship-current"},
  "compatibility-workplace": {"category":"compatibility","label":"궁합","title":"직장·동료 궁합","hook":"함께 일할 때 서로의 모습","photoId":"career-workplace-relationships"},
  "compatibility-friend": {"category":"compatibility","label":"궁합","title":"친구·지인 궁합","hook":"오래 편안한 친구 사이","photoId":"relationship-friendship"},
  "compatibility-business": {"category":"compatibility","label":"궁합","title":"사업·동업 궁합","hook":"같은 꿈을 꾸는 두 사람","photoId":"business-team-management"},
  "compatibility-family-parent-child": {"category":"compatibility","label":"궁합","title":"부모·자녀 궁합","hook":"서로 다른 마음을 이해하기","photoId":"relationship-family-role"},
  "compatibility-family-siblings": {"category":"compatibility","label":"궁합","title":"형제·자매 궁합","hook":"가깝지만 다른 우리 마음","photoId":"relationship-family-role"},
  "compatibility-family-other": {"category":"compatibility","label":"궁합","title":"기타 가족 궁합","hook":"서로 부담 없이 지내는 법","photoId":"relationship-family-role"},
  "compatibility-family": {"category":"compatibility","label":"궁합","title":"가족 궁합","hook":"가족의 마음을 알아보는 시간","photoId":"relationship-family-role"},
};
export function getEditorialProductCover(productId:string) {
  if(!Object.prototype.hasOwnProperty.call(EDITORIAL_COVERS, productId)) return undefined;
  const entry=EDITORIAL_COVERS[productId];
  const photo=PREMIUM_PRODUCT_PHOTOS[entry.photoId];
  if(!photo) return undefined;
  return {...entry, photo, intro:getCustomerProductCopy(productId)?.description ?? entry.hook};
}
