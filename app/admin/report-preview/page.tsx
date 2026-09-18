import Link from "next/link";
import { redirect } from "next/navigation";
import PaidAnalysisV4Report from "@/app/paid-analysis/[productId]/PaidAnalysisV4Report";
import type { ResolvedPaidAnalysisDetailV4 } from "@/app/lib/paidAnalysisDetailOutput";
import { OperatorAuthorizationError, requireOperator } from "@/app/lib/operators/server";

export const dynamic = "force-dynamic";

const SAMPLE_REPORT: ResolvedPaidAnalysisDetailV4 = {
  schemaVersion: "v4",
  conclusion: {
    headline: "지금은 수입을 급하게 늘리기보다 안정적으로 남기는 구조를 먼저 만드는 시기입니다.",
    direction: "조정",
    focus: "재물·수입 안정성",
    rationale: "현재 흐름은 기회를 넓히는 힘과 지출·변동성을 키우는 요인이 함께 보여, 규모 확대보다 현금흐름과 반복 가능한 수입 구조를 먼저 정리하는 편이 유리합니다.",
    immediateAction: "이번 달 고정비와 변동비를 나누고, 줄일 수 있는 반복 지출 한 가지를 바로 정리해 보세요.",
  },
  coreProblem: {
    title: "수입의 크기보다 남는 구조가 불안정한 점",
    description: "돈이 들어오는 기회는 있어도 지출과 선택이 함께 커지면 체감 안정성은 낮아질 수 있습니다. 지금은 더 벌기 위한 선택보다 이미 들어오는 돈이 어디에서 새는지를 먼저 확인해야 합니다.",
    whyItMatters: "현금흐름이 정리되지 않은 상태에서 규모를 키우면 좋은 기회가 와도 부담으로 바뀔 수 있기 때문입니다.",
  },
  cause: {
    summary: "현재 재물 흐름은 기회와 변동성이 동시에 나타나는 구조라서, 선택의 우선순위를 명확히 할수록 체감 안정성이 높아집니다.",
    reasons: [
      {
        title: "기회는 있지만 속도를 조절해야 합니다",
        observedStructure: "활용 가능한 흐름과 변동성 신호가 함께 나타납니다.",
        realWorldPattern: "새로운 수입원이나 제안에 관심이 생기지만 동시에 비용이나 책임도 함께 커질 수 있습니다.",
        problemLinkage: "기회를 모두 잡으려 하면 수입 증가보다 관리 부담이 먼저 커질 수 있습니다.",
      },
      {
        title: "반복 지출이 체감 안정성을 낮출 수 있습니다",
        observedStructure: "재물의 흐름이 한 방향으로 고정되기보다 여러 갈래로 분산되는 경향이 보입니다.",
        realWorldPattern: "소액 결제나 고정비처럼 한 번에 크게 느껴지지 않는 비용이 누적되기 쉽습니다.",
        problemLinkage: "수입이 유지돼도 실제로 남는 금액이 줄어드는 원인이 될 수 있습니다.",
      },
    ],
  },
  evidence: [
    {
      evidenceKey: "fortune_flow",
      label: "현재 운의 흐름",
      fact: "기회 요인과 주의 요인이 함께 존재하는 변동성 구간",
      meaning: "확대보다 선택과 관리가 중요한 시기라는 뜻입니다.",
      linkage: "재물 판단에서는 수익 가능성뿐 아니라 유지 비용과 현금흐름을 같이 봐야 합니다.",
    },
    {
      evidenceKey: "element_balance",
      label: "오행 균형",
      fact: "특정 요소가 상대적으로 강하고 보완이 필요한 요소가 존재",
      meaning: "한 방향으로 과하게 몰기보다 균형을 맞추는 방식이 안정적입니다.",
      linkage: "수입원을 늘릴 때도 한 번에 여러 선택을 하기보다 우선순위를 정하는 편이 좋습니다.",
    },
    {
      evidenceKey: "daeun",
      label: "대운",
      fact: "기존 기반을 재정비하면서 방향을 조정하는 흐름",
      meaning: "지금의 변화는 단기 성과보다 구조 재정비에 의미가 있습니다.",
      linkage: "장기 재물 안정성은 지출 구조와 반복 가능한 수입 기반을 정리할수록 좋아집니다.",
    },
    {
      evidenceKey: "seun",
      label: "세운",
      fact: "결정이 빠르게 늘어날 수 있는 해의 흐름",
      meaning: "선택지가 많아질수록 기준을 미리 정해두는 것이 중요합니다.",
      linkage: "재물에서는 즉흥적인 결정이나 과도한 확장을 줄이는 것이 핵심입니다.",
    },
  ],
  current: {
    summary: "현재는 돈을 더 벌 수 있는 기회를 찾는 것과 동시에, 이미 가진 흐름을 안정적으로 관리하는 작업이 필요합니다.",
    opportunities: [
      {
        situation: "기존 경험을 활용한 추가 수입 기회",
        implication: "새로운 것을 처음부터 시작하기보다 이미 잘하는 영역을 확장할 때 효율이 높습니다.",
        observableSignal: "기존 고객·지인·업무 경험에서 반복 요청이나 제안이 생기는지 확인",
      },
      {
        situation: "비용 구조를 단순하게 만들 기회",
        implication: "고정비를 한 번 정리하면 이후 판단 여유가 커질 수 있습니다.",
        observableSignal: "최근 3개월 동안 사용 빈도가 낮은 정기 결제 항목 점검",
      },
    ],
    cautions: [
      {
        situation: "성과를 앞당기기 위한 과도한 지출",
        implication: "수익이 확정되기 전에 비용부터 커질 수 있습니다.",
        observableSignal: "예상 매출보다 선결제·선투자 금액이 먼저 커지는지 확인",
      },
      {
        situation: "여러 기회를 동시에 잡으려는 선택",
        implication: "관리 비용과 집중력 소모가 늘어 실질 수익성이 낮아질 수 있습니다.",
        observableSignal: "한 달 안에 새로운 프로젝트나 지출 항목이 여러 개 동시에 늘어나는지 확인",
      },
    ],
  },
  timeline: [
    {
      label: "지금부터 1~2개월",
      changeSignal: "지출 구조를 정리하면 체감 여유가 먼저 생기기 시작합니다.",
      preparation: "고정비·변동비·선택 지출을 구분해 기록하세요.",
    },
    {
      label: "그다음 3~6개월",
      changeSignal: "반복적으로 요청받는 일이나 수입원이 더 분명하게 보일 수 있습니다.",
      preparation: "수익성과 시간 대비 효율이 높은 활동을 남기세요.",
    },
    {
      label: "그 이후",
      changeSignal: "관리 가능한 범위에서 수입원을 넓히는 선택이 쉬워집니다.",
      preparation: "확장 전에 최소 2~3개월의 현금흐름 안정성을 확인하세요.",
    },
  ],
  timelineSource: "topic-relative",
  action: [
    {
      action: "반복 지출 한 가지 줄이기",
      target: "월 고정비",
      condition: "최근 2개월 이상 사용 빈도가 낮은 항목",
      completionCriteria: "해지 또는 더 저렴한 요금제로 변경",
    },
    {
      action: "수입 활동을 효율 기준으로 정렬하기",
      target: "현재 하고 있는 업무·부업·프로젝트",
      condition: "시간 대비 수익과 반복 가능성을 함께 비교",
      completionCriteria: "유지·확대·중단 세 그룹으로 분류",
    },
    {
      action: "확장 비용 상한 정하기",
      target: "새로운 투자·장비·광고비",
      condition: "매출이 확정되기 전",
      completionCriteria: "월 가용 현금 범위 안에서 최대 금액을 숫자로 결정",
    },
  ],
  avoid: [
    {
      type: "risky_action",
      behavior: "수익이 확인되기 전에 큰 비용을 먼저 집행하는 것",
      reason: "현재는 기회와 변동성이 함께 있어 선투자가 체감 부담으로 바뀔 가능성이 있습니다.",
    },
    {
      type: "misjudgment",
      behavior: "매출 증가를 곧바로 재정 안정으로 판단하는 것",
      reason: "들어오는 돈보다 실제로 남는 구조를 함께 봐야 안정성을 정확히 판단할 수 있습니다.",
    },
    {
      type: "bad_condition",
      behavior: "여러 선택을 동시에 시작해 관리 기준이 없는 상태",
      reason: "선택지가 많아질수록 우선순위가 흐려져 비용과 집중력 소모가 커질 수 있습니다.",
    },
  ],
  decisionCheck: [
    "이 선택이 월 현금흐름을 실제로 개선하는가?",
    "수익이 늦어져도 감당 가능한 비용인가?",
    "기존에 잘하는 일을 활용하는 선택인가?",
    "한 달 뒤에도 반복할 수 있는 구조인가?",
  ],
  confidence: {
    level: "중간",
    strongestEvidence: [
      "현재 운에서 기회와 주의 신호가 동시에 나타나는 점",
      "단기 확장보다 구조 조정이 더 중요하게 보이는 흐름",
      "재물 판단에서 균형과 관리 기준이 반복적으로 강조되는 점",
    ],
    uncertaintyFactors: [
      "실제 소득·자산·부채 규모는 리포트 입력에 포함되지 않습니다.",
      "직업 환경과 계약 조건에 따라 같은 흐름의 체감은 달라질 수 있습니다.",
    ],
    limitations: "이 미리보기는 Phase 6 디자인 확인을 위한 샘플 데이터입니다. 실제 개인 리포트의 분석 결과가 아니며, 구매 권한이나 실제 저장 리포트를 생성하지 않습니다.",
  },
};

export default async function AdminReportPreviewPage() {
  try {
    await requireOperator();
  } catch (error) {
    if (error instanceof OperatorAuthorizationError && error.code === "UNAUTHENTICATED") {
      redirect("/auth/login?returnTo=/admin/report-preview");
    }

    return (
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-14 text-slate-900">
        <div className="mx-auto w-full max-w-xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">REPORT PREVIEW</p>
          <h1 className="mt-3 text-3xl font-bold">접근 권한 없음</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">이 미리보기는 승인된 운영자만 사용할 수 있습니다.</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fc]">
      <div className="mx-auto max-w-5xl px-5 pt-8 sm:px-8">
        <div className="rounded-[1.5rem] border border-[#d8d3ff] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-[#6f5ce7]">ADMIN DESIGN PREVIEW</p>
              <h1 className="mt-2 text-xl font-black text-[#11162d]">Phase 6 유료 심층분석 리포트 미리보기</h1>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                실제 구매·주문·entitlement를 만들지 않는 샘플 화면입니다. 아래 내용은 디자인 확인용 예시입니다.
              </p>
            </div>
            <Link href="/admin" className="rounded-full border border-[#dce1ef] bg-[#f7f8fc] px-4 py-2 text-sm font-semibold text-slate-700">
              ← 관리자 페이지
            </Link>
          </div>
        </div>
      </div>
      <PaidAnalysisV4Report detail={SAMPLE_REPORT} analysisType="재물·수입 안정성 심층 분석" />
    </div>
  );
}
