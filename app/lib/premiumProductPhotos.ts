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
};
