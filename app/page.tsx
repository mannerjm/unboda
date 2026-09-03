import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { listUserProfiles } from "@/app/lib/profiles/server";
import {
  listUserFreeAnalysisResults,
  resolveProfileFreeAnalysisStatus,
  type ProfileFreeAnalysisStatus,
} from "@/app/lib/freeAnalysisResults/server";
import { createEvaluationContext } from "@/app/lib/evaluationContext";
import HomeExperience from "@/app/components/HomeExperience";

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
  const status = resolveProfileFreeAnalysisStatus(activeProfile, summaries, createEvaluationContext());

  if (status === "completed" || status === "needs_retry") {
    return { kind: "analysis_complete", profileId: activeProfile.id, profileLabel: activeProfile.label, status };
  }
  if (status === "generating") return { kind: "analysis_in_progress", profileId: activeProfile.id, profileLabel: activeProfile.label };
  if (status === "stale") return { kind: "analysis_stale", profileId: activeProfile.id, profileLabel: activeProfile.label };
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
        description: state.status === "needs_retry" ? "사주 구조와 추천은 저장되어 있습니다. 결과 화면에서 AI 해석을 다시 생성할 수 있습니다." : "무료 분석 결과를 다시 보고, 지금의 흐름에 맞는 추천을 확인해 보세요.",
        primary: "내 분석 이어보기",
        primaryHref: `/result?profileId=${state.profileId}`,
        secondary: "현재 추천 보기",
        secondaryHref: `/result?profileId=${state.profileId}#recommendations`,
      };
    case "analysis_stale":
      return {
        eyebrow: "분석 갱신 필요",
        title: "변경된 정보로 다시 분석해 주세요",
        description: "출생 정보 또는 현재 평가 기간이 달라 최신 흐름을 다시 확인해야 합니다.",
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
        description: "사주 원국과 현재 흐름을 함께 읽고, 지금의 방향을 살펴봅니다.",
        primary: "무료 사주 분석 시작하기",
        primaryHref: "/saju",
        secondary: "마이페이지",
        secondaryHref: "/mypage",
      };
    case "guest":
      return {
        eyebrow: "개인 명리 분석",
        title: "내 사주의 흐름을 차분히 살펴보세요",
        description: "출생 정보를 바탕으로 나와 가족의 사주 흐름을 확인하고, 필요한 분석을 이어서 살펴볼 수 있습니다.",
        primary: "무료 사주 분석 시작하기",
        primaryHref: "/guest-saju",
        secondary: "로그인 / 기존 사용자",
        secondaryHref: "/auth/login?returnTo=/",
      };
  }
}

export default async function Home() {
  const state = await getLandingState();
  return <HomeExperience state={state} copy={getLandingCopy(state)} />;
}
