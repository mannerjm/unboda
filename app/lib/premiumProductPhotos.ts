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
};
