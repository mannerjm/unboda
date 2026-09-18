import Link from "next/link";
import AppShell from "@/app/components/AppShell";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import {
  COMPATIBILITY_BUSINESS_PRODUCT,
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT,
  COMPATIBILITY_FRIEND_PRODUCT,
  COMPATIBILITY_ROMANTIC_PRODUCT,
  COMPATIBILITY_WORKPLACE_PRODUCT,
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

          <section className="mt-8 grid gap-5 lg:auto-rows-fr lg:grid-cols-3">
            <Link
              href="/special-analysis/compatibility/romantic"
              className="group flex min-h-[270px] flex-col rounded-[28px] border border-[#dfe3ef] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#a99bea] hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex rounded-full bg-[#f3f1ff] px-3 py-1.5 text-[11px] font-bold text-[#5e4bd1]">연인 관계</span>
                <span className="text-sm font-bold text-[#11162d]">{COMPATIBILITY_ROMANTIC_PRODUCT.amount.toLocaleString("ko-KR")}원</span>
              </div>
              <h2 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-[#11162d]">연인·배우자 궁합</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                친밀감과 대화 방식, 갈등과 회복, 오래 함께하기 위한 기준과 현재 관계 흐름을 살펴봅니다.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full bg-[#f7f8fc] px-3 py-1.5">서로에게 미치는 영향</span>
                <span className="rounded-full bg-[#f7f8fc] px-3 py-1.5">갈등·회복 방식</span>
                <span className="rounded-full bg-[#f7f8fc] px-3 py-1.5">현재 관계 흐름</span>
              </div>
              <span className="mt-auto pt-7 text-sm font-bold text-[#11162d]">연인·배우자 궁합 시작하기 →</span>
            </Link>

            <Link
              href="/special-analysis/compatibility/family/parent-child#family-relationship-selector"
              className="group flex min-h-[270px] flex-col rounded-[28px] border border-[#dfe3ef] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#a99bea] hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex rounded-full bg-[#f3f1ff] px-3 py-1.5 text-[11px] font-bold text-[#5e4bd1]">가족 관계</span>
                <span className="text-sm font-bold text-[#11162d]">{COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT.amount.toLocaleString("ko-KR")}원</span>
              </div>
              <h2 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-[#11162d]">가족 궁합</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                부모·자녀, 형제·자매, 기타 가족을 한 화면에서 선택하고 관계마다 다른 기준과 구매 연도 흐름으로 분석해 보관합니다.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full bg-[#f7f8fc] px-3 py-1.5">부모·자녀</span>
                <span className="rounded-full bg-[#f7f8fc] px-3 py-1.5">형제·자매</span>
                <span className="rounded-full bg-[#f7f8fc] px-3 py-1.5">기타 가족</span>
              </div>
              <span className="mt-auto pt-7 text-sm font-bold text-[#11162d]">가족 궁합 시작하기 →</span>
            </Link>

            <Link
              href="/special-analysis/compatibility/workplace"
              className="group flex min-h-[270px] flex-col rounded-[28px] border border-[#dfe3ef] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#a99bea] hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex rounded-full bg-[#f3f1ff] px-3 py-1.5 text-[11px] font-bold text-[#5e4bd1]">업무 관계</span>
                <span className="text-sm font-bold text-[#11162d]">{COMPATIBILITY_WORKPLACE_PRODUCT.amount.toLocaleString("ko-KR")}원</span>
              </div>
              <h2 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-[#11162d]">직장·동료 궁합</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                상사·동료·팀원·업무 협업자 사이의 일하는 방식, 역할 분담, 소통과 갈등 흐름을 살펴봅니다.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full bg-[#f7f8fc] px-3 py-1.5">업무 스타일</span>
                <span className="rounded-full bg-[#f7f8fc] px-3 py-1.5">역할·소통</span>
                <span className="rounded-full bg-[#f7f8fc] px-3 py-1.5">협업 갈등</span>
              </div>
              <span className="mt-auto pt-7 text-sm font-bold text-[#11162d]">직장·동료 궁합 시작하기 →</span>
            </Link>

            <Link
              href="/special-analysis/compatibility/friend"
              className="group flex min-h-[270px] flex-col rounded-[28px] border border-[#dfe3ef] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#a99bea] hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex rounded-full bg-[#f3f1ff] px-3 py-1.5 text-[11px] font-bold text-[#5e4bd1]">사적 관계</span>
                <span className="text-sm font-bold text-[#11162d]">{COMPATIBILITY_FRIEND_PRODUCT.amount.toLocaleString("ko-KR")}원</span>
              </div>
              <h2 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-[#11162d]">친구·지인 궁합</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                친구와 가까운 지인 사이의 신뢰, 친밀감, 거리 조절, 오해와 관계 지속 흐름을 살펴봅니다.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full bg-[#f7f8fc] px-3 py-1.5">친밀감·신뢰</span>
                <span className="rounded-full bg-[#f7f8fc] px-3 py-1.5">거리·경계</span>
                <span className="rounded-full bg-[#f7f8fc] px-3 py-1.5">오해·회복</span>
              </div>
              <span className="mt-auto pt-7 text-sm font-bold text-[#11162d]">친구·지인 궁합 시작하기 →</span>
            </Link>

            <Link
              href="/special-analysis/compatibility/business"
              className="group flex min-h-[270px] flex-col rounded-[28px] border border-[#dfe3ef] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#a99bea] hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex rounded-full bg-[#f3f1ff] px-3 py-1.5 text-[11px] font-bold text-[#5e4bd1]">사업 관계</span>
                <span className="text-sm font-bold text-[#11162d]">{COMPATIBILITY_BUSINESS_PRODUCT.amount.toLocaleString("ko-KR")}원</span>
              </div>
              <h2 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-[#11162d]">사업·동업 궁합</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                동업자·공동창업자·사업 파트너 사이의 역할, 의사결정, 책임, 돈과 갈등 구조를 살펴봅니다.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full bg-[#f7f8fc] px-3 py-1.5">역할·책임</span>
                <span className="rounded-full bg-[#f7f8fc] px-3 py-1.5">의사결정</span>
                <span className="rounded-full bg-[#f7f8fc] px-3 py-1.5">돈·권한 갈등</span>
              </div>
              <span className="mt-auto pt-7 text-sm font-bold text-[#11162d]">사업·동업 궁합 시작하기 →</span>
            </Link>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
