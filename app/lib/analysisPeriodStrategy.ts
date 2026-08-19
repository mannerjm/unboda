import type { PeriodAnalysisProductType } from "./analysisPeriodProducts";

export type PeriodAnalysisTimeGranularity =
  | "month"
  | "year"
  | "multi-year"
  | "rolling-months"
  | "daeun"
  | "lifetime";

export type PeriodAnalysisResponsibility = {
  id: string;
  title: string;
  evidenceInterpretation: string;
  mechanismResponsibility: string;
  observableSignal: string;
  actionResponsibility: string;
};

export type PeriodAnalysisOwnershipContract = {
  requiredInsights: readonly PeriodAnalysisResponsibility[];
  evidenceArchitecture: string;
  causeArchitecture: string;
  reviewArtifact: string;
};

type PeriodAnalysisStrategyDefinition = {
  productId: string;
  /** Registry periodType this strategy is bound to; verified by regression. */
  periodType: PeriodAnalysisProductType;
  timeGranularity: PeriodAnalysisTimeGranularity;
  coreQuestion: string;
  focus: readonly string[];
  timelineSpec: {
    /** Must stay at 4+ entries: the V3 schema requires futureTimeline.min(4). */
    labels: readonly string[];
    rule: string;
  };
  prohibitedPatterns: readonly string[];
};

export type PeriodAnalysisStrategy = PeriodAnalysisStrategyDefinition &
  PeriodAnalysisOwnershipContract;

const PERIOD_OWNERSHIP_CONTRACTS: Record<
  string,
  PeriodAnalysisOwnershipContract
> = {
  "monthly-current": {
    requiredInsights: [
      {
        id: "active-month-context",
        title: "이번 달의 실행 맥락",
        evidenceInterpretation: "현재 월의 흐름을 이번 달 안에서 실제로 체감되는 조건으로 해석한다.",
        mechanismResponsibility: "이번 달의 압력과 자원이 실행 우선순위에 어떻게 작용하는지 설명한다.",
        observableSignal: "이번 달 안에서 일정·역할·에너지 배분이 달라지는 신호를 확인한다.",
        actionResponsibility: "이번 달 안에 바로 실행하고 재점검할 우선순위를 정한다.",
      },
      {
        id: "active-month-pressure-window",
        title: "이번 달 압력·기회 구간",
        evidenceInterpretation: "현재 근거가 한 달 내부의 강약과 조정 구간에 무엇을 뜻하는지 해석한다.",
        mechanismResponsibility: "월 내 압력 변화가 행동 속도와 선택 범위를 어떻게 바꾸는지 연결한다.",
        observableSignal: "초반·중반·후반에 반복되는 부담과 실행 신호를 관찰한다.",
        actionResponsibility: "구간별로 유지·조정할 행동을 구분한다.",
      },
      {
        id: "active-month-action-priority",
        title: "이번 달 실행 우선순위",
        evidenceInterpretation: "이번 달 근거를 즉시 실행 가능한 판단 기준으로 좁힌다.",
        mechanismResponsibility: "선택과 실행이 월 내 결과 확인에 어떻게 연결되는지 설명한다.",
        observableSignal: "실행 후 확인할 현실 결과와 재작업 신호를 정한다.",
        actionResponsibility: "이번 달에 먼저 실행하고 완료 기준으로 검토한다.",
      },
      {
        id: "active-month-review",
        title: "이번 달 검토 책임",
        evidenceInterpretation: "근거가 한 달 전체의 핵심 전환을 어떻게 보여주는지 해석한다.",
        mechanismResponsibility: "월말 전환이 다음 행동의 유지·조정 판단으로 이어지는 경로를 설명한다.",
        observableSignal: "월말에 지속할 것과 줄일 것을 가르는 신호를 확인한다.",
        actionResponsibility: "이번 달의 실행 결과를 검토하고 다음 판단을 조정한다.",
      },
    ],
    evidenceArchitecture: "공유 근거를 이번 달 내부의 실행 조건·압력 구간·월말 전환으로 해석한다.",
    causeArchitecture: "현재 월의 조건 → 월 내 압력 변화 → 즉시 실행 신호 → 월말 유지·조정 검토 순서로 조직한다.",
    reviewArtifact: "이번 달 실행 우선순위와 월말 유지·조정 체크리스트",
  },
  "monthly-next": {
    requiredInsights: [
      {
        id: "incoming-month-context",
        title: "다음 달 진입 맥락",
        evidenceInterpretation: "현재 근거를 다음 달에 들어올 운영 조건과 준비 필요성으로 해석한다.",
        mechanismResponsibility: "다음 달의 압력·자원 조건이 진입 준비와 수용 범위에 어떻게 작용하는지 설명한다.",
        observableSignal: "다음 달 제안·역할·일정에서 실제 지원과 책임 범위가 드러나는 신호를 관찰한다.",
        actionResponsibility: "다음 달 진입 전에 준비·보류·수용 범위를 정한다.",
      },
      {
        id: "previous-month-change",
        title: "직전 달 대비 변화",
        evidenceInterpretation: "직전 달의 기준 조건과 다음 달의 기준 조건이 어떻게 달라지는지 비교한다.",
        mechanismResponsibility: "변화한 조건이 다음 달의 부담·자원 배분과 선택 범위를 어떻게 바꾸는지 연결한다.",
        observableSignal: "직전 달과 비교해 역할·기한·비용·지원 중 달라진 항목을 확인한다.",
        actionResponsibility: "달라진 조건에 따라 다음 달의 hold/adjust/review 기준을 정한다.",
      },
      {
        id: "incoming-month-observation-window",
        title: "다음 달 단기 관찰 창",
        evidenceInterpretation: "공유 근거를 다음 달 초반·중반·후반의 짧은 관찰 신호로 좁힌다.",
        mechanismResponsibility: "들어오는 조건이 단기 실행과 압력 변화로 나타나는 경로를 설명한다.",
        observableSignal: "초반 수용, 중반 부담, 후반 지속 가능성을 판단할 신호를 구분한다.",
        actionResponsibility: "짧은 관찰 창마다 유지·조정·재검토한다.",
      },
      {
        id: "incoming-month-review-action",
        title: "다음 달 hold/adjust/review",
        evidenceInterpretation: "근거를 다음 달의 수용 여부가 아니라 조건부 운영 판단으로 해석한다.",
        mechanismResponsibility: "관찰된 차이가 다음 단계의 보류·범위 축소·유지 판단으로 이어지는 경로를 설명한다.",
        observableSignal: "권한·지원·기한·결과 기준 중 부족한 조건을 확인한다.",
        actionResponsibility: "다음 달에 hold/adjust/review를 실행하고 완료 기준을 기록한다.",
      },
    ],
    evidenceArchitecture: "직전 달의 기준 조건 → 달라진 조건 → 다음 달의 observable signal → 짧은 관찰 창으로 해석한다.",
    causeArchitecture: "직전 달 대비 변화 → 다음 달 진입 조건 → 즉시 확인할 신호 → 단기 hold/adjust/review 순서로 조직한다.",
    reviewArtifact: "다음 달 진입 비교표와 초반·중반·후반 hold/adjust/review 체크리스트",
  },
  "yearly-current": {
    requiredInsights: [
      {
        id: "annual-pressure-resource-structure",
        title: "연간 압력·자원 구조",
        evidenceInterpretation: "공유 근거를 올해 전체에 누적되는 압력과 자원의 균형으로 해석한다.",
        mechanismResponsibility: "지속되는 조건과 일시적인 압력을 구분해 연간 운영 부담으로 연결한다.",
        observableSignal: "반복되는 지연·재작업·지원 변화가 연중 누적되는지 관찰한다.",
        actionResponsibility: "연간 자원 한도와 지속 가능한 운영 기준을 정한다.",
      },
      {
        id: "annual-operating-transition",
        title: "연간 운영 전환",
        evidenceInterpretation: "근거가 올해의 운영 방식이 언제 전환 검토에 들어가는지 보여주는 방식으로 해석한다.",
        mechanismResponsibility: "누적된 압력과 지원 변화가 운영 구조를 바꾸는 경로를 설명한다.",
        observableSignal: "역할 충돌, 반복 수정, 책임 재배분이 일시적이 아닌지 확인한다.",
        actionResponsibility: "연중 검토 시점에 절차·역할·완료 기준을 재설계한다.",
      },
      {
        id: "annual-priority-allocation",
        title: "연간 우선순위 배분",
        evidenceInterpretation: "공유 근거를 올해 동안 유지·축소·보류할 선택의 우선순위로 해석한다.",
        mechanismResponsibility: "연간 자원과 압력의 균형이 선택의 누적 결과에 어떻게 영향을 주는지 연결한다.",
        observableSignal: "핵심 목표가 실제 자원과 반복 가능한 결과로 남는지 관찰한다.",
        actionResponsibility: "연말까지 가져갈 핵심 목표와 중단·보류 기준을 배분한다.",
      },
      {
        id: "annual-carry-forward-review",
        title: "연말 carry-forward/reset",
        evidenceInterpretation: "근거를 올해의 결과가 다음 기간에 carry-forward될 가치가 있는지로 해석한다.",
        mechanismResponsibility: "성과·투입 자원·재작업의 누적이 다음 운영 기준을 만드는 경로를 설명한다.",
        observableSignal: "연말에 반복 가능한 구조와 단순 피로·미완료를 구분한다.",
        actionResponsibility: "다음 기간에 carry-forward할 것과 reset할 것을 재점검한다.",
      },
    ],
    evidenceArchitecture: "연간 누적·지속성 → 자원·압력 균형 → 우선순위 배분 → review checkpoint → carry-forward/reset으로 해석한다.",
    causeArchitecture: "연간 축적 조건 → 지속·일시 압력 구분 → 운영 우선순위 전환 → 연말 carry-forward/reset 순서로 조직한다.",
    reviewArtifact: "연간 운영 우선순위표와 연중 checkpoint·연말 carry-forward/reset 리뷰",
  },
  "annual-next": {
    requiredInsights: [
      { id: "next-year-theme", title: "다음 해 핵심 테마", evidenceInterpretation: "현재 근거를 다음 해의 실제 연도 테마로 해석한다.", mechanismResponsibility: "현재와 다음 해의 조건 차이가 준비 우선순위에 미치는 경로를 설명한다.", observableSignal: "다음 해를 준비해야 하는 현재의 조건 변화를 확인한다.", actionResponsibility: "다음 해 준비의 첫 기준을 정한다." },
      { id: "next-year-difference", title: "현재 해 대비 변화", evidenceInterpretation: "현재 해와 다음 해의 운영 조건 차이를 비교한다.", mechanismResponsibility: "차이가 준비해야 할 자원·역할·속도를 어떻게 바꾸는지 연결한다.", observableSignal: "현재 운영 기준으로 감당하기 어려운 다음 해 조건을 관찰한다.", actionResponsibility: "차이에 맞춰 준비·보류 우선순위를 정한다." },
      { id: "next-year-windows", title: "다음 해 구간 책임", evidenceInterpretation: "다음 해 상·하반기와 전환 구간의 차이를 해석한다.", mechanismResponsibility: "구간별 조건이 준비 순서에 미치는 경로를 설명한다.", observableSignal: "구간별로 먼저 준비할 운영 신호를 확인한다.", actionResponsibility: "다음 해 구간별 준비 책임을 배치한다." },
      { id: "next-year-preparation", title: "사전 준비 전략", evidenceInterpretation: "현재 근거를 지금부터 가능한 사전 준비로 해석한다.", mechanismResponsibility: "현재의 정리와 준비가 다음 해의 선택 범위를 넓히는 경로를 설명한다.", observableSignal: "준비가 실제 자원·역할·기준으로 전환되는지 확인한다.", actionResponsibility: "다음 해 진입 전 준비를 실행하고 검토한다." },
    ],
    evidenceArchitecture: "현재 해와 다음 해의 조건 차이 → 다음 해 구간 → 사전 준비 우선순위로 해석한다.",
    causeArchitecture: "현재 기준선 → 다음 해 변화 → 구간별 준비 조건 → 사전 준비 책임 순서로 조직한다.",
    reviewArtifact: "다음 해 준비 로드맵과 상·하반기 checkpoint",
  },
  "annual-3years": {
    requiredInsights: [
      { id: "three-year-sequencing", title: "3년 연도별 순서", evidenceInterpretation: "근거를 1·2·3년차의 역할 차이로 해석한다.", mechanismResponsibility: "각 연도의 조건이 다음 연도의 준비 순서를 만드는 경로를 설명한다.", observableSignal: "연도별로 유지·전환해야 할 방향을 확인한다.", actionResponsibility: "3년의 실행 순서를 배치한다." },
      { id: "three-year-differences", title: "연도 간 차이", evidenceInterpretation: "세 연도의 압력·자원 차이를 비교한다.", mechanismResponsibility: "차이가 중기 선택과 속도를 어떻게 바꾸는지 연결한다.", observableSignal: "연도별 전환 신호를 관찰한다.", actionResponsibility: "연도별 조정 기준을 정한다." },
      { id: "three-year-direction", title: "중기 방향성", evidenceInterpretation: "공유 근거를 3년 동안 유지할 방향으로 해석한다.", mechanismResponsibility: "누적 변화가 중기 운영 구조로 이어지는 경로를 설명한다.", observableSignal: "방향성이 누적되고 있는지 확인한다.", actionResponsibility: "중기 유지 기준을 설정한다." },
      { id: "three-year-transition", title: "3년 전환·준비", evidenceInterpretation: "주요 전환점과 준비 순서를 해석한다.", mechanismResponsibility: "전환 조건이 다음 단계의 준비 책임으로 이어지는 경로를 설명한다.", observableSignal: "전환을 앞당기거나 늦추는 조건을 관찰한다.", actionResponsibility: "전환점별 준비·조정 책임을 기록한다." },
    ],
    evidenceArchitecture: "1·2·3년차 차이와 누적 변화 → 중기 방향성 → 전환점과 준비 순서로 해석한다.",
    causeArchitecture: "연도별 조건 → 연도 간 누적·차이 → 중기 방향 → 3년 전환 순서로 조직한다.",
    reviewArtifact: "3개년 sequencing map과 연도별 전환 checkpoint",
  },
  "monthly-12months": {
    requiredInsights: [
      { id: "rolling-year-strength", title: "12개월 흐름 강약", evidenceInterpretation: "근거를 앞으로 12개월의 강약 구간으로 해석한다.", mechanismResponsibility: "월별 변화가 전체 rolling horizon의 속도와 우선순위에 미치는 경로를 설명한다.", observableSignal: "강하게 움직이거나 조정해야 할 핵심 월을 관찰한다.", actionResponsibility: "12개월 실행 타이밍의 우선순위를 정한다." },
      { id: "rolling-year-key-window", title: "핵심 월·구간", evidenceInterpretation: "전체 기간에서 중요한 월과 구간을 선별한다.", mechanismResponsibility: "선별된 구간이 실행·조정 순서로 이어지는 경로를 설명한다.", observableSignal: "핵심 월의 압력과 자원 변화를 확인한다.", actionResponsibility: "핵심 구간에 실행·보류 책임을 배치한다." },
      { id: "rolling-year-adjustment", title: "조정 구간", evidenceInterpretation: "근거를 속도를 줄이고 조정할 구간으로 해석한다.", mechanismResponsibility: "조정 구간이 다음 실행의 준비 조건을 만드는 경로를 설명한다.", observableSignal: "과부하와 방향 전환의 신호를 관찰한다.", actionResponsibility: "조정 구간의 hold/adjust 기준을 정한다." },
      { id: "rolling-year-transition", title: "12개월 전환 책임", evidenceInterpretation: "월별 변화가 전체 기간의 전환 구조로 어떻게 누적되는지 해석한다.", mechanismResponsibility: "전환 구간이 다음 rolling window의 준비 순서로 이어지는 경로를 설명한다.", observableSignal: "흐름이 바뀌는 전환 신호를 확인한다.", actionResponsibility: "전환 시점의 실행 타이밍과 재검토 책임을 정한다." },
    ],
    evidenceArchitecture: "12개월 강약 → 핵심 월·조정 구간 → 전환 구간 → 실행 타이밍으로 해석한다.",
    causeArchitecture: "rolling-month 조건 → 핵심 구간 선별 → 조정 구간 → 전체 전환 순서로 조직한다.",
    reviewArtifact: "12개월 rolling timing map과 핵심 월 조정 체크리스트",
  },
  "daeun-current": {
    requiredInsights: [
      { id: "daeun-theme", title: "현재 대운 테마", evidenceInterpretation: "근거를 현재 대운을 관통하는 장기 테마로 해석한다.", mechanismResponsibility: "대운의 구조가 수년 단위 선택과 운영에 미치는 경로를 설명한다.", observableSignal: "장기 테마가 반복되는 조건을 관찰한다.", actionResponsibility: "대운 전체에서 유지할 대응 원칙을 정한다." },
      { id: "daeun-phase", title: "현재 국면", evidenceInterpretation: "현재 입력에 고정된 대운 위치를 국면으로 해석한다.", mechanismResponsibility: "현재 위치가 상승·조정·전환 판단에 미치는 경로를 설명한다.", observableSignal: "현재 국면의 반복 신호를 확인한다.", actionResponsibility: "현재 국면에 맞춰 속도와 자원을 조정한다." },
      { id: "daeun-recurring-task", title: "반복 장기 과제", evidenceInterpretation: "공유 근거를 대운 동안 반복되는 과제로 해석한다.", mechanismResponsibility: "반복 과제가 장기 구조와 행동 선택으로 이어지는 경로를 설명한다.", observableSignal: "같은 과제가 다시 나타나는 조건을 관찰한다.", actionResponsibility: "반복 과제의 장기 검토 기준을 만든다." },
      { id: "daeun-transition", title: "다음 대운 전환", evidenceInterpretation: "기준 기간에 제시된 범위 안에서 다음 전환 조건만 해석한다.", mechanismResponsibility: "현재 국면의 축적이 전환 준비로 이어지는 경로를 설명한다.", observableSignal: "전환을 준비하게 하는 장기 조건을 확인한다.", actionResponsibility: "수년 단위 전환 준비와 조정 책임을 정한다." },
    ],
    evidenceArchitecture: "대운 장기 테마 → 현재 국면 → 반복 과제 → 전환 조건으로 해석한다.",
    causeArchitecture: "수년 구조 → 현재 phase → 반복 장기 과제 → 다음 phase 전환 책임 순서로 조직한다.",
    reviewArtifact: "대운 phase map과 수년 단위 전환 체크리스트",
  },
  "lifetime-overview": {
    requiredInsights: [
      { id: "lifetime-structure", title: "생애 반복 구조", evidenceInterpretation: "근거를 생애 전체에서 반복되는 구조로 해석한다.", mechanismResponsibility: "반복 구조가 선택과 관계의 장기 패턴으로 이어지는 경로를 설명한다.", observableSignal: "여러 국면에서 되풀이되는 조건을 관찰한다.", actionResponsibility: "생애 전체에서 유지할 구조적 기준을 정한다." },
      { id: "lifetime-strength", title: "장기 강점", evidenceInterpretation: "공유 근거를 여러 phase에서 유지되는 강점으로 해석한다.", mechanismResponsibility: "강점이 장기 선택의 안정성으로 이어지는 경로를 설명한다.", observableSignal: "강점이 반복적으로 작동하는 조건을 확인한다.", actionResponsibility: "장기 강점을 다음 선택에 적용한다." },
      { id: "lifetime-vulnerability", title: "반복 취약점", evidenceInterpretation: "근거를 생애 동안 반복될 수 있는 취약 조건으로 해석한다.", mechanismResponsibility: "취약점이 phase 전환에서 어떻게 재현되는지 연결한다.", observableSignal: "취약 패턴이 다시 시작되는 조건을 관찰한다.", actionResponsibility: "반복 취약점의 예방·조정 기준을 만든다." },
      { id: "lifetime-transition", title: "큰 전환의 성격", evidenceInterpretation: "특정 연도 예측이 아니라 큰 전환의 성격과 조건으로 해석한다.", mechanismResponsibility: "전환 조건이 phase 간 재정렬 책임으로 이어지는 경로를 설명한다.", observableSignal: "국면이 바뀌는 반복 신호를 확인한다.", actionResponsibility: "전환기에 준비·유지·조정할 원칙을 정한다." },
    ],
    evidenceArchitecture: "생애 반복 구조 → 장기 강점·취약점 → phase 전환 성격으로 해석한다.",
    causeArchitecture: "반복 패턴 → 장기 구조의 작동 방식 → 전환 조건 → cross-phase synthesis 순서로 조직한다.",
    reviewArtifact: "생애 phase synthesis와 반복 패턴 검토표",
  },
};

const PERIOD_ANALYSIS_STRATEGY_DEFINITIONS: readonly PeriodAnalysisStrategyDefinition[] = [
  {
    productId: "monthly-current",
    periodType: "monthly",
    timeGranularity: "month",
    coreQuestion: "이번 달 안에서 지금 무엇을 우선해야 하는가",
    focus: [
      "기준 월 전체의 흐름과 체감되는 변화",
      "이번 달 안에서 힘이 실리는 구간과 조심할 구간",
      "이번 달 안에 바로 실행할 행동의 우선순위",
      "지금 상황에서 확인할 수 있는 현실 신호",
    ],
    timelineSpec: {
      labels: [
        "이번 달 초반",
        "이번 달 중반",
        "이번 달 후반",
        "이번 달 전체의 핵심 전환",
      ],
      rule: "한 달 내부의 구간 변화만 다루고, 분기·반기·연 단위 전망으로 확장하지 않는다.",
    },
    prohibitedPatterns: [
      "생애 전체나 장기 인생론으로 확장하는 서술",
      "3개월·6개월·1년 같은 연 단위 장기 전망",
      "특정 날짜의 사건이나 길흉을 단정하는 표현",
    ],
  },
  {
    productId: "monthly-next",
    periodType: "monthly",
    timeGranularity: "month",
    coreQuestion: "다음 달에 들어가기 전에 무엇을 준비해야 하는가",
    focus: [
      "다음 달에 들어오는 운영 조건과 핵심 흐름",
      "직전 달과 비교해 달라지는 조건과 observable difference",
      "다음 달의 짧은 압력·자원 신호와 관찰 창",
      "다음 달의 hold/adjust/review 행동 책임",
    ],
    timelineSpec: {
      labels: [
        "다음 달 진입 전 준비",
        "다음 달 초반",
        "다음 달 중반",
        "다음 달 후반",
      ],
      rule: "진입 전 준비와 해당 월 내부의 구간 변화를 다루고, 직전 달의 상황을 다시 분석하지 않는다.",
    },
    prohibitedPatterns: [
      "직전 달(이번 달) 분석을 그대로 반복하는 서술",
      "장기 인생론이나 연 단위 전망으로의 확장",
      "특정 날짜의 사건을 단정하는 표현",
    ],
  },
  {
    productId: "yearly-current",
    periodType: "yearly",
    timeGranularity: "year",
    coreQuestion: "올해의 전반 흐름에서 어떤 조건과 부담을 관찰·조정·점검해야 하는가",
    focus: [
      "현재 연도에 누적되는 압력과 자원 균형",
      "지속 조건과 일시 조건을 구분하는 연간 운영 전환 신호",
      "연간 자원 배분에 따라 조정·보류할 우선순위",
      "연중 checkpoint와 연말 carry-forward/reset 기준",
    ],
    timelineSpec: {
      labels: ["올해의 운영 기준선", "연중 압력·자원 변화", "올해의 조정 검토", "연말 운영 재점검"],
      rule: "월별 사건이나 특정 날짜를 예측하지 않고, 연 단위 운영 조건·관찰 신호·검토 우선순위만 다룬다.",
    },
    prohibitedPatterns: [
      "특정 승진·이직·소득·관계·질병 사건을 올해 반드시 일어난다고 단정하는 표현",
      "월별 사건을 장황하게 나열하는 서술",
      "대운의 장기 구조를 올해 상품의 중심 결론으로 확장하는 서술",
    ],
  },
  {
    productId: "annual-next",
    periodType: "yearly",
    timeGranularity: "year",
    coreQuestion: "다음 해의 핵심 변화는 무엇이고 지금 무엇을 준비해야 하는가",
    focus: [
      "기준 연도(실제 연도 숫자)를 명시한 핵심 테마",
      "현재 해와 비교해 달라지는 흐름",
      "다음 해의 주요 기회 구간과 주의 구간",
      "지금부터 진행할 사전 준비 전략",
    ],
    timelineSpec: {
      labels: [
        "다음 해 상반기",
        "다음 해 하반기",
        "다음 해의 핵심 전환 구간",
        "지금부터의 사전 준비",
      ],
      rule: "다음 해 내부의 큰 구간을 기준으로 구분하고, 각 항목에서 실제 기준 연도 숫자를 사용한다.",
    },
    prohibitedPatterns: [
      "현재 해(올해) 운 분석을 반복하는 서술",
      "실제 연도 없이 '내년'이라는 상대 표현만 사용하는 서술",
      "특정 사건의 발생을 확정하는 표현",
    ],
  },
  {
    productId: "annual-3years",
    periodType: "yearly-series",
    timeGranularity: "multi-year",
    coreQuestion: "향후 3년의 방향성과 주요 전환점은 무엇인가",
    focus: [
      "1년차·2년차·3년차 각각의 역할과 성격",
      "세 연도 사이의 차이와 변화의 방향",
      "중기적으로 유지해야 할 방향성",
      "3년에 걸쳐 누적되는 변화",
      "주요 전환점과 장기 준비 순서",
    ],
    timelineSpec: {
      labels: [
        "1년차",
        "2년차",
        "3년차",
        "3년 전체의 전환점과 준비 순서",
      ],
      rule: "각 연도 항목의 period에는 기준 기간에 제시된 실제 연도를 사용하고, 세 연도를 반드시 서로 비교해 차이를 드러낸다.",
    },
    prohibitedPatterns: [
      "월 단위 타이밍 분석으로 내려가는 서술",
      "3년을 하나의 뭉뚱그린 문단으로 처리하는 서술",
      "특정 사건의 발생을 확정하는 표현",
    ],
  },
  {
    productId: "monthly-12months",
    periodType: "monthly-series",
    timeGranularity: "rolling-months",
    coreQuestion: "앞으로 12개월 중 언제 움직이고 언제 조정해야 하는가",
    focus: [
      "12개월 전체 흐름의 강약",
      "힘이 실리는 핵심 월과 구간",
      "속도를 줄이고 조정할 월과 구간",
      "흐름이 바뀌는 전환 구간",
      "실행 타이밍의 우선순위",
    ],
    timelineSpec: {
      labels: [
        "가장 강하게 움직일 구간",
        "조정이 필요한 구간",
        "흐름이 바뀌는 전환 구간",
        "12개월 전체 강약 요약",
      ],
      rule: "월 단위 해상도를 사용하되 12개월을 모두 같은 분량으로 나열하지 말고, 실제 연·월을 붙여 핵심 월과 강약 구간만 선별한다.",
    },
    prohibitedPatterns: [
      "연 단위 중기 인생 방향으로 확장하는 서술",
      "12개월을 기계적으로 동일 분량으로 나열하는 서술",
      "특정 사건의 발생을 확정하는 표현",
    ],
  },
  {
    productId: "daeun-current",
    periodType: "daeun",
    timeGranularity: "daeun",
    coreQuestion: "현재 대운의 장기 테마와 현재 위치는 무엇인가",
    focus: [
      "현재 대운을 관통하는 핵심 테마",
      "상승·조정·전환 국면의 구분",
      "이 대운에서 반복되는 장기 과제",
      "현재 시점이 이 대운의 어느 위치인지",
      "수년 단위의 장기 대응 전략",
    ],
    timelineSpec: {
      labels: [
        "현재 대운의 진입 국면",
        "현재 위치한 국면",
        "이후 조정 국면",
        "다음 대운으로의 전환 조건",
      ],
      rule: "월이나 특정 연도가 아니라 수년 단위의 장기 국면으로 구분한다.",
    },
    prohibitedPatterns: [
      "기준 기간에 제시되지 않은 대운 번호나 간지를 추정해 만들어내는 서술",
      "월 단위 단기 예측",
      "특정 사건의 발생을 확정하는 표현",
    ],
  },
  {
    productId: "lifetime-overview",
    periodType: "lifetime",
    timeGranularity: "lifetime",
    coreQuestion: "생애 전체에서 반복되는 구조와 큰 전환 패턴은 무엇인가",
    focus: [
      "생애 전체를 관통하는 구조",
      "삶에서 반복되는 선택과 관계의 패턴",
      "장기적으로 유지되는 강점",
      "장기적으로 반복되는 취약점",
      "큰 전환이 나타나는 성격과 조건",
    ],
    timelineSpec: {
      labels: [
        "생애 초반의 구조",
        "생애 중반의 구조",
        "생애 후반의 구조",
        "생애 전체의 큰 전환 성격",
      ],
      rule: "생애 국면과 장기 전환 중심으로 서술하고, 특정 연도나 월을 지목하지 않는다.",
    },
    prohibitedPatterns: [
      "3개월·6개월·1년 같은 단기 전망",
      "특정 연도나 월의 사건을 예측하는 서술",
      "기준 기간에 분석 대상 기간(coverage)이 있다고 가정하는 서술",
    ],
  },
];

export const PERIOD_ANALYSIS_STRATEGIES: readonly PeriodAnalysisStrategy[] =
  PERIOD_ANALYSIS_STRATEGY_DEFINITIONS.map((strategy) => {
    const ownership = PERIOD_OWNERSHIP_CONTRACTS[strategy.productId];
    if (!ownership) {
      throw new Error(`Missing period ownership contract: ${strategy.productId}`);
    }

    return { ...strategy, ...ownership };
  });

const STRATEGY_BY_PRODUCT_ID = new Map(
  PERIOD_ANALYSIS_STRATEGIES.map((strategy) => [strategy.productId, strategy]),
);

const PERIOD_STRATEGY_ALIASES: Record<string, string> = {
  "annual-current": "yearly-current",
};

/** Null for TOPIC, legacy and unknown products. */
export function getPeriodAnalysisStrategy(
  productId: string | undefined,
): PeriodAnalysisStrategy | null {
  const canonicalProductId = productId
    ? PERIOD_STRATEGY_ALIASES[productId] ?? productId
    : undefined;
  return canonicalProductId
    ? STRATEGY_BY_PRODUCT_ID.get(canonicalProductId) ?? null
    : null;
}

const TIME_GRANULARITY_LABELS: Record<PeriodAnalysisTimeGranularity, string> = {
  month: "한 달 내부 (월 내 구간)",
  year: "1개 연도 (반기·분기 구간)",
  "multi-year": "여러 연도 (연도별 비교)",
  "rolling-months": "앞으로의 연속 월 (월 단위 타이밍)",
  daeun: "대운 단위 (수년 단위 장기 국면)",
  lifetime: "생애 전체 (장기 국면과 전환)",
};

export function formatPeriodStrategyForPrompt(
  strategy: PeriodAnalysisStrategy,
): string {
  return [
    `핵심 질문: ${strategy.coreQuestion}`,
    `시간 해상도: ${TIME_GRANULARITY_LABELS[strategy.timeGranularity]}`,
    "반드시 분석할 내용:",
    ...strategy.focus.map((item) => `- ${item}`),
    "시간축 구성:",
    `- ${strategy.timelineSpec.rule}`,
    `- futureTimeline은 ${strategy.timelineSpec.labels.join(" / ")}의 정확히 ${strategy.timelineSpec.labels.length}개 항목으로 작성한다.`,
    "이 분석에서 하지 말아야 할 것:",
    ...strategy.prohibitedPatterns.map((item) => `- ${item}`),
  ].join("\n");
}

export function formatPeriodOwnershipContractForPrompt(
  strategy: PeriodAnalysisStrategy,
): string {
  const responsibilities = strategy.requiredInsights
    .map(
      (insight, index) =>
        `${index + 1}. ${insight.title}
   - responsibility: ${insight.evidenceInterpretation}
   - mechanism: ${insight.mechanismResponsibility}
   - observable signal: ${insight.observableSignal}
   - action/review: ${insight.actionResponsibility}`,
    )
    .join("\n");

  return [
    "[기간 상품 고유 책임 계약]",
    `- expected required responsibilities: ${strategy.requiredInsights.length}`,
    "- 각 책임은 반드시 evidence → mechanism → observable signal → product implication → action/review responsibility 순서로 추적한다.",
    "- 공유 사주 근거를 사용하더라도 아래 기간 상품의 해석 책임을 다른 기간 상품의 문장으로 대체하지 않는다.",
    `- evidence architecture: ${strategy.evidenceArchitecture}`,
    `- cause architecture: ${strategy.causeArchitecture}`,
    `- review artifact: ${strategy.reviewArtifact}`,
    "- required responsibilities:",
    responsibilities,
  ].join("\n");
}

export function buildPeriodTimelineConsistencyRule(
  strategy: PeriodAnalysisStrategy,
): string {
  return `- futureTimeline은 ${TIME_GRANULARITY_LABELS[strategy.timeGranularity]} 해상도를 유지하며, ${strategy.timelineSpec.rule}
`;
}

export function buildPeriodTimelineSectionRules(
  strategy: PeriodAnalysisStrategy,
): string {
  return [
    `- ${strategy.timelineSpec.labels.join(", ")}의 정확히 ${strategy.timelineSpec.labels.length}개 항목을 작성한다.`,
    `- ${strategy.timelineSpec.rule}`,
    "- period에는 기준 기간에 고정된 실제 연·월 표현을 사용하고, 기준 기간에 없는 시점을 새로 만들지 않는다.",
    "- 각 항목은 서로 다른 구간을 다루며 같은 내용을 반복하지 않는다.",
    "- 모든 시기를 무조건 좋거나 나쁘다고 단정하지 않는다.",
    ...strategy.prohibitedPatterns.map((item) => `- ${item}을 하지 않는다.`),
    "",
  ].join("\n");
}
