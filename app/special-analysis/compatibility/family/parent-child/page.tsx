import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import FamilyCompatibilityAnalysisClient from "@/app/components/FamilyCompatibilityAnalysisClient";
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
        <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-[#11162d] sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-3xl">
            <Link href="/special-analysis/compatibility" className="text-sm font-semibold text-slate-600 underline decoration-[#c4c9d9] underline-offset-4">← 궁합 유형 선택</Link>
            <section className="mt-8 rounded-3xl border border-[#dce1ef] bg-white p-8 text-center">
              <h1 className="text-2xl font-bold text-[#11162d]">가족 궁합</h1>
              <p className="mt-4 text-sm leading-7 text-slate-600">분석할 내 프로필을 먼저 선택해 주세요.</p>
              <Link href="/mypage" className="mt-5 inline-flex rounded-2xl bg-[#171a3d] px-5 py-3 text-sm font-bold text-white">마이페이지에서 프로필 선택</Link>
            </section>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell activeProfileId={activeProfile.id}>
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-[#11162d] sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <Link href="/special-analysis/compatibility" className="text-sm font-semibold text-slate-600 underline decoration-[#c4c9d9] underline-offset-4">← 궁합 유형 선택</Link>

          <header className="relative mt-7 overflow-hidden rounded-[2rem] border border-[#35375f] bg-[radial-gradient(circle_at_18%_22%,rgba(112,88,229,0.22),transparent_24%),radial-gradient(circle_at_82%_78%,rgba(83,180,215,0.14),transparent_24%),linear-gradient(145deg,#0b1025_0%,#151938_55%,#211b46_100%)] px-6 py-8 text-white shadow-[0_22px_60px_rgba(24,29,67,0.14)] sm:px-8 sm:py-10">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#b9b2f6]">전문 분석 · 궁합 · 가족</p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">가족 궁합 분석</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200">
              먼저 어떤 가족 관계인지 선택한 뒤 역할과 가족 정보를 입력해 주세요. 선택한 관계에 맞는 분석 기준과 결과 리포트로 이어집니다.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-300">
              <span>현재 분석 대상</span>
              <strong className="font-semibold text-white">{activeProfile.label}</strong>
              <Link href="/mypage" className="text-xs underline decoration-[#c4c9d9] underline-offset-4">프로필 변경</Link>
            </div>
          </header>

          <FamilyCompatibilityAnalysisClient myProfileLabel={activeProfile.label} profileId={activeProfile.id} />
        </div>
      </main>
    </AppShell>
  );
}
