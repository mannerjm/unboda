import type {
  PaidAnalysisAvoidType,
  PaidAnalysisDecisionDirection,
  ResolvedPaidAnalysisDetailV4,
} from "@/app/lib/paidAnalysisDetailOutput";
import PeriodTimelineSection from "./PeriodTimelineSection";

type PaidAnalysisV4ReportProps = {
  detail: ResolvedPaidAnalysisDetailV4;
  analysisType: string;
};

const DIRECTION_BADGE_CLASS: Record<PaidAnalysisDecisionDirection, string> = {
  확대: "border-emerald-200 bg-emerald-50 text-emerald-800",
  유지: "border-[#d8d3ff] bg-[#f3f1ff] text-[#5e4bd1]",
  조정: "border-amber-200 bg-amber-50 text-amber-800",
  보류: "border-rose-200 bg-rose-50 text-rose-800",
};

const AVOID_TYPE_LABEL: Record<PaidAnalysisAvoidType, string> = {
  misjudgment: "흔한 오판",
  risky_action: "위험한 행동",
  bad_condition: "결정을 망치는 조건",
};

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-bold tracking-[0.16em] text-[#6f5ce7]">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-black tracking-[-0.025em] text-[#11162d] sm:text-2xl">{title}</h2>
      {description ? <p className="mt-2 text-[15px] leading-7 text-slate-600">{description}</p> : null}
    </div>
  );
}

function ReadingCard({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-[#dce1ef] bg-white p-5 shadow-sm">
      <p className="text-xs font-bold tracking-[0.12em] text-slate-500">{eyebrow}</p>
      <h3 className="mt-3 text-base font-bold leading-7 text-[#11162d]">{title}</h3>
      <p className="mt-2 text-[15px] leading-7 text-slate-700">{body}</p>
    </article>
  );
}

function DetailSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.65rem] border border-[#dce1ef] bg-white p-5 shadow-[0_10px_32px_rgba(33,40,83,0.05)] sm:p-6">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function PaidAnalysisV4Report({
  detail,
  analysisType,
}: PaidAnalysisV4ReportProps) {
  const firstOpportunity = detail.current.opportunities[0];
  const firstCaution = detail.current.cautions[0];
  const firstAction = detail.action[0];

  return (
    <main className="min-h-screen bg-[#f5f7fc] text-[#11162d]">
      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-8 sm:py-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#6f5ce7]">PREMIUM REPORT</p>
            <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#11162d] sm:text-3xl">{analysisType}</h1>
          </div>
          {detail.referencePeriod ? (
            <span className="rounded-full border border-[#d8d3ff] bg-[#f3f1ff] px-3 py-1.5 text-xs font-semibold text-[#5e4bd1]">
              분석 기준 · {detail.referencePeriod.labelSnapshot}
            </span>
          ) : null}
        </div>

        <section className="relative mt-5 overflow-hidden rounded-[1.8rem] border border-[#d8d3ff] bg-[radial-gradient(circle_at_top_right,rgba(112,88,229,0.16),transparent_34%),linear-gradient(145deg,#ffffff_0%,#f8f7ff_58%,#f2f4fb_100%)] px-5 py-7 shadow-[0_22px_60px_rgba(43,45,94,0.09)] sm:px-8 sm:py-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${DIRECTION_BADGE_CLASS[detail.conclusion.direction]}`}>
              {detail.conclusion.direction}
            </span>
            <span className="text-xs font-semibold text-slate-500">결론 먼저</span>
          </div>

          <h2 className="mt-5 max-w-4xl text-3xl font-black leading-[1.28] tracking-[-0.04em] text-[#11162d] sm:text-4xl">
            {detail.conclusion.headline}
          </h2>
          <p className="mt-5 max-w-3xl text-sm leading-8 text-slate-600 sm:text-[15px]">
            <span className="font-bold text-[#11162d]">대상 · </span>{detail.conclusion.focus}
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-8 text-slate-600 sm:text-[15px]">{detail.conclusion.rationale}</p>

          <div className="mt-7 rounded-[1.5rem] border border-[#d8d3ff] bg-white/85 p-5">
            <p className="text-xs font-bold tracking-[0.14em] text-[#6f5ce7]">지금 바로 할 것</p>
            <p className="mt-2 text-base font-bold leading-7 text-[#11162d]">{detail.conclusion.immediateAction}</p>
          </div>
        </section>

        <section className="mt-5 rounded-[1.75rem] border border-[#dce1ef] bg-[#f9faff] p-5 sm:p-6">
          <SectionHeader
            eyebrow="KEY POINTS"
            title="핵심 포인트"
            description="전체 리포트를 읽기 전에 결론을 움직이는 핵심만 먼저 확인합니다."
          />
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <ReadingCard eyebrow="핵심 문제" title={detail.coreProblem.title} body={detail.coreProblem.whyItMatters} />
            <ReadingCard
              eyebrow="현재 흐름"
              title={firstOpportunity?.situation ?? firstCaution?.situation ?? "지금의 기회와 주의"}
              body={firstOpportunity?.implication ?? firstCaution?.implication ?? detail.current.summary}
            />
            <ReadingCard
              eyebrow="행동 방향"
              title={firstAction?.action ?? detail.conclusion.immediateAction}
              body={firstAction ? `대상 · ${firstAction.target} · 조건 · ${firstAction.condition}` : detail.conclusion.immediateAction}
            />
          </div>
        </section>

        <div className="mt-5 space-y-4">
          <DetailSection
            eyebrow="01 · 문제 정의"
            title="지금 가장 중요한 문제"
            description="현재 판단에서 무엇을 먼저 정리해야 하는지 설명합니다."
          >
            <p className="text-[15px] leading-8 text-slate-700">{detail.coreProblem.description}</p>
            <p className="mt-4 rounded-2xl border border-[#dce1ef] bg-[#f7f8fc] px-4 py-3 text-[15px] leading-7 text-slate-700">{detail.coreProblem.whyItMatters}</p>
          </DetailSection>

          <DetailSection
            eyebrow="02 · 원인"
            title="왜 이런 결과가 나오는가"
            description="관찰된 구조와 현실 패턴이 결론으로 이어지는 과정을 나눠 봅니다."
          >
            <p className="text-[15px] leading-8 text-slate-700">{detail.cause.summary}</p>
            <div className="mt-4 grid gap-3">
              {detail.cause.reasons.map((reason, index) => (
                <article key={reason.title} className="rounded-[1.5rem] border border-[#dce1ef] bg-[#fafbff] p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6f5ce7] text-xs font-bold text-white">{String(index + 1).padStart(2, "0")}</span>
                    <p className="text-sm font-bold text-[#11162d]">{reason.title}</p>
                  </div>
                  <p className="mt-4 text-[15px] leading-7 text-slate-700">{reason.observedStructure}</p>
                  <p className="mt-2 text-[15px] leading-7 text-slate-700">{reason.realWorldPattern}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{reason.problemLinkage}</p>
                </article>
              ))}
            </div>
          </DetailSection>

          <DetailSection
            eyebrow="03 · 근거"
            title="명리 근거"
            description="결론을 뒷받침한 계산 사실과 그 의미를 분리해 보여줍니다."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {detail.evidence.map((item) => (
                <article key={item.evidenceKey} className="rounded-[1.5rem] border border-[#dce1ef] bg-white p-5">
                  <p className="text-xs font-bold tracking-[0.12em] text-[#6f5ce7]">{item.label}</p>
                  <p className="mt-3 rounded-xl bg-[#f3f1ff] px-3 py-2 text-sm font-bold text-[#11162d]">{item.fact}</p>
                  <p className="mt-3 text-[15px] leading-7 text-slate-700">{item.meaning}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.linkage}</p>
                </article>
              ))}
            </div>
          </DetailSection>

          <DetailSection
            eyebrow="04 · 현재 흐름"
            title="지금의 기회와 주의할 점"
            description="같은 시기에도 활용할 수 있는 힘과 조심할 조건을 따로 봅니다."
          >
            <p className="text-[15px] leading-8 text-slate-700">{detail.current.summary}</p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/70 p-5">
                <p className="text-xs font-bold tracking-[0.12em] text-emerald-700">기회</p>
                <div className="mt-4 space-y-3">
                  {detail.current.opportunities.map((item) => (
                    <article key={item.situation} className="rounded-2xl bg-white p-4 ring-1 ring-emerald-100">
                      <p className="text-sm font-bold text-[#11162d]">{item.situation}</p>
                      <p className="mt-2 text-[15px] leading-7 text-slate-700">{item.implication}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">관찰 신호 · {item.observableSignal}</p>
                    </article>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50/70 p-5">
                <p className="text-xs font-bold tracking-[0.12em] text-rose-700">주의</p>
                <div className="mt-4 space-y-3">
                  {detail.current.cautions.map((item) => (
                    <article key={item.situation} className="rounded-2xl bg-white p-4 ring-1 ring-rose-100">
                      <p className="text-sm font-bold text-[#11162d]">{item.situation}</p>
                      <p className="mt-2 text-[15px] leading-7 text-slate-700">{item.implication}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">관찰 신호 · {item.observableSignal}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </DetailSection>

          <DetailSection eyebrow="05 · 변화 신호" title="앞으로 확인할 변화 신호">
            <ol className="space-y-4">
              {detail.timeline.map((item, index) => (
                <li key={item.label} className="grid gap-3 rounded-[1.5rem] border border-[#dce1ef] bg-[#fafbff] p-5 sm:grid-cols-[42px_1fr]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#171a3d] text-xs font-bold text-white">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-sm font-bold text-[#11162d]">{item.label}</p>
                    <p className="mt-2 text-[15px] leading-7 text-slate-700">{item.changeSignal}</p>
                    <p className="mt-2 text-[15px] leading-7 text-slate-600">준비 · {item.preparation}</p>
                  </div>
                </li>
              ))}
            </ol>
          </DetailSection>

          {detail.periodAnalysis ? <PeriodTimelineSection periodAnalysis={detail.periodAnalysis} /> : null}

          <section className="rounded-[1.75rem] border border-[#d8d3ff] bg-[linear-gradient(145deg,#f3f1ff_0%,#fbfcff_100%)] p-5 shadow-[0_12px_36px_rgba(54,45,112,0.06)] sm:p-6">
            <SectionHeader
              eyebrow="ACTION GUIDE"
              title="행동 제안"
              description="읽고 끝나지 않도록 바로 실행할 행동과 피할 행동을 마지막에 모았습니다."
            />
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[#d8d3ff] bg-white p-5">
                <p className="text-xs font-bold text-[#5e4bd1]">무엇을 할 것인가</p>
                <div className="mt-4 space-y-3">
                  {detail.action.map((item, index) => (
                    <article key={item.action} className="rounded-2xl border border-[#e5e1ff] bg-[#faf9ff] p-4">
                      <p className="text-xs font-bold tracking-[0.11em] text-[#6f5ce7]">실천 {String(index + 1).padStart(2, "0")}</p>
                      <p className="mt-2 text-sm font-bold leading-6 text-[#11162d]">{item.action}</p>
                      <p className="mt-2 text-[15px] leading-7 text-slate-700">대상 · {item.target}</p>
                      <p className="mt-1 text-[15px] leading-7 text-slate-700">조건 · {item.condition}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">완료 기준 · {item.completionCriteria}</p>
                    </article>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-[#dce1ef] bg-white p-5">
                <p className="text-xs font-bold text-slate-600">무엇을 피할 것인가</p>
                <div className="mt-4 space-y-3">
                  {detail.avoid.map((item) => (
                    <article key={item.behavior} className="rounded-2xl border border-[#dce1ef] bg-[#f7f8fc] p-4">
                      <p className="text-xs font-bold text-slate-600">{AVOID_TYPE_LABEL[item.type]}</p>
                      <p className="mt-2 text-sm font-bold leading-6 text-[#11162d]">{item.behavior}</p>
                      <p className="mt-2 text-[15px] leading-7 text-slate-700">{item.reason}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {detail.decisionCheck ? (
            <DetailSection eyebrow="FINAL CHECK" title="결정 전 확인">
              <ul className="grid gap-3 sm:grid-cols-2">
                {detail.decisionCheck.map((question) => (
                  <li key={question} className="flex gap-3 rounded-2xl border border-[#dce1ef] bg-[#f9faff] px-4 py-3 text-[15px] leading-7 text-slate-700">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6f5ce7] text-xs font-bold text-white">✓</span>
                    <span>{question}</span>
                  </li>
                ))}
              </ul>
            </DetailSection>
          ) : null}

          <DetailSection
            eyebrow="CONFIDENCE & LIMITS"
            title="분석 신뢰도와 한계"
            description="계산 근거가 강한 부분과 해석이 개입한 부분을 구분합니다."
          >
            <span className="inline-flex rounded-full border border-[#d8d3ff] bg-[#f3f1ff] px-3 py-1.5 text-sm font-bold text-[#5e4bd1]">신뢰도 {detail.confidence.level}</span>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/60 p-5">
                <p className="text-sm font-bold text-emerald-800">계산 근거가 뒷받침하는 부분</p>
                <ul className="mt-3 space-y-2">
                  {detail.confidence.strongestEvidence.map((item) => (
                    <li key={item} className="text-[15px] leading-7 text-slate-700">· {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[1.5rem] border border-[#dce1ef] bg-[#f7f8fc] p-5">
                <p className="text-sm font-bold text-slate-700">해석이 개입한 부분</p>
                <ul className="mt-3 space-y-2">
                  {detail.confidence.uncertaintyFactors.map((item) => (
                    <li key={item} className="text-[15px] leading-7 text-slate-700">· {item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-5 text-[15px] leading-7 text-slate-600">{detail.confidence.limitations}</p>
          </DetailSection>
        </div>
      </div>
    </main>
  );
}
