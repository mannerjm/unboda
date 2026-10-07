import { buildPaidAnalysisV4PreviewModel } from "@/app/lib/paidAnalysisV4PreviewModel";
import type { PremiumProductDefinition } from "@/app/lib/premiumProductRegistry";

export default function PremiumReportValuePreview({
  product,
}: {
  product: PremiumProductDefinition;
}) {
  const preview = buildPaidAnalysisV4PreviewModel(product);

  if (!preview) return null;

  return (
    <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-[#d9deed] bg-white shadow-[0_12px_32px_rgba(33,40,83,0.06)]">
      <div className="border-b border-[#e1e5f0] bg-[linear-gradient(135deg,#f4f2ff_0%,#fbfcff_100%)] px-5 py-5 sm:px-6">
        <p className="text-xs font-bold tracking-[0.14em] text-slate-500">리포트 구성 미리보기</p>
        <p className="mt-2 text-base font-bold text-[#11162d]">{preview.eyebrow}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          실제 분석 결과를 미리 보여주는 화면이 아니라, 현재 리포트 생성 기준에서 어떤 순서·깊이·시기 근거로 분석되는지 안내합니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-[#d8d3ff] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#5e4bd1]">
            {preview.timeValue.badge}
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="rounded-2xl bg-[#171a3d] px-4 py-4 text-white">
          <p className="text-xs font-bold tracking-[0.12em] text-[#aaa2f2]">이 리포트가 답하는 핵심 질문</p>
          <p className="mt-2 text-sm font-semibold leading-6">{preview.question}</p>
        </div>

        <div className="mt-4">
          <article className="rounded-2xl border border-[#dce1ef] bg-[#f7f8fc] p-4">
            <p className="text-xs font-bold tracking-[0.08em] text-slate-500">시기 반영 방식</p>
            <p className="mt-2 text-sm font-bold leading-6 text-[#11162d]">{preview.timeValue.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{preview.timeValue.description}</p>
          </article>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {preview.cards.map((card) => (
            <article key={card.step} className="rounded-2xl border border-[#dce1ef] bg-white p-4 shadow-[0_4px_14px_rgba(33,40,83,0.04)]">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#6f5ce7] text-xs font-bold text-white">
                  {card.step}
                </span>
                <div>
                  <p className="text-xs font-bold tracking-[0.08em] text-[#6f5ce7]">{card.eyebrow}</p>
                  <p className="mt-1 text-sm font-bold leading-6 text-[#11162d]">{card.title}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{card.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 border-t border-[#dce1ef] pt-5">
          <p className="text-xs font-bold text-slate-800">{preview.topicLabel}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {preview.topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-[#d8d3ff] bg-[#f3f1ff] px-3 py-1.5 text-xs font-semibold leading-5 text-slate-700"
              >
                {topic}
              </span>
            ))}
          </div>

          <div className="mt-4 rounded-2xl bg-[#f7f8fc] px-4 py-4">
            <p className="text-sm font-semibold leading-6 text-slate-700">{preview.footer}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              실제 문장과 판단 기준은 선택한 프로필의 계산 결과와 분석 시점에 따라 달라집니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
