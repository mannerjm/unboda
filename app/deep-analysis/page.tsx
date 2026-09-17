import Link from "next/link";
import AppShell from "@/app/components/AppShell";
import PremiumCatalogSection from "@/app/components/PremiumCatalogSection";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";

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

  return (
    <AppShell activeProfileId={activeProfile?.id}>
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-7 text-stone-900 sm:px-8 sm:py-9">
        <div className="mx-auto w-full max-w-6xl">
          <section className="relative overflow-hidden rounded-[2rem] border border-[#6f65ba]/20 bg-[linear-gradient(135deg,#0a1128_0%,#111735_48%,#1b1738_100%)] px-6 py-8 text-white shadow-[0_24px_70px_rgba(23,24,55,0.18)] sm:px-9 sm:py-10 lg:px-11">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#7759db]/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-8rem] left-[18%] h-56 w-56 rounded-full bg-[#d36e9c]/10 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-3xl">
                <p className="text-xs font-black tracking-[0.16em] text-[#a999ff]">원하는 분석 바로 찾기</p>
                <h1 className="mt-3 text-3xl font-black leading-tight tracking-[-0.05em] sm:text-4xl lg:text-[2.8rem]">
                  상품 이름보다,<br className="hidden sm:block" /> 지금 궁금한 질문부터 골라보세요.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[#b4bad0] sm:text-base">
                  주제나 시간 범위를 고르면 실제 고민에 가까운 질문부터 보여드려요. 필요한 분석만 자세히 확인할 수 있습니다.
                </p>
              </div>
              {activeProfile ? (
                <div className="rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 backdrop-blur-xl">
                  <p className="text-[10px] font-black tracking-[0.14em] text-[#9f98c7]">현재 분석 대상</p>
                  <p className="mt-1 text-sm font-black text-white">{activeProfile.label}</p>
                  <Link href={`/recommendations?profileId=${activeProfile.id}`} className="mt-2 inline-flex text-xs font-bold text-[#cfc8ff] underline decoration-[#8176bb] underline-offset-4">
                    내 사주 기반 추천 보기
                  </Link>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-xs leading-5 text-[#aeb5cb]">
                  직접 둘러보기는 로그인 없이도 가능합니다.
                </div>
              )}
            </div>
          </section>

          <PremiumCatalogSection
            profileId={activeProfile?.id}
            initialMode={initialMode}
            initialCategory={initialCategory}
          />
        </div>
      </main>
    </AppShell>
  );
}
