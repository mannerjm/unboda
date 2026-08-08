export type AnalysisTopicCategory =
  | "money"
  | "career"
  | "relationship"
  | "social"
  | "health"
  | "business"
  | "growth"
  | "change"
  | "life";

export type AnalysisTopicRiskLevel =
  | "standard"
  | "sensitive"
  | "high_sensitivity";

export type AnalysisTopicDefinition = {
  id: string;
  category: AnalysisTopicCategory;
  title: string;
  shortDescription: string;
  riskLevel: AnalysisTopicRiskLevel;
};

export const ANALYSIS_TOPICS: AnalysisTopicDefinition[] = [
  // 재물·금전 8
  {
    id: "money-wealth-accumulation",
    category: "money",
    title: "재물이 쌓이는 구조",
    shortDescription: "돈을 벌고 남기고 축적하는 방식과 현재 재물 흐름을 분석합니다.",
    riskLevel: "sensitive",
  },
  {
    id: "money-leak-risk",
    category: "money",
    title: "돈이 새는 구조와 손실 위험",
    shortDescription: "지출·손실·충동 판단이 커지기 쉬운 조건과 관리 기준을 분석합니다.",
    riskLevel: "sensitive",
  },
  {
    id: "money-investment-style",
    category: "money",
    title: "투자 성향과 위험 관리",
    shortDescription: "투자 판단 스타일과 과도한 위험을 피하기 위한 기준을 분석합니다.",
    riskLevel: "high_sensitivity",
  },
  {
    id: "money-side-income",
    category: "money",
    title: "부업·추가 수입 가능성",
    shortDescription: "본업 외 수입원을 만들 때 맞는 방식과 현실적인 조건을 분석합니다.",
    riskLevel: "sensitive",
  },
  {
    id: "money-business-income",
    category: "money",
    title: "사업 수입 구조",
    shortDescription: "고정 수입보다 사업·성과형 수입이 맞는지와 변동성을 분석합니다.",
    riskLevel: "sensitive",
  },
  {
    id: "money-saving-discipline",
    category: "money",
    title: "저축과 자산 관리 습관",
    shortDescription: "돈을 유지하는 힘과 생활 속 자산 관리 패턴을 분석합니다.",
    riskLevel: "sensitive",
  },
  {
    id: "money-income-expansion",
    category: "money",
    title: "소득 확장 시기와 방식",
    shortDescription: "수입을 늘리기 좋은 조건과 확장 시 주의점을 분석합니다.",
    riskLevel: "sensitive",
  },
  {
    id: "money-financial-turning-point",
    category: "money",
    title: "재정 전환점",
    shortDescription: "현재 운에서 돈의 흐름이 바뀌는 지점과 대응 기준을 분석합니다.",
    riskLevel: "sensitive",
  },

  // 직업·커리어 8
  {
    id: "career-job-fit",
    category: "career",
    title: "직업 적성",
    shortDescription: "타고난 업무 방식과 잘 맞는 역할·환경을 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "career-job-change",
    category: "career",
    title: "이직과 이동",
    shortDescription: "현재 직장을 유지할지 이동할지 판단하는 기준을 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "career-promotion",
    category: "career",
    title: "승진과 책임 확대",
    shortDescription: "권한·책임이 커지는 시기의 기회와 부담을 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "career-organization-fit",
    category: "career",
    title: "조직 적응과 직장 관계",
    shortDescription: "조직 안에서 강점이 살아나는 방식과 갈등 포인트를 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "career-leadership",
    category: "career",
    title: "리더십과 관리 역할",
    shortDescription: "사람을 이끌고 조율하는 역할이 맞는지와 주의점을 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "career-independence",
    category: "career",
    title: "독립·프리랜서 적합성",
    shortDescription: "조직 밖에서 일할 때 필요한 조건과 위험을 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "career-specialization",
    category: "career",
    title: "전문성 강화 방향",
    shortDescription: "어떤 능력을 깊게 키울수록 성과가 커지는지 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "career-burnout-risk",
    category: "career",
    title: "커리어 소진 위험",
    shortDescription: "과도한 책임·경쟁·변화 속에서 소진되기 쉬운 패턴을 분석합니다.",
    riskLevel: "standard",
  },

  // 연애·결혼 8
  {
    id: "relationship-current",
    category: "relationship",
    title: "현재 관계의 지속성과 조정",
    shortDescription: "현재 관계의 핵심 문제와 이어갈 기준·조정 기준을 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "relationship-new-connection",
    category: "relationship",
    title: "새 인연 가능성과 만남 방식",
    shortDescription: "새로운 관계가 형성되기 쉬운 조건과 확인 기준을 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "relationship-marriage",
    category: "relationship",
    title: "결혼·장기 관계 흐름",
    shortDescription: "장기 관계에서 중요하게 작용하는 기준과 시기 흐름을 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "relationship-partner-pattern",
    category: "relationship",
    title: "배우자·파트너 패턴",
    shortDescription: "어떤 관계 특성과 역할 배분에서 안정감을 느끼는지 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "relationship-conflict",
    category: "relationship",
    title: "갈등 패턴과 회복 방식",
    shortDescription: "갈등이 생기는 구조와 관계를 다시 회복하는 방식을 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "relationship-boundary",
    category: "relationship",
    title: "거리 조절과 경계",
    shortDescription: "가까워질수록 생길 수 있는 경계 문제와 조절 방식을 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "relationship-reunion",
    category: "relationship",
    title: "재회 가능성과 판단 기준",
    shortDescription: "재회를 단정하지 않고 다시 연결될 조건과 현실적 판단 기준을 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "relationship-intimacy",
    category: "relationship",
    title: "친밀감 형성 속도",
    shortDescription: "관계가 가까워지는 속도와 감정 소모 패턴을 분석합니다.",
    riskLevel: "standard",
  },

  // 인간관계 6
  {
    id: "social-helper",
    category: "social",
    title: "귀인과 도움을 주는 사람",
    shortDescription: "도움을 얻기 쉬운 관계 유형과 신뢰 기준을 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "social-friendship",
    category: "social",
    title: "친구 관계",
    shortDescription: "친구 관계에서 반복되는 역할과 거리 조절 패턴을 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "social-family",
    category: "social",
    title: "가족 관계",
    shortDescription: "가족 안에서 맡기 쉬운 역할과 갈등 구조를 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "social-workplace",
    category: "social",
    title: "직장 인간관계",
    shortDescription: "상사·동료·협업 관계에서 나타나는 강점과 주의점을 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "social-conflict",
    category: "social",
    title: "대인 갈등과 거리 조절",
    shortDescription: "반복되는 갈등 유형과 관계를 조절하는 기준을 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "social-network-expansion",
    category: "social",
    title: "새로운 인맥과 관계 확장",
    shortDescription: "새 사람과 연결될 때 강점이 살아나는 환경과 조건을 분석합니다.",
    riskLevel: "standard",
  },

  // 건강·생활 5
  {
    id: "health-energy",
    category: "health",
    title: "체력과 에너지 관리",
    shortDescription: "생활 리듬과 피로가 쌓이기 쉬운 패턴을 명리적 관점에서 분석합니다.",
    riskLevel: "high_sensitivity",
  },
  {
    id: "health-stress",
    category: "health",
    title: "스트레스와 회복 패턴",
    shortDescription: "스트레스가 커지는 조건과 회복을 돕는 생활 기준을 분석합니다.",
    riskLevel: "high_sensitivity",
  },
  {
    id: "health-burnout",
    category: "health",
    title: "과로·번아웃 위험",
    shortDescription: "과도한 활동과 회복 부족이 반복되기 쉬운 흐름을 분석합니다.",
    riskLevel: "high_sensitivity",
  },
  {
    id: "health-routine",
    category: "health",
    title: "생활 습관과 리듬",
    shortDescription: "수면·활동·휴식 리듬을 조절하는 데 참고할 수 있는 흐름을 분석합니다.",
    riskLevel: "high_sensitivity",
  },
  {
    id: "health-balance",
    category: "health",
    title: "몸과 생활 균형 점검",
    shortDescription: "특정 질병을 진단하지 않고 생활 균형이 흔들리기 쉬운 시기를 분석합니다.",
    riskLevel: "high_sensitivity",
  },

  // 사업·성취 5
  {
    id: "business-startup",
    category: "business",
    title: "창업 적합성과 준비",
    shortDescription: "창업 시 강점이 살아나는 방식과 먼저 준비할 조건을 분석합니다.",
    riskLevel: "sensitive",
  },
  {
    id: "business-partnership",
    category: "business",
    title: "동업과 파트너십",
    shortDescription: "동업 시 역할·권한·책임 배분에서 주의할 지점을 분석합니다.",
    riskLevel: "sensitive",
  },
  {
    id: "business-growth",
    category: "business",
    title: "사업 확장과 속도 조절",
    shortDescription: "확장하기 좋은 조건과 무리한 성장 위험을 분석합니다.",
    riskLevel: "sensitive",
  },
  {
    id: "business-decision",
    category: "business",
    title: "사업 의사결정 방식",
    shortDescription: "중요한 사업 판단에서 강점과 편향이 나타나는 방식을 분석합니다.",
    riskLevel: "sensitive",
  },
  {
    id: "business-performance",
    category: "business",
    title: "성과가 나는 구조",
    shortDescription: "성과가 커지는 역할·환경·운 흐름을 분석합니다.",
    riskLevel: "standard",
  },

  // 학업·성장 4
  {
    id: "growth-study",
    category: "growth",
    title: "학습 방식과 집중력",
    shortDescription: "어떤 학습 방식에서 집중과 이해가 잘 살아나는지 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "growth-exam",
    category: "growth",
    title: "시험·자격 준비",
    shortDescription: "시험 준비 과정에서 강점과 흔들리기 쉬운 지점을 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "growth-skill",
    category: "growth",
    title: "전문기술과 역량 개발",
    shortDescription: "어떤 역량을 키울 때 장기 경쟁력이 높아지는지 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "growth-self-development",
    category: "growth",
    title: "자기계발 방향",
    shortDescription: "현재 시점에서 투자할 가치가 큰 성장 방향을 분석합니다.",
    riskLevel: "standard",
  },

  // 이동·변화 3
  {
    id: "change-moving",
    category: "change",
    title: "이사와 생활 환경 변화",
    shortDescription: "환경 이동이 생활 리듬과 선택에 미칠 수 있는 영향을 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "change-overseas",
    category: "change",
    title: "해외·장거리 이동",
    shortDescription: "해외나 장거리 환경에서 기회와 부담이 나타나는 방식을 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "change-transition",
    category: "change",
    title: "큰 변화와 전환기",
    shortDescription: "현재 삶의 구조를 바꾸기 좋은지와 먼저 점검할 기준을 분석합니다.",
    riskLevel: "standard",
  },

  // 인생 종합 3
  {
    id: "life-current-turning-point",
    category: "life",
    title: "지금 가장 중요한 인생 전환점",
    shortDescription: "현재 운에서 무엇을 가장 먼저 조정해야 하는지 종합적으로 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "life-long-term-direction",
    category: "life",
    title: "장기 인생 방향",
    shortDescription: "타고난 구조와 현재 운을 연결해 장기적으로 집중할 방향을 분석합니다.",
    riskLevel: "standard",
  },
  {
    id: "life-priority",
    category: "life",
    title: "지금의 우선순위",
    shortDescription: "재물·일·관계·건강 중 현재 가장 먼저 다룰 영역을 분석합니다.",
    riskLevel: "standard",
  },
];