import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";

export default async function SpecialAnalysisPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login?returnTo=/special-analysis");
  }

  const activeProfile = await getActiveProfile(user.id);

  return (
    <AppShell activeProfileId={activeProfile?.id}>
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-[#11162d] sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <header className="relative overflow-hidden rounded-[2rem] border border-[#35375f] bg-[radial-gradient(circle_at_top_right,rgba(132,111,241,0.22),transparent_34%),linear-gradient(145deg,#0b1025_0%,#151938_55%,#211b46_100%)] px-6 py-8 text-white shadow-[0_22px_60px_rgba(24,29,67,0.14)] sm:px-8 sm:py-10">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#b9b2f6]">SPECIAL ANALYSIS</p>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">전문 분석</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
              한 사람의 운세를 넘어, 두 사람의 관계와 중요한 시기처럼 더 구체적인 주제를 깊이 살펴봅니다.
            </p>
          </header>

          {!activeProfile ? (
            <section className="mt-8 rounded-3xl border border-[#dce1ef] bg-white p-8 text-center">
              <h2 className="text-xl font-bold text-[#11162d]">내 프로필을 먼저 선택해 주세요</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">전문 분석은 현재 분석 대상으로 선택된 내 사주를 기준으로 진행합니다.</p>
              <Link href="/mypage" className="mt-5 inline-flex rounded-2xl bg-[#171a3d] px-5 py-3 text-sm font-bold text-white">
                마이페이지에서 프로필 선택
              </Link>
            </section>
          ) : (
            <section className="mt-8">
              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                <span>현재 분석 대상</span>
                <strong className="font-semibold text-[#11162d]">{activeProfile.label}</strong>
                <Link href="/mypage" className="text-xs underline decoration-[#c4c9d9] underline-offset-4">프로필 변경</Link>
              </div>

              <Link
                href="/special-analysis/compatibility"
                className="group block rounded-3xl border border-[#dce1ef] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#cfd5e6] hover:shadow-md sm:p-8"
              >
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="max-w-2xl">
                    <h2 className="text-2xl font-bold text-[#11162d]">궁합 분석</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      두 사람의 관계 유형에 맞춰 잘 맞는 점, 부딪히기 쉬운 지점, 회복 방식과 현재 관계 흐름을 살펴봅니다.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                      <span className="rounded-full bg-[#eef0f6] px-3 py-1.5">관계 유형별 분석</span>
                      <span className="rounded-full bg-[#eef0f6] px-3 py-1.5">소통·갈등·회복 확인</span>
                      <span className="rounded-full bg-[#eef0f6] px-3 py-1.5">현재 관계 흐름 함께 확인</span>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center rounded-2xl bg-[#6f5ce7] px-4 py-2.5 text-sm font-bold text-white transition group-hover:bg-[#242957]">
                    궁합 유형 선택하기 →
                  </span>
                </div>
              </Link>
            </section>
          )}
        </div>
      </main>
    </AppShell>
  );
}
