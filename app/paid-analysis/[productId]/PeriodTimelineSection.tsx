import type { PeriodAnalysisBlock } from "@/app/lib/analysisPeriodOutput";

type PeriodTimelineSectionProps = {
  periodAnalysis: PeriodAnalysisBlock;
};

export default function PeriodTimelineSection({
  periodAnalysis,
}: PeriodTimelineSectionProps) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-[#2f2a5d] bg-[radial-gradient(circle_at_top_right,rgba(129,111,238,0.24),transparent_28%),linear-gradient(145deg,#1a1935_0%,#26224b_55%,#1b1b35_100%)] p-5 text-white shadow-[0_24px_64px_rgba(29,27,68,0.18)] sm:p-7">
      <div className="pointer-events-none absolute right-[-3rem] top-[-3rem] h-40 w-40 rounded-full border border-white/[0.06]" />

      <div className="relative">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-[#c8c1ff] shadow-[0_0_0_5px_rgba(200,193,255,0.08)]" />
          <p className="text-xs font-semibold tracking-[0.18em] text-[#c8c1ff]">
            기간별 흐름
          </p>
        </div>

        <h3 className="mt-3 text-xl font-bold leading-8 text-white">
          {periodAnalysis.headline}
        </h3>

        <div className="relative mt-6 space-y-4">
          <div className="pointer-events-none absolute bottom-8 left-[19px] top-8 w-px bg-[linear-gradient(180deg,rgba(201,194,255,0.55),rgba(255,255,255,0.08))]" />

          {periodAnalysis.timelineItems.map((item, index) => (
            <article
              key={item.periodKey}
              className="relative grid gap-3 rounded-[1.55rem] border border-white/10 bg-white/[0.07] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:grid-cols-[42px_1fr] sm:p-5"
            >
              <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.10] text-xs font-bold text-white shadow-md">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold tracking-wide text-slate-300">
                    {item.label}
                  </p>

                  {item.intensity ? (
                    <span className="rounded-full border border-[#afa4f6]/30 bg-[#8b79ef]/20 px-2.5 py-1 text-xs font-semibold text-[#ddd8ff]">
                      {item.intensity}
                    </span>
                  ) : null}
                </div>

                <h4 className="mt-2 font-bold leading-7 text-white">{item.title}</h4>

                <p className="mt-2 text-[15px] leading-7 text-slate-200">
                  {item.summary}
                </p>

                {(item.actions && item.actions.length > 0) || (item.cautions && item.cautions.length > 0) ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {item.actions && item.actions.length > 0 ? (
                      <div className="rounded-[1.1rem] border border-emerald-300/15 bg-emerald-300/[0.07] p-3.5">
                        <p className="text-xs font-semibold text-emerald-200">이 구간의 행동</p>
                        <ul className="mt-2 space-y-1.5 text-[15px] leading-7 text-slate-200">
                          {item.actions.map((action) => (
                            <li key={action}>• {action}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {item.cautions && item.cautions.length > 0 ? (
                      <div className="rounded-[1.1rem] border border-rose-300/15 bg-rose-300/[0.07] p-3.5">
                        <p className="text-xs font-semibold text-rose-200">이 구간의 주의</p>
                        <ul className="mt-2 space-y-1.5 text-[15px] leading-7 text-slate-200">
                          {item.cautions.map((caution) => (
                            <li key={caution}>• {caution}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        {periodAnalysis.keyPoints && periodAnalysis.keyPoints.length > 0 ? (
          <div className="mt-5 rounded-[1.4rem] border border-white/12 bg-white/[0.09] p-4.5 backdrop-blur-sm">
            <p className="text-xs font-semibold text-[#c8c1ff]">이 기간의 핵심</p>
            <ul className="mt-3 space-y-2 text-[15px] leading-7 text-slate-200">
              {periodAnalysis.keyPoints.map((point) => (
                <li key={point} className="flex gap-2.5">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b8aef8]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
