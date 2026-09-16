import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { COMPATIBILITY_ROMANTIC_PRODUCT } from "@/app/lib/specialAnalysisProducts";

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
          <Link href="/special-analysis" className="text-sm font-semibold text-stone-600 underline decoration-stone-300 underline-offset-4">← 전문 분석</Link>

          <header className="mt-7 border-b border-stone-200 pb-7">
            <p className="text-xs font-semibold tracking-[0.16em] text-stone-400">전문 분석 · 궁합</p>
            <h1 className="mt-2 text-3xl font-bold text-stone-950 sm:text-4xl">궁합 분석</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
              어떤 관계를 살펴볼까요? 관계의 성격에 따라 중요하게 보는 기준과 리포트 구성이 달라집니다.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
              <span>현재 분석 대상</span>
              <strong className="font-semibold text-stone-900">{activeProfile.label}</strong>
              <Link href="/mypage" className="text-xs underline decoration-stone-300 underline-offset-4">프로필 변경</Link>
            </div>
          </header>

          <section className="mt-8 grid gap-5 lg:grid-cols-2">
            <Link
              href="/special-analysis/compatibility/romantic"
              className="group flex min-h-[290px] flex-col rounded-[28px] border border-[#dfd3c1] bg-[linear-gradient(145deg,#fbf6ed_0%,#fffdf9_65%,#ffffff_100%)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#cdbb9f] hover:shadow-md sm:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full bg-stone-900 px-3 py-1.5 text-[11px] font-bold text-white">이용 가능</span>
                  <h2 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-stone-950">연인·배우자 궁합</h2>
                </div>
                <span className="text-sm font-bold text-stone-900">{COMPATIBILITY_ROMANTIC_PRODUCT.amount.toLocaleString("ko-KR")}원</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-stone-600">
                친밀감과 대화 방식, 갈등과 회복, 오래 함께하기 위한 기준과 현재 관계 흐름을 살펴봅니다.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-stone-600">
                <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-stone-200">서로에게 미치는 영향</span>
                <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-stone-200">갈등·회복 방식</span>
                <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-stone-200">현재 관계 흐름</span>
              </div>
              <span className="mt-auto pt-7 text-sm font-bold text-stone-900">연인·배우자 궁합 시작하기 →</span>
            </Link>

            <Link
              href="/special-analysis/compatibility/family"
              className="group flex min-h-[290px] flex-col rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md sm:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full bg-[#f3eadb] px-3 py-1.5 text-[11px] font-bold text-stone-700">부모·자녀 이용 가능</span>
                  <h2 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-stone-950">가족 궁합</h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-stone-600">
                부모·자녀처럼 가족 안에서 달라지는 기대, 거리감, 보호와 독립, 반복되는 갈등과 회복 방식을 관계별로 나누어 살펴봅니다.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-stone-500">
                <span className="rounded-full bg-stone-50 px-3 py-1.5">부모·자녀</span>
                <span className="rounded-full bg-stone-50 px-3 py-1.5">형제·자매 설계 중</span>
                <span className="rounded-full bg-stone-50 px-3 py-1.5">역할·거리·회복</span>
              </div>
              <span className="mt-auto pt-7 text-sm font-bold text-stone-700">가족 궁합 선택하기 →</span>
            </Link>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
