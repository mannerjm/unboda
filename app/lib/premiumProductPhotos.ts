/**
 * Curated, licensed photographic thumbnails for individual Launch product IDs.
 *
 * Keep photo IDs tied to products rather than categories: customers should be
 * able to tell "study method" apart from "exam preparation" at a glance.
 * Photos are licensed and now self-hosted under public/images/premium; the product analysis and
 * its actual results are not represented by the photographer or models.
 *
 * Pexels license: https://www.pexels.com/license/
 * Copyright / commercial usage: https://help.pexels.com/hc/en-us/articles/360042295214
 */
export type PremiumProductPhoto = {
  src: string;
  alt: string;
  sourcePage: string;
};

export const PREMIUM_PRODUCT_PHOTOS: Readonly<Record<string, PremiumProductPhoto>> = {
  "study-learning-strategy": {
    src: "/images/premium/study-learning-strategy.jpg",
    alt: "여러 학습 도구와 책을 펼쳐놓고 자신에게 맞는 공부 방법을 정리하는 모습",
    sourcePage: "https://www.pexels.com/photo/a-woman-writing-on-the-notebook-8055496/",
  },
  "study-exam-preparation": {
    src: "/images/premium/study-exam-preparation.jpg",
    alt: "시험지의 문항을 검토하고 답안을 작성하며 시험을 준비하는 모습",
    sourcePage: "https://www.pexels.com/photo/student-taking-exam-in-classroom-setting-31115182/",
  },
  "study-focus-routine": {
    src: "/images/premium/study-focus-routine.jpg",
    alt: "헤드폰을 착용하고 방해를 줄이며 공부에 집중하는 모습",
    sourcePage: "https://www.pexels.com/photo/man-wearing-black-crew-neck-t-shirt-using-black-headphones-reading-book-while-sitting-3466163/",
  },
  "study-credential-decision": {
    src: "/images/premium/study-credential-decision.jpg",
    alt: "빨간 리본으로 묶인 여러 장의 증서가 책상 위에 놓인 모습",
    sourcePage: "https://www.pexels.com/photo/close-up-photo-of-diploma-7942430/",
  },
  "business-startup-readiness": {
    src: "/images/premium/business-startup-readiness.jpg",
    alt: "창업 계획을 세우며 노트북과 자료를 정리하는 창업 준비자",
    sourcePage: "https://www.pexels.com/photo/a-man-looking-at-a-website-on-the-internet-7309483/",
  },
  "business-expansion-control": {
    src: "/images/premium/business-expansion-control.jpg",
    alt: "사업 성장 그래프를 보며 확장 계획을 논의하는 직장인들",
    sourcePage: "https://www.pexels.com/photo/business-partners-having-a-meeting-at-the-office-7433898/",
  },
  "business-client-relationship": {
    src: "/images/premium/business-client-relationship.jpg",
    alt: "고객과 계약을 논의하며 악수하는 업무 미팅",
    sourcePage: "https://www.pexels.com/photo/people-shaking-their-hands-in-close-deal-business-contract-8112180/",
  },
  "business-team-management": {
    src: "/images/premium/business-team-management.jpg",
    alt: "팀원들이 모여 함께 업무 계획을 논의하는 회의 장면",
    sourcePage: "https://www.pexels.com/photo/a-team-brainstorming-together-7495549/",
  },
  "health-energy-recovery": {
    src: "/images/premium/health-energy-recovery.jpg",
    alt: "따뜻한 차를 마시며 휴식을 취하고 에너지를 회복하는 여성",
    sourcePage: "https://www.pexels.com/photo/woman-enjoying-tea-in-a-bedroom-8329906/",
  },
  "health-sleep-rhythm": {
    src: "/images/premium/health-sleep-rhythm.jpg",
    alt: "알람 시계가 놓인 침실에서 편안히 잠든 여성",
    sourcePage: "https://www.pexels.com/photo/young-female-sleeping-on-bed-in-morning-7622514/",
  },
  "health-stress-regulation": {
    src: "/images/premium/health-stress-regulation.jpg",
    alt: "차분한 환경에서 명상하며 스트레스 반응을 조절하는 여성",
    sourcePage: "https://www.pexels.com/photo/photo-of-a-woman-meditating-8032834/",
  },
  "health-burnout-risk": {
    src: "/images/premium/health-burnout-risk.jpg",
    alt: "업무에 지쳐 노트북 앞에서 머리를 쉬고 있는 직장인",
    sourcePage: "https://www.pexels.com/photo/overworked-employee-lying-in-front-of-laptop-6837644/",
  },
  "health-habit-continuity": {
    src: "/images/premium/health-habit-continuity.jpg",
    alt: "물 섭취량과 일상 습관을 기록하며 생활 관리를 계획하는 손",
    sourcePage: "https://www.pexels.com/photo/nutritionist-filling-in-nutrition-plan-8844562/",
  },
  "health-body-signal-review": {
    src: "/images/premium/health-body-signal-review.jpg",
    alt: "집에서 스트레칭하며 몸의 변화를 살피는 여성",
    sourcePage: "https://www.pexels.com/photo/woman-doing-yoga-at-home-8173431/",
  },
  "wealth": {
    src: "/images/premium/wealth.jpg",
    alt: "전체적인 재물 흐름을 보여주는 여러 층의 금색과 은색 동전",
    sourcePage: "https://www.pexels.com/photo/stacks-of-silver-and-gold-coins-in-close-up-photography-10531120/",
  },
  "money-wealth-accumulation": {
    src: "/images/premium/money-wealth-accumulation.jpg",
    alt: "동전을 모은 유리병 안에서 새싹이 자라는 장면",
    sourcePage: "https://www.pexels.com/photo/close-up-shot-of-a-jar-with-coins-9755390/",
  },
  "money-leak-risk": {
    src: "/images/premium/money-leak-risk.jpg",
    alt: "동전과 가계부를 앞에 두고 머리를 짚으며 지출을 고민하는 사람",
    sourcePage: "https://www.pexels.com/photo/crop-pondering-man-analyzing-expenses-and-taking-notes-7063765/",
  },
  "money-saving-discipline": {
    src: "/images/premium/money-saving-discipline.jpg",
    alt: "계산기와 가계부, 현금으로 한 달 예산을 정리한 책상",
    sourcePage: "https://www.pexels.com/photo/white-notebook-on-the-table-5466798/",
  },
  "money-income-stability": {
    src: "/images/premium/money-income-stability.jpg",
    alt: "계산기 옆에서 들어온 수입을 세어보는 손",
    sourcePage: "https://www.pexels.com/photo/close-up-photo-of-a-person-counting-bank-notes-6266445/",
  },
  "money-debt-repayment": {
    src: "/images/premium/money-debt-repayment.jpg",
    alt: "납부서류를 확인하며 재정 부담을 고민하는 두 사람",
    sourcePage: "https://www.pexels.com/photo/a-couple-having-a-conversation-6964350/",
  },
  "money-emergency-buffer": {
    src: "/images/premium/money-emergency-buffer.jpg",
    alt: "만일의 상황에 대비해 현금을 유리병에 모아두는 손",
    sourcePage: "https://www.pexels.com/photo/close-up-shot-of-a-person-saving-money-in-the-glass-jar-7680483/",
  },
  "money-shared-finance": {
    src: "/images/premium/money-shared-finance.jpg",
    alt: "가계부와 청구서를 함께 확인하며 공동 지출을 논의하는 커플",
    sourcePage: "https://www.pexels.com/photo/couple-looking-at-their-bills-6964105/",
  },
  "money-contract-commitment": {
    src: "/images/premium/money-contract-commitment.jpg",
    alt: "펜으로 계약서에 서명하는 손을 가까이에서 촬영한 장면",
    sourcePage: "https://www.pexels.com/photo/a-person-signing-a-contract-8815849/",
  },
  "money-spending-decision": {
    src: "/images/premium/money-spending-decision.jpg",
    alt: "신용카드를 들고 온라인 구매 여부를 고민하는 사람",
    sourcePage: "https://www.pexels.com/photo/pensive-ethnic-shopper-with-debit-card-and-laptop-on-bed-6347709/",
  },
  "career": {
    src: "/images/premium/career.jpg",
    alt: "팀원들이 업무 계획과 책임을 논의하는 직장 회의 장면",
    sourcePage: "https://www.pexels.com/photo/employees-having-a-meeting-at-the-office-7433835/",
  },
  "career-job-change": {
    src: "/images/premium/career-job-change.jpg",
    alt: "지원자가 담당자와 면접을 진행하며 이직 기회를 살펴보는 모습",
    sourcePage: "https://www.pexels.com/photo/professional-man-interviewing-an-applicant-5668863/",
  },
  "career-job-fit": {
    src: "/images/premium/career-job-fit.jpg",
    alt: "사무실에서 서류를 검토하며 자신의 업무에 집중하는 직장인",
    sourcePage: "https://www.pexels.com/photo/man-working-on-laptop-in-an-office-9052865/",
  },
  "career-specialization": {
    src: "/images/premium/career-specialization.jpg",
    alt: "전문 기술을 배우기 위해 책과 자료를 공부하는 사람",
    sourcePage: "https://www.pexels.com/photo/close-up-shot-of-a-person-studying-8553892/",
  },
  "career-promotion-readiness": {
    src: "/images/premium/career-promotion-readiness.jpg",
    alt: "성과 그래프를 함께 검토하며 다음 역할을 준비하는 장면",
    sourcePage: "https://www.pexels.com/photo/close-up-photo-person-pointing-at-a-statistical-graph-in-a-clipboard-6592681/",
  },
  "career-workplace-adaptation": {
    src: "/images/premium/career-workplace-adaptation.jpg",
    alt: "새로운 직장 환경에서 동료들과 협업하는 직원들의 모습",
    sourcePage: "https://www.pexels.com/photo/coworkers-at-meeting-in-office-6147027/",
  },
  "career-leadership-readiness": {
    src: "/images/premium/career-leadership-readiness.jpg",
    alt: "화이트보드 앞에서 회의를 이끌며 의견을 설명하는 리더",
    sourcePage: "https://www.pexels.com/photo/a-man-in-gray-suit-talking-while-pointing-on-whiteboard-8124371/",
  },
  "career-freelance-transition": {
    src: "/images/premium/career-freelance-transition.jpg",
    alt: "집에서 노트북으로 독립 업무를 수행하는 프리랜서",
    sourcePage: "https://www.pexels.com/photo/asian-freelancer-working-at-home-4333571/",
  },
  "career-workload-recovery": {
    src: "/images/premium/career-workload-recovery.jpg",
    alt: "서류가 쌓인 사무실에서 피로를 느끼는 직장인",
    sourcePage: "https://www.pexels.com/photo/exhausted-employee-in-front-of-laptop-6837637/",
  },
  "career-workplace-relationships": {
    src: "/images/premium/career-workplace-relationships.jpg",
    alt: "직장 동료들이 협력해 의견을 나누는 업무 회의 장면",
    sourcePage: "https://www.pexels.com/photo/colleagues-discussing-ideas-while-in-the-office-7792868/",
  },
  "relationship-friendship": {
    src: "/images/premium/relationship-friendship.jpg",
    alt: "친구 두 명이 야외에서 웃으며 대화하는 모습",
    sourcePage: "https://www.pexels.com/photo/positive-multiethnic-girlfriends-speaking-and-laughing-outdoors-5537515/",
  },
  "relationship-family-role": {
    src: "/images/premium/relationship-family-role.jpg",
    alt: "가족 구성원들이 함께 모여 이야기를 나누는 모습",
    sourcePage: "https://www.pexels.com/photo/a-family-sitting-at-the-table-8525004/",
  },
  "social-helper": {
    src: "/images/premium/social-helper.jpg",
    alt: "여러 사람이 손을 겹쳐 서로 도움과 신뢰를 표현하는 모습",
    sourcePage: "https://www.pexels.com/photo/crop-friends-stacking-hands-together-3830752/",
  },
  "social-conflict": {
    src: "/images/premium/social-conflict.jpg",
    alt: "두 사람이 의견 차이로 진지한 갈등 대화를 나누는 모습",
    sourcePage: "https://www.pexels.com/photo/unhappy-woman-having-argument-with-crop-female-6382711/",
  },
  "social-network-expansion": {
    src: "/images/premium/social-network-expansion.jpg",
    alt: "처음 만난 사람들이 모임에서 인사하고 이야기를 나누는 모습",
    sourcePage: "https://www.pexels.com/photo/people-in-corporate-wear-having-a-discussion-8761637/",
  },
};
