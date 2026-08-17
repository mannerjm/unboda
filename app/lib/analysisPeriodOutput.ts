import { z } from "zod";
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
  ]
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
`;
}
