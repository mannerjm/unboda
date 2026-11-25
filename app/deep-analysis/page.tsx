import { redirect, notFound } from "next/navigation";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
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
  const params = searchParams ? await searchParams : {};
  const requestedProfileId = getSingleParam(params.profileId);
  if (requestedProfileId && !isProfileId(requestedProfileId)) notFound();
  const activeProfile = user ? (requestedProfileId ? await getUserProfile(requestedProfileId,user.id) : await getActiveProfile(user.id)) : null;
  if (user && requestedProfileId && !activeProfile) notFound();
  const initialCategory = getSingleParam(params.category);
  if (getSingleParam(params.mode) === "period") {
    const query = new URLSearchParams();
    const productId = getSingleParam(params.productId);
    if (productId) query.set("productId",productId);
    if (activeProfile) query.set("profileId",activeProfile.id);
    redirect(`/period-analysis${query.size ? `?${query.toString()}` : ""}`);
  }
  const initialMode = "topic" as const;
  // Both topic and period bookmarks may deep-link to an existing product
  // detail, with the catalog validating that the product is launch-visible.
  const initialProductId = getSingleParam(params.productId);

  const catalogContent = (
      <main data-deep-analysis-page className="min-h-screen bg-[radial-gradient(ellipse_at_50%_0%,#ffffff_0%,#faf5ff_55%,#efe6ff_100%)] px-5 py-6 text-[#281744] sm:px-8 sm:py-7">
        <div className="mx-auto w-full max-w-6xl">
          <section data-deep-analysis-discovery-banner className="relative overflow-hidden rounded-[2rem] border border-[#e0d0f7] bg-[radial-gradient(circle_at_85%_12%,rgba(206,170,255,.45),transparent_36%),linear-gradient(130deg,#fffefe_0%,#f8f0ff_65%,#eae0ff_100%)] px-6 py-5 text-[#281744] shadow-[0_18px_48px_rgba(113,75,171,.11)] sm:px-8 sm:py-6">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#7759db]/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-8rem] left-[18%] h-56 w-56 rounded-full bg-[#d36e9c]/10 blur-3xl" />
            <div className="relative grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="max-w-3xl">
                <p className="text-xs font-black tracking-[0.16em] text-[#8551ca]">원하는 분석 바로 찾기</p>
                <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.05em] sm:text-4xl">어떤 운이 궁금하세요?</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#655476]">궁금한 주제의 상품을 사진과 제목으로 살펴보세요.</p>
              </div>
              {!activeProfile ? <p className="text-xs text-[#665675]">로그인 없이 상품을 둘러볼 수 있어요.</p> : null}
            </div>
          </section>

          <PremiumCatalogSection
            key={`${initialMode}:${initialCategory ?? ""}:${initialProductId ?? ""}`}
            profileId={activeProfile?.id}
            initialMode={initialMode}
            separateCatalog
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
