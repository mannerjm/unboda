import type { PeriodAnalysisBlock } from "@/app/lib/analysisPeriodOutput";

type PeriodTimelineSectionProps = {
  periodAnalysis: PeriodAnalysisBlock;
};

export default function PeriodTimelineSection({
  periodAnalysis,
}: PeriodTimelineSectionProps) {
  return (
    <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
      <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">
        기간별 흐름
      </p>

      <h3 className="mt-2 text-xl font-bold text-stone-950">
        {periodAnalysis.headline}
      </h3>

      <div className="mt-5 space-y-4">
        {periodAnalysis.timelineItems.map((item) => (
          <article
            key={item.periodKey}
            className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold tracking-wide text-stone-500">
                {item.label}
              </p>

              {item.intensity ? (
                <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {item.intensity}
                </span>
              ) : null}
            </div>

            <h4 className="mt-1 font-bold text-stone-900">{item.title}</h4>

            <p className="mt-2 text-sm leading-6 text-stone-600">
              {item.summary}
            </p>

            {item.actions && item.actions.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold text-emerald-700">이 구간의 행동</p>
                <ul className="mt-1 space-y-1 text-sm leading-6 text-stone-600">
                  {item.actions.map((action) => (
                    <li key={action}>• {action}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {item.cautions && item.cautions.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold text-rose-700">이 구간의 주의</p>
                <ul className="mt-1 space-y-1 text-sm leading-6 text-stone-600">
                  {item.cautions.map((caution) => (
                    <li key={caution}>• {caution}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {periodAnalysis.keyPoints && periodAnalysis.keyPoints.length > 0 ? (
        <div className="mt-5 rounded-2xl bg-stone-100 p-4">
          <p className="text-xs font-semibold text-stone-500">이 기간의 핵심</p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-stone-700">
            {periodAnalysis.keyPoints.map((point) => (
              <li key={point}>• {point}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
