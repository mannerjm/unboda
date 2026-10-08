import type { PremiumProductDefinition } from "@/app/lib/premiumProductRegistry";
import { getPaidProductSeoGuide } from "@/app/lib/paidProductSeo";

/**
 * Server-rendered, public pre-purchase guide. This is never a paid result,
 * profile-specific reading, checkout, or substitute for the actual report.
 */
export default function PaidProductSeoIntro({ product }: { product: PremiumProductDefinition }) {
  const guide = getPaidProductSeoGuide(product);

  return (
    <section aria-labelledby="public-paid-product-heading" className="mt-5 overflow-hidden rounded-[1.8rem] border border-[#e1e3ef] bg-white px-5 py-6 shadow-[0_14px_36px_rgba(33,40,83,0.045)] sm:px-8 sm:py-8">
      <p className="text-xs font-extrabold tracking-[0.13em] text-[#6f5ce7]">분석을 선택하기 전에</p>
      <h1 id="public-paid-product-heading" className="mt-3 text-2xl font-black leading-snug tracking-[-0.03em] text-[#11162d] sm:text-3xl">
        {guide.headline}
      </h1>
      <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-700">
        {guide.description}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#e4e3f2] bg-[#f8f7ff] px-5 py-5">
          <h2 className="text-base font-black text-[#25214b]">이런 질문을 살펴봅니다</h2>
          <p className="mt-3 text-[15px] font-semibold leading-7 text-slate-800">{guide.question}</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">{guide.distinction}</p>
        </div>
        <div className="rounded-2xl border border-[#e3e6ef] bg-[#fafbfe] px-5 py-5">
          <h2 className="text-base font-black text-[#25214b]">어떤 내용을 확인하나요?</h2>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
            {guide.focus.map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8b7cf0]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-xs leading-6 text-slate-500">
          명리 분석은 선택을 돕기 위한 참고 자료이며, 미래의 결과나 성과를 보장하지 않습니다.
        </p>
        <a href="#selected-product-title" className="inline-flex rounded-xl bg-[#211f43] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#373069]">
          분석 내용과 가격 확인 ↓
        </a>
      </div>
    </section>
  );
}
