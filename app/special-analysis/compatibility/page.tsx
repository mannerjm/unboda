import Link from "next/link";
import AppShell from "@/app/components/AppShell";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import {
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT,
  COMPATIBILITY_ROMANTIC_PRODUCT,
} from "@/app/lib/specialAnalysisProducts";

export default async function CompatibilityAnalysisPage() {
  const user = await getCurrentUser();
  const activeProfile = user ? await getActiveProfile(user.id) : null;

  return (
    <AppShell activeProfileId={activeProfile?.id}>
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-[#11162d] sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <Link href="/special-analysis" className="text-sm font-semibold text-slate-600 underline decoration-[#c4c9d9] underline-offset-4">← 전문 분석</Link>

          <header className="relative mt-7 overflow-hidden rounded-[2rem] border border-[#35375f] bg-[radial-gradient(circle_at_18%_22%,rgba(112,88,229,0.22),transparent_24%),radial-gradient(circle_at_82%_78%,rgba(219,105,161,0.16),transparent_24%),linear-gradient(145deg,#0b1025_0%,#151938_55%,#211b46_100%)] px-6 py-8 text-white shadow-[0_22px_60px_rgba(24,29,67,0.14)] sm:px-8 sm:py-10">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#b9b2f6]">전문 분석 · 궁합</p>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">궁합 분석</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
              어떤 관계를 살펴볼까요? 관계의 성격에 따라 중요하게 보는 기준과 리포트 구성이 달라집니다.
            </p>
            {activeProfile ? (
              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-300">
                <span>현재 분석 대상</span>
                <strong className="font-semibold text-white">{activeProfile.label}</strong>
                <Link href="/mypage" className="text-xs underline decoration-white/30 underline-offset-4">프로필 변경</Link>
              </div>
            ) : (
              <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span className="rounded-full bg-[#eef0f6] px-3 py-1.5 text-xs font-semibold text-slate-700">로그인 없이 둘러보기 가능</span>
                <span>{user ? "실제 분석을 시작하려면 내 프로필을 먼저 선택해 주세요." : "실제 분석을 시작할 때 로그인과 내 프로필이 필요합니다."}</span>
                {user ? <Link href="/mypage" className="text-xs underline decoration-[#c4c9d9] underline-offset-4">프로필 선택</Link> : null}
              </div>
            )}
          </header>

          <section className="mt-8 grid gap-5 lg:grid-cols-2">
            <Link
              href="/special-analysis/compatibility/romantic"
              className="group flex min-h-[290px] flex-col rounded-[28px] border border-[#dfe3ef] bg-[linear-gradient(145deg,#f3f1ff_0%,#f9faff_65%,#ffffff_100%)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#a99bea] hover:shadow-md sm:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full bg-[#6f5ce7] px-3 py-1.5 text-[11px] font-bold text-white">이용 가능</span>
                  <h2 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-[#11162d]">연인·배우자 궁합</h2>
                </div>
                <span className="text-sm font-bold text-[#11162d]">{COMPATIBILITY_ROMANTIC_PRODUCT.amount.toLocaleString("ko-KR")}원</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                친밀감과 대화 방식, 갈등과 회복, 오래 함께하기 위한 기준과 현재 관계 흐름을 살펴봅니다.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#dce1ef]">서로에게 미치는 영향</span>
                <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#dce1ef]">갈등·회복 방식</span>
                <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#dce1ef]">현재 관계 흐름</span>
              </div>
              <span className="mt-auto pt-7 text-sm font-bold text-[#11162d]">연인·배우자 궁합 시작하기 →</span>
            </Link>

            <Link
              href="/special-analysis/compatibility/family/parent-child#family-relationship-selector"
              className="group flex min-h-[290px] flex-col rounded-[28px] border border-[#dfe3ef] bg-[linear-gradient(145deg,#f3f1ff_0%,#f9faff_65%,#ffffff_100%)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#a99bea] hover:shadow-md sm:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full bg-[#6f5ce7] px-3 py-1.5 text-[11px] font-bold text-white">가족 궁합 이용 가능</span>
                  <h2 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-[#11162d]">가족 궁합</h2>
                </div>
                <span className="text-sm font-bold text-[#11162d]">{COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT.amount.toLocaleString("ko-KR")}원</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                부모·자녀, 형제·자매, 기타 가족을 한 화면에서 선택하고 관계마다 다른 기준과 구매 연도 흐름으로 분석해 보관합니다.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#dce1ef]">부모·자녀</span>
                <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#dce1ef]">형제·자매</span>
                <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#dce1ef]">기타 가족</span>
              </div>
              <span className="mt-auto pt-7 text-sm font-bold text-[#11162d]">가족 궁합 시작하기 →</span>
            </Link>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
