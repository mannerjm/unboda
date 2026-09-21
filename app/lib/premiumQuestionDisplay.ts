/**
 * Customer-facing question titles only. The AI's userQuestion, report scope,
 * purchase criteria, product identity and price remain unchanged.
 *
 * Keep this list complete for every currently launched STEP 2 topic and period.
 */
export const READABLE_PAID_QUESTIONS: Readonly<Record<string, string>> = {
  // 직업운
  "career": "지금 내 일을 어떻게 정리하면 좋을까요?",
  "career-job-change": "지금 이직을 준비해도 괜찮을까요?",
  "career-job-fit": "나에게 잘 맞는 일하는 방식은 무엇일까요?",
  "career-specialization": "어떤 분야의 전문성을 키우면 좋을까요?",
  "career-promotion-readiness": "더 큰 역할을 맡으려면 무엇을 준비해야 할까요?",
  "career-workplace-adaptation": "지금 직장에 어떻게 적응하면 좋을까요?",
  "career-leadership-readiness": "사람을 이끄는 역할을 어떻게 준비할까요?",
  "career-freelance-transition": "독립이나 프리랜서를 시작하려면 무엇이 필요할까요?",
  "career-workload-recovery": "일에 지치지 않으려면 무엇을 바꿔야 할까요?",
  "career-workplace-relationships": "직장 사람들과 어떻게 협력하면 좋을까요?",

  // 재물운
  "wealth": "지금 내 돈 관리를 어떻게 시작하면 좋을까요?",
  "money-wealth-accumulation": "돈이 들어와도 모이지 않는 이유는 무엇일까요?",
  "money-leak-risk": "새는 돈을 어떻게 찾아 줄일 수 있을까요?",
  "money-saving-discipline": "저축하는 습관을 어떻게 유지할까요?",
  "money-income-stability": "수입이 불안정할 때 무엇부터 점검할까요?",
  "money-debt-repayment": "빚을 갚을 때 무엇부터 살펴봐야 할까요?",
  "money-emergency-buffer": "갑자기 돈이 필요할 때 어떻게 대비할까요?",
  "money-shared-finance": "함께 쓰는 돈을 어떻게 나누고 관리할까요?",
  "money-contract-commitment": "오래 유지해야 하는 계약, 무엇부터 확인할까요?",
  "money-spending-decision": "큰돈을 쓰기 전에 무엇을 따져봐야 할까요?",

  // 연애운·대인관계운
  "relationship": "사람들과의 관계에서 무엇을 바꾸면 좋을까요?",
  "relationship-long-distance": "멀리 떨어져 있어도 관계를 잘 이어가려면?",
  "relationship-unrequited": "짝사랑하는 마음을 표현해도 괜찮을까요?",
  "relationship-current": "지금 관계를 계속 이어가도 괜찮을까요?",
  "relationship-marriage": "결혼을 생각할 때 무엇을 준비해야 할까요?",
  "relationship-partner-pattern": "나는 어떤 사람과 잘 맞는 편일까요?",
  "relationship-new-connection": "새로운 인연을 만나려면 어떻게 해야 할까요?",
  "relationship-intimacy": "가까워지는 속도를 어떻게 맞추면 좋을까요?",
  "relationship-conflict": "자꾸 반복되는 다툼을 어떻게 풀 수 있을까요?",
  "relationship-boundary": "관계에서 내 마음을 지키려면 어떻게 해야 할까요?",
  "relationship-reunion": "다시 연락하기 전에 무엇을 확인해야 할까요?",
  "relationship-friendship": "친구와의 관계를 어떻게 이어가면 좋을까요?",
  "relationship-family-role": "가족 안에서 내 부담을 어떻게 줄일 수 있을까요?",
  "social-helper": "어려울 때 누구에게 도움을 요청하면 좋을까요?",
  "social-conflict": "사람들과 반복되는 갈등을 어떻게 풀까요?",
  "social-network-expansion": "새로운 사람들과 어떻게 친해질 수 있을까요?",

  // 건강운: 생활 관찰 중심이며 진단·치료를 약속하지 않습니다.
  "health-energy-recovery": "지친 일상에서 쉬는 시간을 어떻게 챙길까요?",
  "health-sleep-rhythm": "잠자는 시간을 어떻게 규칙적으로 맞출까요?",
  "health-stress-regulation": "스트레스가 쌓일 때 어떻게 쉬어가면 좋을까요?",
  "health-burnout-risk": "몸과 마음이 지칠 때 무엇부터 줄여야 할까요?",
  "health-habit-continuity": "건강한 생활 습관을 어떻게 꾸준히 이어갈까요?",
  "health-body-signal-review": "몸의 불편함이 반복되면 무엇을 살펴봐야 할까요?",

  // 학업·성장운
  "study-learning-strategy": "나에게 맞는 공부 방법은 무엇일까요?",
  "study-exam-preparation": "시험을 어떻게 준비하면 좋을까요?",
  "study-focus-routine": "어떻게 하면 공부에 더 잘 집중할 수 있을까요?",
  "study-credential-decision": "지금 이 자격증에 도전해도 괜찮을까요?",

  // 사업운
  "business-startup-readiness": "사업을 시작하기 전에 무엇을 준비해야 할까요?",
  "business-expansion-control": "지금 사업 규모를 늘려도 괜찮을까요?",
  "business-client-relationship": "고객과 일을 할 때 무엇을 미리 정해야 할까요?",
  "business-team-management": "팀원들과 일을 어떻게 나누면 좋을까요?",

  // 시기별 운
  "monthly-current": "이번 달에는 무엇부터 챙기면 좋을까요?",
  "monthly-next": "다음 달을 위해 지금 무엇을 준비할까요?",
  "yearly-current": "올해는 무엇에 집중하면 좋을까요?",
  "annual-next": "내년을 위해 지금 무엇을 준비할까요?",
  "annual-3years": "앞으로 3년 동안 무엇을 준비하면 좋을까요?",
  "daeun-current": "지금 내 삶의 큰 흐름은 어떨까요?",
  "lifetime-overview": "내 인생에서 반복되는 흐름은 무엇일까요?",
};

export function getReadablePaidQuestion(productId: string, fallback: string): string {
  return READABLE_PAID_QUESTIONS[productId] ?? fallback;
}
