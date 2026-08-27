import Link from "next/link";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { listUserProfiles } from "@/app/lib/profiles/server";
import {
  listUserFreeAnalysisResults,
  resolveProfileFreeAnalysisStatus,
  type ProfileFreeAnalysisStatus,
} from "@/app/lib/freeAnalysisResults/server";
import { createEvaluationContext } from "@/app/lib/evaluationContext";

type LandingState =
  | { kind: "guest" }
  | { kind: "no_profiles" }
  | { kind: "needs_profile_selection" }
  | { kind: "analysis_ready"; profileId: string }
  | { kind: "analysis_in_progress"; profileId: string; profileLabel: string }
  | { kind: "analysis_stale"; profileId: string; profileLabel: string }
  | { kind: "analysis_complete"; profileId: string; profileLabel: string; status: Extract<ProfileFreeAnalysisStatus, "completed" | "needs_retry"> };

async function getLandingState(): Promise<LandingState> {
  const user = await getCurrentUser();
  if (!user) return { kind: "guest" };

  const profiles = await listUserProfiles(user.id);
  if (profiles.length === 0) return { kind: "no_profiles" };

  const activeProfile = await getActiveProfile(user.id);
  if (!activeProfile) return { kind: "needs_profile_selection" };

  const summaries = await listUserFreeAnalysisResults(user.id);
  const status = resolveProfileFreeAnalysisStatus(
    activeProfile,
    summaries,
    createEvaluationContext(),
  );

  if (status === "completed" || status === "needs_retry") {
    return { kind: "analysis_complete", profileId: activeProfile.id, profileLabel: activeProfile.label, status };
  }
  if (status === "generating") {
    return { kind: "analysis_in_progress", profileId: activeProfile.id, profileLabel: activeProfile.label };
  }
  if (status === "stale") {
    return { kind: "analysis_stale", profileId: activeProfile.id, profileLabel: activeProfile.label };
  }

  return { kind: "analysis_ready", profileId: activeProfile.id };
}

function getLandingCopy(state: LandingState) {
  switch (state.kind) {
    case "no_profiles":
      return {
        eyebrow: "새로운 분석을 시작해 보세요",
        title: "먼저, 분석할 사람을 정해 주세요",
        description: "출생 정보를 등록하면 나와 가족의 사주 흐름을 차분히 살펴볼 수 있습니다.",
        primary: "첫 분석 대상 만들기",
        primaryHref: "/mypage",
        secondary: "마이페이지",
        secondaryHref: "/mypage",
      };
    case "needs_profile_selection":
      return {
        eyebrow: "분석 준비",
        title: "이어서 볼 분석 대상을 선택해 주세요",
        description: "선택한 프로필을 기준으로 무료 분석과 심층 분석을 이어갑니다.",
        primary: "분석 대상 선택하기",
        primaryHref: "/mypage",
        secondary: "마이페이지",
        secondaryHref: "/mypage",
      };
    case "analysis_complete":
      return {
        eyebrow: state.status === "needs_retry" ? "저장된 분석" : "최근 분석",
        title: "내 분석을 이어서 살펴보세요",
        description: state.status === "needs_retry"
          ? "사주 구조와 추천은 저장되어 있습니다. 결과 화면에서 AI 해석을 다시 생성할 수 있습니다."
          : "무료 분석 결과를 다시 보고, 지금의 흐름에 맞는 추천을 확인해 보세요.",
        primary: "내 분석 이어보기",
        primaryHref: `/result?profileId=${state.profileId}`,
        secondary: "현재 추천 보기",
        secondaryHref: `/result?profileId=${state.profileId}#recommendations`,
      };
    case "analysis_stale":
      return {
        eyebrow: "분석 갱신 필요",
        title: "변경된 정보로 다시 분석해 주세요",
        description: "출생 정보 또는 현재 평가 기간이 달라져 최신 흐름을 다시 확인해야 합니다.",
        primary: "분석 갱신하기",
        primaryHref: "/saju",
        secondary: "마이페이지",
        secondaryHref: "/mypage",
      };
    case "analysis_in_progress":
      return {
        eyebrow: "분석 진행 중",
        title: "분석이 준비되고 있습니다",
        description: "잠시 후 저장된 결과를 확인할 수 있습니다.",
        primary: "분석 결과 확인하기",
        primaryHref: `/loading?profileId=${state.profileId}`,
        secondary: "마이페이지",
        secondaryHref: "/mypage",
      };
    case "analysis_ready":
      return {
        eyebrow: "분석 준비",
        title: "내 사주 흐름을 무료로 확인해 보세요",
        description: "사주 원국과 현재 흐름을 함께 읽는 AI 명리 분석으로 지금의 방향을 살펴봅니다.",
        primary: "무료 사주 분석 시작하기",
        primaryHref: "/saju",
        secondary: "마이페이지",
        secondaryHref: "/mypage",
      };
    case "guest":
      return {
        eyebrow: "개인 명리 분석",
        title: "내 사주 흐름을 무료로 확인해 보세요",
        description: "사주 원국과 현재 흐름을 함께 읽는 AI 명리 분석으로 지금의 방향을 살펴봅니다.",
        primary: "무료 사주 분석 시작하기",
        primaryHref: "/guest-saju",
        secondary: "로그인 / 기존 사용자",
        secondaryHref: "/auth/login?returnTo=/",
      };
  }
}

export default async function Home() {
  const state = await getLandingState();
  const copy = getLandingCopy(state);
  const isReturningUser = state.kind === "analysis_complete" || state.kind === "analysis_stale" || state.kind === "analysis_in_progress";

  if (isReturningUser) {
    const statusLabel = state.kind === "analysis_stale"
      ? "갱신 필요"
      : state.kind === "analysis_in_progress"
        ? "생성 중"
        : state.status === "needs_retry"
          ? "해석 재생성 필요"
          : "최신 상태";

    return (
      <main className="min-h-screen bg-[#f7f3ea] px-5 py-8 text-stone-900 sm:px-8 sm:py-12">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-col">
          <header className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight text-stone-900">운보다</Link>
            <span className="text-[10px] font-semibold tracking-[0.25em] text-stone-500">내 운보다</span>
          </header>

          <nav className="mt-8 grid max-w-3xl grid-cols-4 border-y border-stone-200 py-1" aria-label="내 운보다 바로가기">
            <a href="#my-analysis" className="border-r border-stone-200 px-2 py-3 text-center text-xs font-semibold text-stone-900 sm:text-sm">내 분석</a>
            <a href="#recommendations" className="border-r border-stone-200 px-2 py-3 text-center text-xs font-semibold text-stone-600 transition hover:text-stone-900 sm:text-sm">추천 분석</a>
            <a href="#premium-analysis" className="border-r border-stone-200 px-2 py-3 text-center text-xs font-semibold text-stone-600 transition hover:text-stone-900 sm:text-sm">심층 분석</a>
            <a href="/mypage" className="px-2 py-3 text-center text-xs font-semibold text-stone-600 transition hover:text-stone-900 sm:text-sm">마이페이지</a>
          </nav>

          <div className="flex flex-1 items-center py-12 sm:py-16">
            <section className="w-full">
              <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] lg:items-end lg:gap-20">
                <div id="my-analysis" className="scroll-mt-8">
                  <p className="text-xs font-semibold tracking-[0.25em] text-stone-500">최근 분석을 기준으로</p>
                  <h1 className="mt-5 max-w-xl text-4xl font-bold leading-tight tracking-tight text-stone-900 sm:text-6xl">
                    내 운보다
                  </h1>
                  <p className="mt-5 max-w-lg text-base leading-8 text-stone-600 sm:text-lg">
                    지금 필요한 내용을 이어서 살펴보세요.
                  </p>

                  <div className="mt-8 border-t border-stone-200 pt-5">
                    <p className="text-xs font-semibold tracking-[0.16em] text-stone-500">현재 분석 대상</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="text-lg font-bold text-stone-900">{state.profileLabel}</span>
                      <span className="text-sm text-stone-500">최근 분석 · {statusLabel}</span>
                    </div>
                    {state.kind === "analysis_stale" ? (
                      <p className="mt-3 text-sm leading-6 text-amber-700">출생 정보 또는 평가 기간이 달라 분석 갱신이 필요합니다.</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3">
                  <Link href={copy.primaryHref} className="block rounded-2xl bg-stone-900 px-6 py-6 text-white shadow-sm transition hover:bg-stone-800">
                    <span className="block text-xs font-semibold tracking-[0.16em] text-stone-300">내 분석</span>
                    <span className="mt-2 block text-lg font-semibold">내 분석 이어보기</span>
                    <span className="mt-2 block text-sm leading-6 text-stone-300">무료 분석 결과와 현재의 흐름을 다시 확인합니다.</span>
                  </Link>

                  <Link id="recommendations" href={`/result?profileId=${state.profileId}#recommendations`} className="block rounded-2xl border border-stone-200 bg-white px-5 py-5 transition hover:border-stone-300 hover:bg-stone-50">
                    <span className="block text-xs font-semibold tracking-[0.16em] text-stone-500">현재 추천</span>
                    <span className="mt-2 block text-base font-semibold text-stone-900">현재 추천 분석 보기</span>
                    <span className="mt-2 block text-sm leading-6 text-stone-600">사주와 지금의 흐름을 기준으로 더 깊게 살펴보면 좋은 분석을 확인해보세요.</span>
                    <span className="mt-4 block text-sm font-semibold text-stone-800">추천 분석 보기 →</span>
                  </Link>

                  <Link id="premium-analysis" href={`/result?profileId=${state.profileId}#premium-analysis`} className="block rounded-2xl border border-stone-200 bg-stone-50 px-5 py-5 transition hover:border-stone-300 hover:bg-white">
                    <span className="block text-xs font-semibold tracking-[0.16em] text-stone-500">심층 분석</span>
                    <span className="mt-2 block text-base font-semibold text-stone-900">심층 분석 둘러보기</span>
                    <span className="mt-2 block text-sm leading-6 text-stone-600">원하는 주제나 기간을 직접 골라 더 깊은 분석을 찾아볼 수 있어요.</span>
                    <span className="mt-4 block text-sm font-semibold text-stone-800">심층 분석 둘러보기 →</span>
                  </Link>
                </div>
              </div>

              <div className="mt-10 border-t border-stone-200 pt-6">
                <Link href="/mypage" className="text-sm font-semibold text-stone-700 underline decoration-stone-300 underline-offset-4 transition hover:text-stone-900">
                  마이페이지에서 분석 대상 관리하기
                </Link>
              </div>
            </section>
          </div>

          <footer className="text-xs text-stone-500">운보다 · 참고용 명리 분석 서비스</footer>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-8 text-stone-900 sm:px-8 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight text-stone-900">운보다</Link>
          <span className="text-[10px] font-semibold tracking-[0.25em] text-stone-500">AI 명리 분석</span>
        </header>

        <div className="flex flex-1 items-center py-16 sm:py-20">
          <section className="w-full max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.25em] text-stone-500">{copy.eyebrow}</p>
            <h1 className="mt-5 max-w-xl text-4xl font-bold leading-tight tracking-tight text-stone-900 sm:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-stone-600 sm:text-lg">{copy.description}</p>

            <div className="mt-9 flex max-w-md flex-col gap-3">
              <Link href={copy.primaryHref} className="rounded-2xl bg-stone-900 px-6 py-4 text-center text-base font-semibold text-white shadow-sm transition hover:bg-stone-800">
                {copy.primary}
              </Link>
              <Link href={copy.secondaryHref} className="rounded-2xl border border-stone-300 bg-white px-6 py-4 text-center text-sm font-semibold text-stone-700 transition hover:bg-stone-50">
                {copy.secondary}
              </Link>
            </div>

            {!isReturningUser ? (
              <div className="mt-12 grid max-w-2xl gap-5 border-t border-stone-200 pt-6 sm:grid-cols-3">
                <p className="text-sm leading-6 text-stone-600">원국과 현재 흐름을 함께 분석</p>
                <p className="text-sm leading-6 text-stone-600">개인화된 AI 해석 제공</p>
                <p className="text-sm leading-6 text-stone-600">분석 후 필요한 방향 제안</p>
              </div>
            ) : null}
          </section>
        </div>

        <footer className="text-xs text-stone-500">운보다 · 참고용 명리 분석 서비스</footer>
      </div>
    </main>
  );
}