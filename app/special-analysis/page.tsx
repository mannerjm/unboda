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
      <main className="min-h-screen bg-[#fbfbfa] px-5 py-8 text-stone-900 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <header className="border-b border-stone-200 pb-6">
            <p className="text-xs font-semibold tracking-[0.16em] text-stone-400">SPECIAL ANALYSIS</p>
            <h1 className="mt-2 text-3xl font-bold text-stone-950 sm:text-4xl">전문 분석</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
              한 사람의 운세를 넘어 두 사람의 관계, 중요한 시기, 이름과 공간처럼 입력 구조가 다른 분석을 별도 전문 엔진으로 살펴봅니다.
            </p>
          </header>

          {!activeProfile ? (
            <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-8 text-center">
              <h2 className="text-xl font-bold text-stone-950">내 프로필을 먼저 선택해 주세요</h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">전문 분석은 현재 분석 대상으로 선택된 내 사주를 기준으로 진행합니다.</p>
              <Link href="/mypage" className="mt-5 inline-flex rounded-2xl bg-stone-900 px-5 py-3 text-sm font-bold text-white">
                마이페이지에서 프로필 선택
              </Link>
            </section>
          ) : (
            <section className="mt-8">
              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
                <span>현재 분석 대상</span>
                <strong className="font-semibold text-stone-900">{activeProfile.label}</strong>
                <Link href="/mypage" className="text-xs underline decoration-stone-300 underline-offset-4">프로필 변경</Link>
              </div>

              <Link
                href="/special-analysis/compatibility"
                className="group block rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md sm:p-8"
              >
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="max-w-2xl">
                    <span className="inline-flex rounded-full bg-[#eee5d5] px-3 py-1 text-xs font-bold text-stone-700">첫 번째 전문 엔진</span>
                    <h2 className="mt-4 text-2xl font-bold text-stone-950">궁합 분석</h2>
                    <p className="mt-3 text-sm leading-7 text-stone-600">
                      두 사람의 원국 관계, 소통·갈등·회복·친밀감·장기 관계와 현재 대운·세운 흐름을 분리해서 분석합니다.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-stone-600">
                      <span className="rounded-full bg-stone-100 px-3 py-1.5">출생시간 모름 지원</span>
                      <span className="rounded-full bg-stone-100 px-3 py-1.5">단일 총점 없음</span>
                      <span className="rounded-full bg-stone-100 px-3 py-1.5">현재 시기 별도 분석</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-stone-900 group-hover:underline">분석 시작 →</span>
                </div>
              </Link>
            </section>
          )}
        </div>
      </main>
    </AppShell>
  );
}
