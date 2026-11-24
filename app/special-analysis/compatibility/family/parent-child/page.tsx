import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import FamilyCompatibilityAnalysisClient from "@/app/components/FamilyCompatibilityAnalysisClient";
import CompatibilityDetailHero from "@/app/components/CompatibilityDetailHero";
import HwadamCompatibilityTeacherCard from "@/app/components/HwadamCompatibilityTeacherCard";
import { isProductSaved } from "@/app/lib/interestedAnalyses/server";
import { COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID } from "@/app/lib/specialAnalysisProducts";
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

  const saved = await isProductSaved(user.id, COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID);

  return (
    <AppShell activeProfileId={activeProfile.id}>
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-[#11162d] sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-3xl">
          <Link href="/special-analysis/compatibility" className="text-sm font-semibold text-slate-600 underline decoration-[#c4c9d9] underline-offset-4">← 궁합 유형 선택</Link>

          <CompatibilityDetailHero
            mode="family"
            title="가족 궁합 분석"
            description="먼저 어떤 가족 관계인지 선택한 뒤 서로의 역할과 소통 방식을 살펴보세요. 관계마다 다른 기준의 분석 리포트로 이어집니다."
          />
          <HwadamCompatibilityTeacherCard placement="detail" relationship="가족 궁합" />

          <FamilyCompatibilityAnalysisClient myProfileLabel={activeProfile.label} profileId={activeProfile.id} initialInterestSaved={saved} />
        </div>
      </main>
    </AppShell>
  );
}
