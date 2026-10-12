import Link from "next/link";
import {
  groupTopicCatalogProductsByCategory,
  listPeriodCatalogProducts,
} from "@/app/lib/premiumCatalog";

/**
 * Public, crawler-readable links to the same 57 Launch products that the
 * interactive catalog already sells. It does not expose user entitlements,
 * session data, personalized analysis or non-Launch registry products.
 *
 * Keep this directory separate from PremiumCatalogSection so its guided
 * question-first experience and purchase routing are not changed.
 */
export default function PaidProductDiscoveryLinks() {
  const topicGroups = groupTopicCatalogProductsByCategory();
  const periods = listPeriodCatalogProducts();

  return (
    <section aria-labelledby="paid-product-directory-heading" className="mt-6 rounded-[1.5rem] border border-[#e2e4ee] bg-white px-5 py-5 shadow-sm sm:px-7">
      <details className="group">
        <summary className="cursor-pointer list-none rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7560df] [&::-webkit-details-marker]:hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-wide text-[#705cda]">분석 주제 전체 보기</p>
              <h2 id="paid-product-directory-heading" className="mt-2 text-lg font-black text-[#11162d] sm:text-xl">
                57가지 심층 분석을 한눈에 보기
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                찾는 주제가 정해져 있다면 목록에서 바로 자세한 설명을 확인하세요.
              </p>
            </div>
            <span aria-hidden="true" className="shrink-0 rounded-full border border-[#e4e2f0] bg-[#f8f7ff] px-3 py-2 text-xs font-bold text-[#6a58c9]">
              펼쳐보기
            </span>
          </div>
        </summary>

        <div className="mt-6 grid gap-6 border-t border-[#e8e9f2] pt-6 sm:grid-cols-2 lg:grid-cols-3">
          {topicGroups.map((group) => (
            <section key={group.category} aria-label={group.label}>
              <h3 className="text-sm font-black text-[#242746]">{group.label}</h3>
              <ul className="mt-3 space-y-1.5">
                {group.products.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/paid-analysis/${product.id}`}
                      className="inline-flex min-h-8 items-center text-sm leading-6 text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-[#5949bd] hover:decoration-[#5949bd]"
                    >
                      {product.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <section aria-label="시기별 분석">
            <h3 className="text-sm font-black text-[#242746]">시기별 분석</h3>
            <ul className="mt-3 space-y-1.5">
              {periods.map((product) => (
                <li key={product.id}>
                  <Link
                    href={`/paid-analysis/${product.id}`}
                    className="inline-flex min-h-8 items-center text-sm leading-6 text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-[#5949bd] hover:decoration-[#5949bd]"
                  >
                    {product.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <p className="mt-6 text-xs leading-6 text-slate-500">
          각 페이지에서는 로그인 없이 분석 내용을 소개합니다. 개인별 분석과 구매는 기존 로그인·프로필 확인 절차를 따릅니다.
        </p>
      </details>
    </section>
  );
}
