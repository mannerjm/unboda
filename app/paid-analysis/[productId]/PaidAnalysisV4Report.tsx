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
  확대: "bg-emerald-100 text-emerald-800",
  유지: "bg-stone-200 text-stone-800",
  조정: "bg-amber-100 text-amber-800",
  보류: "bg-rose-100 text-rose-800",
};

const AVOID_TYPE_LABEL: Record<PaidAnalysisAvoidType, string> = {
  misjudgment: "흔한 오판",
  risky_action: "위험한 행동",
  bad_condition: "결정을 망치는 조건",
};

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
      <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">
        {title}
      </p>

      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function PaidAnalysisV4Report({
  detail,
  analysisType,
}: PaidAnalysisV4ReportProps) {
  return (
    <main className="min-h-screen bg-[#f7f2e8]">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold tracking-[0.22em] text-stone-500">
            PREMIUM REPORT
          </p>

          <h1 className="mt-3 text-2xl font-bold text-stone-950 sm:text-3xl">
            {analysisType}
          </h1>

          {detail.referencePeriod ? (
            <p className="mt-3 inline-flex rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-700">
              분석 기준 · {detail.referencePeriod.labelSnapshot}
            </p>
          ) : null}
        </div>

        <div className="mt-6 space-y-5">
          <section className="rounded-[2rem] bg-stone-950 p-6 text-white shadow-xl sm:p-8">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${DIRECTION_BADGE_CLASS[detail.conclusion.direction]}`}
            >
              {detail.conclusion.direction}
            </span>

            <h2 className="mt-4 text-2xl font-bold leading-tight sm:text-3xl">
              {detail.conclusion.headline}
            </h2>

            <p className="mt-4 text-sm leading-7 text-stone-300">
              <span className="font-semibold text-white">대상 · </span>
              {detail.conclusion.focus}
            </p>

            <p className="mt-2 text-sm leading-7 text-stone-300">
              {detail.conclusion.rationale}
            </p>

            <div className="mt-5 rounded-2xl bg-white/10 px-5 py-4">
              <p className="text-xs font-semibold tracking-[0.18em] text-amber-300">
                지금 바로 할 것
              </p>

              <p className="mt-2 text-sm font-semibold leading-7">
                {detail.conclusion.immediateAction}
              </p>
            </div>
          </section>

          <SectionCard title="지금 가장 중요한 문제">
            <h3 className="text-lg font-bold text-stone-950">
              {detail.coreProblem.title}
            </h3>

            <p className="mt-3 text-sm leading-7 text-stone-700">
              {detail.coreProblem.description}
            </p>

            <p className="mt-3 rounded-2xl bg-stone-100 px-4 py-3 text-sm leading-7 text-stone-800">
              {detail.coreProblem.whyItMatters}
            </p>
          </SectionCard>

          <SectionCard title="왜 이런 결과가 나오는가">
            <p className="text-sm leading-7 text-stone-700">
              {detail.cause.summary}
            </p>

            <ul className="mt-4 space-y-4">
              {detail.cause.reasons.map((reason) => (
                <li
                  key={reason.title}
                  className="rounded-2xl border border-stone-200 px-4 py-4"
                >
                  <p className="text-sm font-bold text-stone-900">
                    {reason.title}
                  </p>

                  <p className="mt-2 text-sm leading-7 text-stone-700">
                    {reason.observedStructure}
                  </p>

                  <p className="mt-1 text-sm leading-7 text-stone-700">
                    {reason.realWorldPattern}
                  </p>

                  <p className="mt-1 text-sm leading-7 text-stone-500">
                    {reason.problemLinkage}
                  </p>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="명리 근거">
            <ul className="space-y-4">
              {detail.evidence.map((item) => (
                <li
                  key={item.evidenceKey}
                  className="rounded-2xl border border-stone-200 px-4 py-4"
                >
                  <p className="text-xs font-semibold tracking-[0.14em] text-stone-500">
                    {item.label}
                  </p>

                  <p className="mt-2 rounded-xl bg-stone-100 px-3 py-2 text-sm font-semibold text-stone-900">
                    {item.fact}
                  </p>

                  <p className="mt-2 text-sm leading-7 text-stone-700">
                    {item.meaning}
                  </p>

                  <p className="mt-1 text-sm leading-7 text-stone-500">
                    {item.linkage}
                  </p>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="지금의 기회와 주의할 점">
            <p className="text-sm leading-7 text-stone-700">
              {detail.current.summary}
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-emerald-700">기회</p>

                <ul className="mt-2 space-y-3">
                  {detail.current.opportunities.map((item) => (
                    <li
                      key={item.situation}
                      className="rounded-2xl bg-emerald-50 px-4 py-3"
                    >
                      <p className="text-sm font-semibold text-stone-900">
                        {item.situation}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-stone-700">
                        {item.implication}
                      </p>

                      <p className="mt-1 text-xs leading-6 text-stone-500">
                        관찰 신호 · {item.observableSignal}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold text-rose-700">주의</p>

                <ul className="mt-2 space-y-3">
                  {detail.current.cautions.map((item) => (
                    <li
                      key={item.situation}
                      className="rounded-2xl bg-rose-50 px-4 py-3"
                    >
                      <p className="text-sm font-semibold text-stone-900">
                        {item.situation}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-stone-700">
                        {item.implication}
                      </p>

                      <p className="mt-1 text-xs leading-6 text-stone-500">
                        관찰 신호 · {item.observableSignal}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="앞으로 확인할 변화 신호">
            <ol className="space-y-4">
              {detail.timeline.map((item) => (
                <li
                  key={item.label}
                  className="border-l-2 border-stone-300 pl-4"
                >
                  <p className="text-sm font-bold text-stone-900">
                    {item.label}
                  </p>

                  <p className="mt-1 text-sm leading-7 text-stone-700">
                    {item.changeSignal}
                  </p>

                  <p className="mt-1 text-sm leading-7 text-stone-500">
                    준비 · {item.preparation}
                  </p>
                </li>
              ))}
            </ol>
          </SectionCard>

          {detail.periodAnalysis ? (
            <PeriodTimelineSection periodAnalysis={detail.periodAnalysis} />
          ) : null}

          <SectionCard title="무엇을 할 것인가">
            <ul className="space-y-4">
              {detail.action.map((item) => (
                <li
                  key={item.action}
                  className="rounded-2xl border border-stone-200 px-4 py-4"
                >
                  <p className="text-sm font-bold text-stone-900">
                    {item.action}
                  </p>

                  <p className="mt-2 text-sm leading-7 text-stone-700">
                    대상 · {item.target}
                  </p>

                  <p className="mt-1 text-sm leading-7 text-stone-700">
                    조건 · {item.condition}
                  </p>

                  <p className="mt-1 text-sm leading-7 text-stone-500">
                    완료 기준 · {item.completionCriteria}
                  </p>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="무엇을 피할 것인가">
            <ul className="space-y-3">
              {detail.avoid.map((item) => (
                <li
                  key={item.behavior}
                  className="rounded-2xl bg-stone-100 px-4 py-3"
                >
                  <p className="text-xs font-semibold text-stone-500">
                    {AVOID_TYPE_LABEL[item.type]}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-stone-900">
                    {item.behavior}
                  </p>

                  <p className="mt-1 text-sm leading-7 text-stone-700">
                    {item.reason}
                  </p>
                </li>
              ))}
            </ul>
          </SectionCard>

          {detail.decisionCheck ? (
            <SectionCard title="결정 전 확인">
              <ul className="space-y-2">
                {detail.decisionCheck.map((question) => (
                  <li
                    key={question}
                    className="text-sm leading-7 text-stone-700"
                  >
                    · {question}
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}

          <SectionCard title="분석 신뢰도와 한계">
            <p className="text-sm font-semibold text-stone-800">
              신뢰도 {detail.confidence.level}
            </p>

            <p className="mt-4 text-xs font-semibold text-stone-500">
              계산 근거가 뒷받침하는 부분
            </p>

            <ul className="mt-2 space-y-1">
              {detail.confidence.strongestEvidence.map((item) => (
                <li key={item} className="text-sm leading-7 text-stone-700">
                  · {item}
                </li>
              ))}
            </ul>

            <p className="mt-4 text-xs font-semibold text-stone-500">
              해석이 개입한 부분
            </p>

            <ul className="mt-2 space-y-1">
              {detail.confidence.uncertaintyFactors.map((item) => (
                <li key={item} className="text-sm leading-7 text-stone-700">
                  · {item}
                </li>
              ))}
            </ul>

            <p className="mt-4 text-sm leading-7 text-stone-500">
              {detail.confidence.limitations}
            </p>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
