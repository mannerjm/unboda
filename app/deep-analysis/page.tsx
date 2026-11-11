import Link from "next/link";
import AppShell from "@/app/components/AppShell";
import PremiumCatalogSection from "@/app/components/PremiumCatalogSection";
import PaidProductDiscoveryLinks from "@/app/components/PaidProductDiscoveryLinks";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { buildPublicMetadata } from "@/app/lib/seo";

export const metadata = buildPublicMetadata({
  title: "심층 사주 분석",
  description: "이직·재물·연애·건강·학업 등 지금 궁금한 주제를 골라 개인 맞춤 심층 사주 분석을 확인하세요.",
  path: "/deep-analysis",
});

type DeepAnalysisSearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSingleParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function DeepAnalysisPage({ searchParams }: { searchParams?: DeepAnalysisSearchParams }) {
  const user = await getCurrentUser();
  const activeProfile = user ? await getActiveProfile(user.id) : null;
  const params = searchParams ? await searchParams : {};
  const initialCategory = getSingleParam(params.category);
  const initialMode = getSingleParam(params.mode) === "period" ? "period" : "topic";
  // Period navigation is a direct product detail link, not a second catalog.
  const initialProductId = initialMode === "period" ? getSingleParam(params.productId) : undefined;

  const catalogContent = (
      <main className="min-h-screen bg-[radial-gradient(ellipse_at_50%_0%,#ffffff_0%,#faf5ff_55%,#efe6ff_100%)] px-5 py-6 text-[#281744] sm:px-8 sm:py-7">
        <div className="mx-auto w-full max-w-6xl">
          <section className="relative overflow-hidden rounded-[2rem] border border-[#e0d0f7] bg-[radial-gradient(circle_at_85%_12%,rgba(206,170,255,.45),transparent_36%),linear-gradient(130deg,#fffefe_0%,#f8f0ff_65%,#eae0ff_100%)] px-6 py-5 text-[#281744] shadow-[0_18px_48px_rgba(113,75,171,.11)] sm:px-8 sm:py-6">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#7759db]/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-8rem] left-[18%] h-56 w-56 rounded-full bg-[#d36e9c]/10 blur-3xl" />
            <div className="relative grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="max-w-3xl">
                <p className="text-xs font-black tracking-[0.16em] text-[#8551ca]">원하는 분석 바로 찾기</p>
                <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.05em] sm:text-4xl">어떤 운이 궁금하세요?</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#655476]">주제별 상품은 사진과 제목으로, 기간별 상품은 바로 상세 내용으로 살펴보세요.</p>
              </div>
              {activeProfile ? (
                <div className="rounded-2xl border border-[#ded0f5] bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl">
                  <p className="text-[10px] font-black tracking-[0.14em] text-[#7b59aa]">현재 분석 대상</p>
                  <p className="mt-1 text-sm font-black text-[#311a56]">{activeProfile.label}</p>
                  <Link href={`/recommendations?profileId=${activeProfile.id}`} className="mt-2 inline-flex text-xs font-bold text-[#6c39b3] underline decoration-[#ad8cde] underline-offset-4">
                    내 사주 기반 추천 보기
                  </Link>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#e5d6f6] bg-white/80 px-4 py-3 text-xs leading-5 text-[#665675]">
                  직접 둘러보기는 로그인 없이도 가능합니다.
                </div>
              )}
            </div>
          </section>

          <PremiumCatalogSection
            key={`${initialMode}:${initialCategory ?? ""}:${initialProductId ?? ""}`}
            profileId={activeProfile?.id}
            initialMode={initialMode}
            initialCategory={initialCategory}
            initialProductId={initialProductId}
          />
          {!activeProfile ? <PaidProductDiscoveryLinks /> : null}
        </div>
      </main>
  );

  return (
    <AppShell activeProfileId={activeProfile?.id}>
      {catalogContent}
    </AppShell>
  );
}
