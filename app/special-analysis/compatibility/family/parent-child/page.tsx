import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import FamilyParentChildAnalysisClient from "@/app/components/FamilyParentChildAnalysisClient";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";

export default async function ParentChildCompatibilityPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login?returnTo=/special-analysis/compatibility/family/parent-child");
  }

  const activeProfile = await getActiveProfile(user.id);
  if (!activeProfile) {
    return (
      <AppShell>
        <main className="min-h-screen bg-[#fbfbfa] px-5 py-8 text-stone-900 sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-3xl">
            <Link href="/special-analysis/compatibility" className="text-sm font-semibold text-stone-600 underline decoration-stone-300 underline-offset-4">← 궁합 유형 선택</Link>
            <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-8 text-center">
              <h1 className="text-2xl font-bold text-stone-950">부모·자녀 궁합</h1>
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
          <Link href="/special-analysis/compatibility" className="text-sm font-semibold text-stone-600 underline decoration-stone-300 underline-offset-4">← 궁합 유형 선택</Link>

          <header className="mt-7 border-b border-stone-200 pb-7">
            <p className="text-xs font-semibold tracking-[0.16em] text-stone-400">전문 분석 · 궁합 · 부모·자녀</p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-stone-950 sm:text-4xl">부모·자녀 궁합 분석</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600">
              먼저 내가 부모인지 자녀인지 선택하고 가족 정보를 입력해 주세요. 부모 → 자녀, 자녀 → 부모를 따로 봅니다. 자세한 관계 해석은 분석 결과에서 확인할 수 있습니다.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
              <span>현재 분석 대상</span>
              <strong className="font-semibold text-stone-900">{activeProfile.label}</strong>
              <Link href="/mypage" className="text-xs underline decoration-stone-300 underline-offset-4">프로필 변경</Link>
            </div>
          </header>

          <div id="family-parent-child-form" className="scroll-mt-6">
            <FamilyParentChildAnalysisClient myProfileLabel={activeProfile.label} profileId={activeProfile.id} />
          </div>
        </div>
      </main>
    </AppShell>
  );
}
