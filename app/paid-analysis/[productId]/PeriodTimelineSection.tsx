import type { PeriodAnalysisBlock } from "@/app/lib/analysisPeriodOutput";

type PeriodTimelineSectionProps = {
  periodAnalysis: PeriodAnalysisBlock;
};

export default function PeriodTimelineSection({
  periodAnalysis,
}: PeriodTimelineSectionProps) {
  return (
    <div className="rounded-[1.75rem] border border-[#dce1ef] bg-white p-5 shadow-[0_10px_32px_rgba(33,40,83,0.05)] sm:p-7">
      <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">
        기간별 흐름
      </p>

      <h3 className="mt-2 text-xl font-bold text-[#11162d]">
        {periodAnalysis.headline}
      </h3>

      <div className="mt-4 space-y-3">
        {periodAnalysis.timelineItems.map((item) => (
          <article
            key={item.periodKey}
            className="rounded-[1.5rem] border border-[#dce1ef] bg-[#fafbff] p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold tracking-wide text-slate-500">
                {item.label}
              </p>

              {item.intensity ? (
                <span className="rounded-full bg-[#6f5ce7] px-2 py-0.5 text-xs font-semibold text-white">
                  {item.intensity}
                </span>
              ) : null}
            </div>

            <h4 className="mt-1 font-bold text-[#11162d]">{item.title}</h4>

            <p className="mt-2 text-[15px] leading-7 text-slate-700">
              {item.summary}
            </p>

            {item.actions && item.actions.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold text-emerald-700">이 구간의 행동</p>
                <ul className="mt-1 space-y-1 text-[15px] leading-7 text-slate-700">
                  {item.actions.map((action) => (
                    <li key={action}>• {action}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {item.cautions && item.cautions.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold text-rose-700">이 구간의 주의</p>
                <ul className="mt-1 space-y-1 text-[15px] leading-7 text-slate-700">
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
        <div className="mt-4 rounded-2xl bg-[#eef0f6] p-4">
          <p className="text-xs font-semibold text-slate-500">이 기간의 핵심</p>
          <ul className="mt-2 space-y-1 text-[15px] leading-7 text-slate-700">
            {periodAnalysis.keyPoints.map((point) => (
              <li key={point}>• {point}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
