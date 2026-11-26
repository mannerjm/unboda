import { z } from "zod";
import { NEW_YEAR_DOMAINS, NEW_YEAR_PRODUCT_ID } from "./newYearFortune";
import type { PeriodAnalysisProductType } from "./analysisPeriodProducts";
import type {
  PeriodAnalysisStrategy,
  PeriodAnalysisTimeGranularity,
} from "./analysisPeriodStrategy";

const PERIOD_ANALYSIS_SCALES = [
  "monthly",
  "monthly-series",
  "yearly",
  "yearly-series",
  "daeun",
  "lifetime",
] as const satisfies readonly PeriodAnalysisProductType[];

// Fails to compile if a new PeriodAnalysisProductType is added without a scale.
type UncoveredScale = Exclude<
  PeriodAnalysisProductType,
  (typeof PERIOD_ANALYSIS_SCALES)[number]
>;
const _allScalesCovered: UncoveredScale[] = [];
void _allScalesCovered;

export const PeriodAnalysisBlockSchema = z.object({
  productId: z.string().min(1),
  scale: z.enum(PERIOD_ANALYSIS_SCALES),
  headline: z.string().trim().min(10),
  timelineItems: z
    .array(
      z.object({
        // Opaque ordering key; real dates stay in referencePeriod.
        periodKey: z.string().trim().min(1),
        label: z.string().trim().min(1),
        title: z.string().trim().min(2),
        summary: z.string().trim().min(20),
        intensity: z.enum(["강", "보통", "조정", "전환"]).optional(),
        actions: z.array(z.string().trim().min(10)).max(3).optional(),
        cautions: z.array(z.string().trim().min(10)).max(3).optional(),
      }),
    )
    .min(2)
    .max(12),
  keyPoints: z.array(z.string().trim().min(10)).min(2).max(5).optional(),
  newYearDomains: z.array(z.object({label:z.enum(NEW_YEAR_DOMAINS),summary:z.string().trim().min(45),action:z.string().trim().min(10),caution:z.string().trim().min(10)})).length(8).optional(),
});

export type PeriodAnalysisBlock = z.infer<typeof PeriodAnalysisBlockSchema>;

const PERIOD_KEY_PREFIX: Record<PeriodAnalysisTimeGranularity, string> = {
  month: "segment",
  year: "segment",
  "multi-year": "year",
  "rolling-months": "window",
  daeun: "phase",
  lifetime: "stage",
};

function getPeriodKey(
  strategy: PeriodAnalysisStrategy,
  index: number,
): string {
  return `${PERIOD_KEY_PREFIX[strategy.timeGranularity]}-${index + 1}`;
}

/** JSON contract fragment injected only for PERIOD products. */
export function buildPeriodAnalysisJsonContract(
  strategy: PeriodAnalysisStrategy,
): string {
  const items = strategy.timelineSpec.labels
    .map(
      (label, index) => `    {
      "periodKey": "${getPeriodKey(strategy, index)}",
      "label": "${label}",
      "title": "${label}의 핵심을 한 문장으로",
      "summary": "${label}에서 확인할 변화와 판단 기준을 20자 이상으로 설명",
      "intensity": "강 | 보통 | 조정 | 전환 중 하나",
      "actions": ["이 구간에서 실행할 행동"],
      "cautions": ["이 구간에서 주의할 점"]
    }`,
    )
    .join(",\n");

  return `"periodAnalysis": {
  "productId": "${strategy.productId}",
  "scale": "${strategy.periodType}",
  "headline": "이 기간 전체를 관통하는 결론을 한 문장으로",
  "timelineItems": [
${items}
  ],
  "keyPoints": [
    "이 기간에서 기억할 핵심 1",
    "이 기간에서 기억할 핵심 2"
  ]${strategy.productId === NEW_YEAR_PRODUCT_ID ? `,\n  "newYearDomains": [\n${NEW_YEAR_DOMAINS.map(label => JSON.stringify({label,summary:"개인 실제 계산과 연결한 분야별 상세 분석",action:"현실적인 실천 방법",caution:"주의할 조건"})).join(",\n")}\n  ]` : ""}
},
`;
}

export function buildPeriodAnalysisPromptRules(
  strategy: PeriodAnalysisStrategy,
): string {
  return `periodAnalysis 작성 규칙:

- periodAnalysis는 기간별 구조화 데이터이고, futureTimeline은 전체 흐름을 읽기 위한 요약 서사다.
- 두 필드에 같은 문장을 그대로 복사하지 않는다.
- productId는 "${strategy.productId}", scale은 "${strategy.periodType}"을 그대로 사용한다.
- timelineItems는 ${strategy.timelineSpec.labels.join(", ")}의 ${strategy.timelineSpec.labels.length}개 항목으로 작성하고 label을 그대로 사용한다.
- periodKey는 정렬과 식별을 위한 내부 키이므로 ${getPeriodKey(strategy, 0)}부터 순서대로 사용하고, 실제 연도·월·대운 번호를 키로 만들지 않는다.
- 실제 연·월·분석 대상 기간·대운 번호와 간지는 기준 기간에 이미 고정되어 있으므로 새로 계산하거나 추정하지 않는다.
- 기준 기간에 제시되지 않은 대운 번호나 간지를 만들어내지 않는다.
- summary는 ${strategy.timelineSpec.rule}
- intensity는 해당 구간의 힘의 세기나 성격이 실제 근거로 확인될 때만 사용한다.
- actions와 cautions는 해당 구간에만 해당하는 내용을 각각 최대 3개까지 작성하고, 없으면 생략한다.
- keyPoints는 이 기간 전체에서 기억할 핵심을 2~5개로 정리한다.
${strategy.productId===NEW_YEAR_PRODUCT_ID?"- newYearDomains는 지정된 여덟 분야를 정확한 순서로 작성한다. 각 분야 summary는 45자 이상이며 서로 다른 근거와 상황에 연결한다. 각 월 summary에는 일·재물·관계·생활 중 관련 흐름을 설명하고 actions와 cautions를 모두 최소 1개 작성한다. 건강은 생활 관리, 재물은 예산과 위험 관리 관점이다. 월별 계산은 사건 예언이 아니다. 신년운세 전용 고객 언어: 리포트 전체(conclusion, coreProblem, cause의 공개 설명, evidence의 의미, current, timeline, action, avoid, confidence, periodAnalysis)를 친절한 선생님이 이야기하듯 쉬운 한국어로 작성한다. 먼저 어떤 운의 변화가 나타날 수 있는지, 왜 내 사주에서 그런 흐름을 읽는지, 일상에서 어떤 모습으로 나타날 수 있는지 설명하고 마지막에 짧게 할 일을 제안한다. 업무 보고서처럼 책임·범위·조건·문서·절차·기준·리스크를 반복하지 않는다. 어려운 한자, 영어, 명리 전문 용어는 기본 본문에 쓰지 않고 계산 근거 전용 필드에만 둔다. 짧은 문장과 구체적인 생활 예시를 쓴다. 분야별 요약은 각각 해당 분야에서 어떤 변화가 기대되는지, 어떤 시기를 살펴볼지 실제 계산과 연결한다. 미혼·기혼, 직장·사업, 현재 자산 등 입력에 없는 사실은 가정하지 말고 해당하는 경우로 나누어 설명한다. 월별 title은 행동 지시가 아니라 그 달의 운세를 알려주는 짧은 흥미로운 한 줄로 쓰고, summary는 실제 해당 월 계산을 바탕으로 다른 달과 구별되는 흐름과 생활 장면을 설명한다. intensity는 실제 근거가 있을 때만 넣으며 강은 행운이나 수익을 보장하지 않는다. keyPoints 처음 두 항목은 계산상 근거 있는 기회를 살펴볼 때와 조심할 때를 각각 쉬운 말로 설명하고, 특정 월을 뒷받침할 수 없으면 단정하지 않는다. 같은 조언을 다른 말로 반복하지 않는다. 긍정과 주의를 함께 다루며 미래 사건, 건강, 투자, 결혼, 임신을 보장하지 않는다.":""}
`;
}
