"use client";

import { useState, useId } from "react";
import type { PeriodAnalysisBlock } from "@/app/lib/analysisPeriodOutput";

type PeriodTimelineSectionProps = {
  periodAnalysis: PeriodAnalysisBlock;
  seasonalView?: "summary" | "details" | "all";
};

const DOMAIN_STYLES: Record<string, { icon: string; card: string; heading: string }> = {
  "재물운": { icon: "💰", card: "border-amber-200 bg-[#fffaf0]", heading: "text-amber-900" },
  "직업운": { icon: "💼", card: "border-blue-200 bg-[#f2f6ff]", heading: "text-blue-900" },
  "사업운": { icon: "📈", card: "border-emerald-200 bg-[#f0faf5]", heading: "text-emerald-900" },
  "연애·결혼운": { icon: "♡", card: "border-rose-200 bg-[#fff2f6]", heading: "text-rose-900" },
  "대인관계운": { icon: "🤝", card: "border-violet-200 bg-[#f8f2ff]", heading: "text-violet-900" },
  "가족운": { icon: "🏠", card: "border-orange-200 bg-[#fff6ed]", heading: "text-orange-900" },
  "건강운": { icon: "🌿", card: "border-teal-200 bg-[#effaf9]", heading: "text-teal-900" },
  "학업·자기계발운": { icon: "📖", card: "border-indigo-200 bg-[#f2f4ff]", heading: "text-indigo-900" },
};

function NewYearMonthCalendar({ periodAnalysis }: { periodAnalysis: PeriodAnalysisBlock }) {
  const [selected, setSelected] = useState<number | null>(null);
  const panelId = useId();
  const item = selected === null ? undefined : periodAnalysis.timelineItems[selected];
  return <>
    <div className="mt-4 grid grid-cols-2 items-stretch gap-2 sm:grid-cols-3 sm:gap-3">
      {periodAnalysis.timelineItems.map((item, index) => <button type="button" key={item.periodKey} aria-expanded={selected === index} aria-controls={panelId} onClick={() => setSelected(selected === index ? null : index)} className={`min-w-0 rounded-2xl border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600 sm:p-4 ${selected === index ? "border-violet-600 bg-violet-50 ring-1 ring-violet-600" : "border-[#e6dbf5] bg-[#faf7ff] hover:border-violet-400"}`}>
        <span className="flex items-center justify-between gap-2"><span className="text-lg font-black text-[#7951b0]">{item.label}</span><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={`h-4 w-4 shrink-0 text-violet-800 ${selected === index ? "rotate-180" : ""}`}><path d="m5 7 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
        {item.intensity ? <span className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-semibold ${item.intensity === "조정" ? "bg-amber-100 text-amber-900" : item.intensity === "전환" ? "bg-violet-100 text-violet-900" : "bg-white text-[#54445b]"}`}>{{강:"흐름이 강한 달",보통:"차분히 살필 달",조정:"속도를 조절할 달",전환:"변화를 살필 달"}[item.intensity]}</span> : null}
        <span className="mt-2 block break-keep text-sm font-bold leading-6">{item.title}</span>
      </button>)}
    </div>
    <div id={panelId} aria-live="polite" className={item ? "mt-4 rounded-2xl border border-violet-200 bg-white p-4 sm:p-6" : "sr-only"}>
      {item ? <><h4 className="break-keep text-xl font-black text-[#281744]">{item.label} · {item.title}</h4>
        <p className="mt-3 break-words text-[15px] leading-7 text-slate-700">{item.summary}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {item.actions?.length ? <div className="rounded-xl bg-emerald-50 p-3"><p className="font-bold text-emerald-900">이렇게 해보세요</p><ul className="mt-2 space-y-2 text-sm leading-7 text-slate-700">{item.actions.map((action,i)=><li key={i}>{action}</li>)}</ul></div> : null}
          {item.cautions?.length ? <div className="rounded-xl bg-rose-50 p-3"><p className="font-bold text-rose-900">조심할 점</p><ul className="mt-2 space-y-2 text-sm leading-7 text-slate-700">{item.cautions.map((caution,i)=><li key={i}>{caution}</li>)}</ul></div> : null}
        </div></> : <span>궁금한 달을 선택하면 자세한 내용이 표시됩니다.</span>}
    </div>
  </>;
}

export default function PeriodTimelineSection({
  periodAnalysis,
  seasonalView = "all",
}: PeriodTimelineSectionProps) {
  if (periodAnalysis.productId === "new-year-fortune") {
    return <section className="rounded-[2rem] border border-[#ded0f5] bg-white p-4 text-[#281744] shadow-sm sm:p-7">
      {seasonalView !== "details" ? <>
        <p className="text-sm font-bold text-[#7951b0]">나의 새해 운세 한눈에 보기</p>
        <h3 className="mt-2 break-keep text-xl font-bold leading-8">{periodAnalysis.headline}</h3>
        {periodAnalysis.keyPoints?.length ? <div className="mt-4 rounded-2xl bg-[#f3eafa] p-4"><h3 className="font-bold">올해 기억할 운의 흐름</h3><ul className="mt-2 space-y-2 text-[15px] leading-7">{periodAnalysis.keyPoints.map((point,i)=><li key={i}>• {point}</li>)}</ul></div> : null}
        <nav aria-label="신년운세 바로 보기" className="mt-4 flex flex-wrap gap-2"><a href="#new-year-domains" className="rounded-full border border-[#ded0f5] bg-white px-4 py-3 text-sm font-bold">8가지 운세 보기 ↓</a><a href="#new-year-months" className="rounded-full border border-[#ded0f5] bg-white px-4 py-3 text-sm font-bold">열두 달 운세 보기 ↓</a></nav>
      </> : null}
      {seasonalView !== "summary" ? <>
        <h3 id="new-year-domains" className="scroll-mt-6 text-xl font-bold">나의 8가지 운세</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {periodAnalysis.newYearDomains?.map(domain => {
            const style = DOMAIN_STYLES[domain.label] ?? { icon: "✧", card: "border-violet-200 bg-[#faf7ff]", heading: "text-violet-900" };
            return <article key={domain.label} className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${style.card}`}>
              <h4 className={`flex items-center gap-2 text-base font-black ${style.heading}`}><span aria-hidden="true" className="text-xl">{style.icon}</span>{domain.label}</h4>
              <p className="mt-3 break-words text-[15px] leading-7 text-slate-700">{domain.summary}</p>
              <p className="mt-3 text-sm leading-7 text-slate-700"><strong className="text-slate-900">이렇게 해보세요</strong> · {domain.action}</p>
              <p className="mt-2 text-sm leading-7 text-slate-700"><strong className="text-slate-900">조심할 점</strong> · {domain.caution}</p>
            </article>;
          })}
        </div>
        <h3 id="new-year-months" className="mt-8 scroll-mt-6 text-xl font-bold">열두 달의 운세</h3>
        <p className="mt-2 text-sm leading-6 text-[#54445b]">궁금한 달을 누르면 아래에 자세한 운세가 펼쳐져요.</p>
        <NewYearMonthCalendar periodAnalysis={periodAnalysis} />
      </> : null}
    </section>;
  }
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-[#2f2a5d] bg-[radial-gradient(circle_at_top_right,rgba(129,111,238,0.24),transparent_28%),linear-gradient(145deg,#1a1935_0%,#26224b_55%,#1b1b35_100%)] p-5 text-white shadow-[0_24px_64px_rgba(29,27,68,0.18)] sm:p-7">
      <div className="pointer-events-none absolute right-[-3rem] top-[-3rem] h-40 w-40 rounded-full border border-white/[0.06]" />

      <div className="relative">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-[#c8c1ff] shadow-[0_0_0_5px_rgba(200,193,255,0.08)]" />
          <p className="text-xs font-semibold tracking-[0.18em] text-[#c8c1ff]">
            시기마다 달라지는 나의 운세
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
                        <p className="text-xs font-semibold text-emerald-200">이렇게 해보세요</p>
                        <ul className="mt-2 space-y-1.5 text-[15px] leading-7 text-slate-200">
                          {item.actions.map((action) => (
                            <li key={action}>• {action}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {item.cautions && item.cautions.length > 0 ? (
                      <div className="rounded-[1.1rem] border border-rose-300/15 bg-rose-300/[0.07] p-3.5">
                        <p className="text-xs font-semibold text-rose-200">조심하면 좋은 점</p>
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
            <p className="text-xs font-semibold text-[#c8c1ff]">이 시기에 기억할 이야기</p>
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
