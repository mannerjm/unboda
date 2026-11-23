/**
 * Display-only teacher directory. Never use this file to influence pricing,
 * purchase entitlement, generation prompts or stored report results.
 */
export type SpecialistCategory = "health" | "growth" | "social" | "career" | "business" | "relationship";

export type TopicTeacherProfile = {
  category: SpecialistCategory;
  name: string;
  categoryLabel: string;
  title: string;
  intro: string;
  fields: readonly string[];
  approach: string;
  note?: string;
  portraitIndex: number; // position in the approved seven-portrait artwork
  accent: string;
  pale: string;
  border: string;
  dark: string;
  darkEnd: string;
};

export const TOPIC_TEACHERS: Record<SpecialistCategory, TopicTeacherProfile> = {
  health: {
    category: "health", name: "청온", categoryLabel: "건강운", title: "청온 선생님의 건강운 풀이",
    intro: "잠과 휴식, 몸과 마음의 균형을 중심으로 건강운을 쉽게 풀어드립니다.",
    fields: ["잠·휴식", "생활 리듬", "스트레스", "회복 습관"],
    approach: "사주에서 살펴본 흐름을 쉽게 설명하고, 일상에서 점검할 생활 습관을 정리합니다.",
    note: "건강운 풀이는 질병 진단이나 치료를 대신하지 않습니다.",
    portraitIndex: 1, accent: "#41774E", pale: "#E9F4EB", border: "#C9DFCE", dark: "#204732", darkEnd: "#0F3126",
  },
  growth: {
    category: "growth", name: "문성", categoryLabel: "학업·성장운", title: "문성 선생님의 학업·성장운 풀이",
    intro: "공부 습관과 집중 흐름을 살펴 성장에 필요한 방향을 안내합니다.",
    fields: ["공부 습관", "집중 흐름", "시험 준비", "성장 방향"],
    approach: "사주 풀이를 바탕으로 막히는 부분을 짚고, 실천하기 쉬운 공부 순서를 정리합니다.",
    portraitIndex: 2, accent: "#3269B0", pale: "#EDF4FF", border: "#C8DBF7", dark: "#194B85", darkEnd: "#12315F",
  },
  social: {
    category: "social", name: "온결", categoryLabel: "대인관계운", title: "온결 선생님의 대인관계운 풀이",
    intro: "사람과의 거리, 말의 흐름, 관계에서 생기는 고민을 함께 살펴봅니다.",
    fields: ["소통 방식", "거리 조절", "관계 갈등", "마음 정리"],
    approach: "관계에서 반복되는 상황을 쉽게 풀어보고, 대화와 행동의 순서를 정리합니다.",
    portraitIndex: 3, accent: "#B66A23", pale: "#FFF2E4", border: "#EED2B2", dark: "#92501C", darkEnd: "#60310D",
  },
  career: {
    category: "career", name: "도현", categoryLabel: "직업운", title: "도현 선생님의 직업운 풀이",
    intro: "내가 하는 일과 앞으로의 선택을 차분히 살펴봅니다.",
    fields: ["적성", "직장 흐름", "이직 고민", "일의 방향"],
    approach: "일과 관련된 흐름을 바탕으로 강점과 고민을 짚고, 살펴볼 선택 기준을 정리합니다.",
    portraitIndex: 4, accent: "#345B92", pale: "#ECF2FC", border: "#C8D6EE", dark: "#233E69", darkEnd: "#142C4F",
  },
  business: {
    category: "business", name: "태산", categoryLabel: "사업운", title: "태산 선생님의 사업운 풀이",
    intro: "사업의 운영과 확장, 계약과 돈의 흐름을 신중하게 살펴봅니다.",
    fields: ["운영 흐름", "확장 시기", "계약 점검", "자금 관리"],
    approach: "사업과 관련된 흐름을 짚고, 결정하기 전에 확인할 기준을 이해하기 쉽게 정리합니다.",
    portraitIndex: 5, accent: "#127B63", pale: "#E8F6F0", border: "#C6E5D9", dark: "#145746", darkEnd: "#093B34",
  },
  relationship: {
    category: "relationship", name: "연화", categoryLabel: "연애운", title: "연화 선생님의 연애운 풀이",
    intro: "인연과 감정, 서로의 마음을 이해하는 흐름을 살펴봅니다.",
    fields: ["인연의 흐름", "감정 이해", "표현 방식", "관계의 선택"],
    approach: "마음이 흔들리는 이유를 쉽게 풀고, 관계에서 살펴볼 대화와 행동을 정리합니다.",
    portraitIndex: 6, accent: "#BC4777", pale: "#FFF0F6", border: "#F1C7DA", dark: "#85304F", darkEnd: "#5E1C38",
  },
};

export function getTopicTeacher(category: string | undefined | null): TopicTeacherProfile | null {
  return category && Object.prototype.hasOwnProperty.call(TOPIC_TEACHERS, category)
    ? TOPIC_TEACHERS[category as SpecialistCategory]
    : null;
}
