/**
 * Workplace perspective is always selected from the buyer's (A's) viewpoint.
 * These are interpretation lenses, NOT alternate natal/timing calculations.
 */
export const WORKPLACE_RELATIONS = [
  {
    id: "my_manager",
    label: "상대방이 나의 상사입니다",
    shortLabel: "나의 상사",
    myRole: "팀원·부하직원",
    partnerRole: "상사",
    reportFocus: [
      "내 입장: 지시·업무 기대치를 확인하고 보고와 피드백을 주고받는 방식",
      "상대 입장: 업무를 지시하거나 조율할 때 나에게 전달되는 압박과 지원의 방식",
      "상하 관계에서 권한과 책임이 다름을 인정하고, 질문·보고·피드백·갈등 해결을 구체적으로 해석",
    ],
    consultingFocus: "사용자는 팀원·부하직원이고 상대는 상사입니다. 보고, 업무 기대치 확인, 피드백 수용, 권한 경계 관점으로만 제안합니다.",
  },
  {
    id: "peer",
    label: "상대방과 동등한 직급의 동료입니다",
    shortLabel: "동등한 동료",
    myRole: "동료",
    partnerRole: "동료",
    reportFocus: [
      "상하 관계를 전제하지 않고 동등한 동료 간 업무 분담과 의견 조율",
      "경쟁과 협력, 업무 속도 차이, 상호 피드백 및 책임 경계",
      "상호 합의가 필요한 장면을 중심으로 실천 방안을 설명",
    ],
    consultingFocus: "사용자와 상대는 동등한 동료입니다. 일방적 지시나 부하 관리 대신 역할 협의, 상호 피드백과 공동 결정에 초점을 맞춥니다.",
  },
  {
    id: "my_report",
    label: "상대방이 나의 후배·부하직원입니다",
    shortLabel: "나의 후배·부하직원",
    myRole: "선배·상사",
    partnerRole: "후배·부하직원",
    reportFocus: [
      "내 입장: 업무 위임, 기대치 전달, 피드백·지원과 권한 행사 방식",
      "상대 입장: 위임과 피드백을 받을 때 경험할 수 있는 압박·지원의 양방향 구조",
      "역할·책임을 명확히 하되 상대의 실제 능력·성과·감정은 사주만으로 단정하지 않기",
    ],
    consultingFocus: "사용자는 선배·상사이고 상대는 후배·부하직원입니다. 업무 위임, 명확한 피드백, 성장 지원과 권한·책임 경계에 초점을 맞춥니다.",
  },
  {
    id: "collaborator",
    label: "직급과 무관한 업무 협업자입니다",
    shortLabel: "업무 협업자",
    myRole: "협업 담당자",
    partnerRole: "협업 담당자",
    reportFocus: [
      "정해진 상하 관계를 추정하지 않고 프로젝트·팀 간 공동 목표와 역할 구분",
      "협업 일정, 정보 공유, 의사결정·책임의 합의",
      "보고 체계나 인사권을 임의로 가정하지 않고 업무 경계를 중심으로 해석",
    ],
    consultingFocus: "사용자와 상대는 직급과 무관한 협업자입니다. 임의의 상하 관계를 가정하지 말고 프로젝트 목표, 책임 분담, 정보 공유와 합의에 초점을 맞춥니다.",
  },
] as const;

export type WorkplaceRelation = (typeof WORKPLACE_RELATIONS)[number]["id"];

export function isWorkplaceRelation(value: unknown): value is WorkplaceRelation {
  return WORKPLACE_RELATIONS.some((item) => item.id === value);
}

export function getWorkplaceRelation(value: WorkplaceRelation) {
  const relation = WORKPLACE_RELATIONS.find((item) => item.id === value);
  if (!relation) throw new Error("직장 관계 선택값이 올바르지 않습니다.");
  return relation;
}
