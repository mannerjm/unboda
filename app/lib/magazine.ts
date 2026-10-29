/**
 * Public, version-controlled UNBODA magazine. Publishing is fail-closed:
 * entries appear only after a reviewed Git commit, explicit publish flag,
 * original/rights attestation, adequate evergreen substance and KST release
 * date. No external paid text API or personal data is used.
 */
export type MagazineSection = Readonly<{ heading: string; paragraphs: readonly string[] }>;
export type MagazineArticle = Readonly<{
  slug: string;
  title: string;
  description: string;
  category: "사주 입문" | "관계와 궁합" | "재물과 생활";
  publishedAt: string;
  updatedAt: string;
  cover: string;
  coverAlt: string;
  topicKey: string;
  originalArtwork: boolean;
  approvedForPublication: boolean;
  author: "운보다";
  lead: string;
  sections: readonly MagazineSection[];
  keyPoint: string;
  relatedHref: string;
  relatedLabel: string;
}>;

const ARTICLES: readonly MagazineArticle[] = [
  {
    slug: "saju-birth-time-unknown",
    title: "태어난 시간을 몰라도 사주를 볼 수 있을까요?",
    description: "출생 시간을 모를 때 확인할 수 있는 사주 정보와 해석의 한계, 출생 기록을 찾아보는 순서를 쉽게 안내합니다.",
    category: "사주 입문",
    publishedAt: "2026-10-29T00:00:00+09:00",
    updatedAt: "2026-10-29T00:00:00+09:00",
    cover: "/magazine/saju-birth-time.svg",
    coverAlt: "생년월일 기록 옆에 출생 시간을 확인하는 시계와 메모가 놓인 운보다 자체 제작 일러스트",
    topicKey: "birth-time-unknown-guide",
    originalArtwork: true,
    approvedForPublication: true,
    author: "운보다",
    lead: "사주를 처음 보려고 할 때 가장 많이 막히는 정보 중 하나가 출생 시간입니다. 시간을 모른다는 이유로 모든 것을 포기할 필요는 없지만, 아는 정보와 모르는 정보를 구분해야 해요.",
    sections: [
      { heading: "사주에서 출생 시간이 중요한 이유", paragraphs: [
        "전통 사주명리는 태어난 해·달·날·시간을 각각 하나의 기둥으로 보고, 네 기둥을 함께 읽습니다. 태어난 시간이 불명확하면 그중 시주를 확정하기 어렵습니다. 다른 세 기둥이 정확히 계산되더라도 시주까지 확인된 것처럼 이야기해서는 안 됩니다.",
        "같은 날 태어난 두 사람이라도 시간이 다르면 해석에 활용하는 정보가 달라질 수 있습니다. 그러므로 출생 시간을 알 수 없다면 결과를 확정적인 미래 설명으로 받아들이기보다, 확인된 범위의 성향을 살펴보는 참고 자료로 사용하는 편이 좋습니다."
      ] },
      { heading: "먼저 확인하면 좋은 정보", paragraphs: [
        "출생신고 관련 보관 기록, 가족이 남긴 출생 수첩이나 병원 기록 등 확인 가능한 자료부터 살펴보세요. 가족의 기억만 있다면 '정확한 시각'과 '대략 오전이나 오후'를 구별해 적어두면 나중에 혼동을 줄일 수 있습니다.",
        "생년월일과 양력·음력 구분도 함께 점검해야 합니다. 특히 출생 날짜가 자정 가까이거나 절기 경계에 가깝다면 달력 기준과 시간대에 따라 계산이 달라질 수 있어, 정보를 먼저 정확히 정리하는 것이 중요합니다."
      ] },
      { heading: "모르는 시간을 임의로 채우지 마세요", paragraphs: [
        "정확히 모르는 출생 시간을 임의로 정오나 자정으로 입력하면 계산 결과가 정해진 사실처럼 보일 수 있습니다. 선택한 시간이 실제로 확인되지 않았다는 사실은 그대로 유지해야 합니다.",
        "가능하면 '출생 시간 모름' 기능을 사용하는 것이 더 정직한 방법입니다. 어떤 설명이 확정 정보에 바탕을 두고 있고 어떤 내용이 시간에 따라 달라질 수 있는지를 구별해 읽어보세요."
      ] },
      { heading: "결과를 일상에서 활용하는 방법", paragraphs: [
        "사주 해석을 읽고 바로 중요한 결정을 내리기보다는, 내 성향에 관한 질문을 적어보세요. 예를 들어 큰일을 시작할 때 계획을 먼저 세우는지, 주변과 의논한 뒤 움직이는지 등 실제 경험과 비교할 수 있는 질문이 도움이 됩니다.",
        "관계·직업·재정 관련 판단은 확인 가능한 상황과 현실적인 선택지를 중심으로 하세요. 사주는 문화적 해석을 통해 자신을 돌아보는 하나의 관점이지, 삶의 결과를 보장하는 방법은 아닙니다."
      ] }
    ],
    keyPoint: "출생 시간을 모르면 시주를 확정하지 않고, 확인된 생년월일과 실제 경험을 중심으로 살펴보세요.",
    relatedHref: "/guest-saju",
    relatedLabel: "무료 사주 먼저 살펴보기",
  },
  {
    slug: "compatibility-conversation-first",
    title: "궁합 점수보다 먼저 살펴볼 것: 서로의 대화 방식",
    description: "연인·친구·동료와의 궁합을 볼 때 점수에만 의존하지 않고 대화와 약속, 갈등 회복을 함께 살펴보는 방법입니다.",
    category: "관계와 궁합",
    publishedAt: "2026-10-29T00:00:00+09:00",
    updatedAt: "2026-10-29T00:00:00+09:00",
    cover: "/magazine/compatibility-conversation.svg",
    coverAlt: "두 사람이 서로 다른 색상의 말풍선을 나누며 대화하는 운보다 자체 제작 일러스트",
    topicKey: "compatibility-talk-practical-guide",
    originalArtwork: true,
    approvedForPublication: true,
    author: "운보다",
    lead: "궁합을 볼 때 '잘 맞는다'는 한마디보다 실제 관계에서 무엇이 편하고 무엇이 어려운지 이해하는 일이 중요합니다. 사주를 참고하더라도 대화 방식과 일상 행동을 함께 살펴야 해요.",
    sections: [
      { heading: "궁합은 결과를 확정하는 점수가 아닙니다", paragraphs: [
        "전통 명리에서 말하는 궁합은 두 사람의 특징을 비교해 해석하는 방식 중 하나입니다. 이것만으로 관계의 지속 여부, 상대의 마음이나 결혼 결과를 정확하게 예측할 수는 없습니다.",
        "관계를 살피고 싶다면 같은 상황에서 두 사람이 어떤 선택을 하는지 구체적으로 생각해 보세요. 연락 주기, 약속 시간, 피곤할 때의 표현 등 반복되는 생활 장면이 훨씬 실용적인 대화의 출발점이 됩니다."
      ] },
      { heading: "연락 방식이 다를 때 확인할 세 가지", paragraphs: [
        "누군가는 메시지를 빨리 주고받아야 마음이 놓이고, 다른 사람은 일에 집중하는 동안 휴대전화를 보지 못할 수 있습니다. 어느 쪽이 무조건 맞거나 틀린 것은 아닙니다.",
        "첫째, 답장이 필요한 상황과 급하지 않은 상황을 구분하세요. 둘째, 하루 중 연락이 편한 시간을 말해보세요. 셋째, 답장이 늦을 때 상대를 단정하지 않고 확인할 수 있는 표현을 함께 정해보세요."
      ] },
      { heading: "다툼 이후 어떻게 회복하는지도 중요합니다", paragraphs: [
        "갈등이 생겼을 때 바로 대화하고 싶은 사람과 시간을 갖고 싶은 사람은 서로 답답할 수 있습니다. 이런 차이를 알면 '왜 나처럼 하지 않지?'라는 질문을 '언제 다시 이야기하면 좋을까?'로 바꿀 수 있습니다.",
        "상대가 필요로 하는 시간을 존중하되, 대화를 무한히 미루지 않도록 다시 이야기할 시간을 합의해보세요. 관계를 평가하기보다 함께 조정할 수 있는 행동을 찾는 데 집중하는 편이 좋습니다."
      ] },
      { heading: "궁합 풀이를 읽을 때 좋은 질문", paragraphs: [
        "풀이에 '의사소통 방식이 다르다'는 말이 있다면 실제로 대화가 엇갈린 장면이 있었는지 떠올려보세요. 있었던 일과 없었던 일을 구분해 보는 것이 중요합니다.",
        "사주 해석은 나와 상대의 성격을 단정하는 기준이 아니라 대화 주제를 찾는 참고로 활용하세요. 관계의 안전과 존중, 실제로 보여주는 행동을 언제나 더 우선해서 판단해야 합니다."
      ] }
    ],
    keyPoint: "궁합을 확인한 뒤에는 연락·약속·갈등 회복 방식 중 한 가지를 실제 대화로 이어가 보세요.",
    relatedHref: "/special-analysis/compatibility",
    relatedLabel: "운보다 궁합 안내 살펴보기",
  },
  {
    slug: "money-fortune-budget-review",
    title: "재물운을 볼 때 함께 확인할 소비 습관 4가지",
    description: "재물운 해석을 참고하면서 자동 결제, 정기 지출, 예산, 저축 목표를 현실적으로 점검하는 쉬운 방법을 소개합니다.",
    category: "재물과 생활",
    publishedAt: "2026-10-31T09:00:00+09:00",
    updatedAt: "2026-10-31T09:00:00+09:00",
    cover: "/magazine/money-budget.svg",
    coverAlt: "체크 표시가 있는 가계부와 카드 결제 내역, 동전이 함께 놓인 운보다 자체 제작 일러스트",
    topicKey: "money-fortune-real-spending-checklist",
    originalArtwork: true,
    approvedForPublication: true,
    author: "운보다",
    lead: "재물운을 읽고 나면 돈이 들어오는 시기만 궁금해질 수 있습니다. 하지만 실제 생활에서는 이번 달 어떤 지출을 선택했는지 아는 편이 더 직접적인 도움이 됩니다.",
    sections: [
      { heading: "1. 정기 결제부터 살펴보세요", paragraphs: [
        "통신비, 구독 서비스, 자동이체처럼 매달 반복되는 금액을 먼저 적어 보세요. 작은 결제라도 여러 항목이 모이면 전체 지출을 알아보기 어려워질 수 있습니다.",
        "지난 한두 달의 결제 내역에서 사용하지 않는 서비스가 있는지 확인하고, 해지 조건과 필요한 서비스 여부를 함께 살펴보세요. 무조건 지출을 줄이는 것보다 무엇을 유지할지 결정하는 것이 먼저입니다."
      ] },
      { heading: "2. 이번 달 꼭 필요한 지출을 구분하세요", paragraphs: [
        "식비·주거·교통처럼 우선순위가 높은 지출과 미뤄도 되는 구매를 구분해 보세요. 장바구니에 담았던 물건을 다음 날 한 번 더 보는 것도 충동적인 결정을 줄이는 작은 방법입니다.",
        "재물운이 좋다는 설명을 보더라도 이를 특정 투자나 소비의 성공 신호로 해석하는 것은 조심해야 합니다. 실제 가격·필요성·내 형편을 먼저 확인하는 것이 안전합니다."
      ] },
      { heading: "3. 예산은 유지할 수 있는 크기로 시작하세요", paragraphs: [
        "처음부터 모든 지출을 완벽하게 기록하려 하면 오래 이어가기 어려울 수 있습니다. 가장 신경 쓰이는 항목 한두 개만 정해서 일주일 동안 확인해 보세요.",
        "실천해 본 기록을 바탕으로 다음 주 예산을 다시 잡으면 내 생활에 맞는 기준을 찾기 쉽습니다. 중요한 것은 큰 금액을 한 번에 바꾸는 일이 아니라 꾸준히 살펴보는 습관입니다."
      ] },
      { heading: "4. 저축 목표는 구체적인 행동으로 적어보세요", paragraphs: [
        "막연히 '돈을 모으겠다'보다 매달 얼마를 언제 확인할지 정하면 실천 여부를 살펴보기가 쉽습니다. 다만 저축이나 투자 계획은 개인의 수입·부채·필요한 생활비를 고려해야 합니다.",
        "명리의 재물운은 자신을 되돌아보는 문화적 관점으로 읽고, 금전적 의사결정은 검증 가능한 정보에 근거해 내리세요. 사주 풀이가 수익이나 자산 증가를 보장하지는 않습니다."
      ] }
    ],
    keyPoint: "자동 결제 목록 하나를 열어 보고, 이번 주 불필요한 지출이 있는지 확인해보세요.",
    relatedHref: "/deep-analysis",
    relatedLabel: "운보다 심층 분석 안내",
  },
];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function isSafePublishedArticle(article: MagazineArticle, now: Date): boolean {
  return article.approvedForPublication &&
    article.originalArtwork &&
    SLUG.test(article.slug) &&
    article.title.length >= 12 &&
    article.description.length >= 45 &&
    article.cover.startsWith("/magazine/") &&
    article.coverAlt.length >= 20 &&
    article.sections.length >= 4 &&
    article.sections.every(section => section.heading.length >= 8 &&
      section.paragraphs.length >= 2 && section.paragraphs.every(p => p.length >= 65)) &&
    article.publishedAt === article.updatedAt &&
    Number.isFinite(Date.parse(article.publishedAt)) &&
    Date.parse(article.publishedAt) <= now.getTime();
}
export function getPublishedMagazineArticles(now: Date = new Date()): MagazineArticle[] {
  return ARTICLES
    .filter(article => isSafePublishedArticle(article, now))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}
export function getMagazineArticle(slug: string, now: Date = new Date()): MagazineArticle | undefined {
  return getPublishedMagazineArticles(now).find(article => article.slug === slug);
}
export function getAllMagazineReviewEntries(): readonly MagazineArticle[] {
  return ARTICLES;
}
