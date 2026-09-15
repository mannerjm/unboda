import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import CompatibilityAnalysisClient from "@/app/components/CompatibilityAnalysisClient";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";

export default async function CompatibilityAnalysisPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login?returnTo=/special-analysis/compatibility");
  }

  const activeProfile = await getActiveProfile(user.id);
  if (!activeProfile) {
    return (
      <AppShell>
        <main className="min-h-screen bg-[#fbfbfa] px-5 py-8 text-stone-900 sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-3xl">
            <Link href="/special-analysis" className="text-sm font-semibold text-stone-600 underline decoration-stone-300 underline-offset-4">← 전문 분석</Link>
            <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-8 text-center">
              <h1 className="text-2xl font-bold text-stone-950">궁합 분석</h1>
              <p className="mt-4 text-sm leading-7 text-stone-600">분석할 내 프로필을 먼저 선택해 주세요.</p>
              <Link href="/mypage" className="mt-5 inline-flex rounded-2xl bg-stone-900 px-5 py-3 text-sm font-bold text-white">마이페이지에서 프로필 선택</Link>
            </section>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell activeProfileId={activeProfile.id}>
      <main className="min-h-screen bg-[#fbfbfa] px-5 py-8 text-stone-900 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mx-auto w-full max-w-3xl">
            <Link href="/special-analysis" className="text-sm font-semibold text-stone-600 underline decoration-stone-300 underline-offset-4">← 전문 분석</Link>
            <header className="mt-7 border-b border-stone-200 pb-6">
              <p className="text-xs font-semibold tracking-[0.16em] text-stone-400">COMPATIBILITY</p>
              <h1 className="mt-2 text-3xl font-bold text-stone-950 sm:text-4xl">궁합 분석</h1>
              <p className="mt-4 text-sm leading-7 text-stone-600">
                연인·배우자 관계에서 잘 맞는 점, 부딪히기 쉬운 지점, 회복 방식과 현재 관계 흐름을 함께 살펴봅니다.
              </p>
            </header>
          </div>
          <CompatibilityAnalysisClient myProfileLabel={activeProfile.label} />
        </div>
      </main>
    </AppShell>
  );
}
