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
        eyebrow: "내 운보다 시작하기",
        title: "먼저, 분석할 사람을 정해 주세요",
        description: "출생 정보를 등록하면 무료 분석을 시작하고, 결과에서 궁금한 부분을 심층 분석으로 이어갈 수 있어요.",
        primary: "첫 분석 대상 만들기",
        primaryHref: "/mypage",
        secondary: "마이페이지",
        secondaryHref: "/mypage",
      };
    case "needs_profile_selection":
      return {
        eyebrow: "분석 대상 선택",
        title: "누구의 흐름을 볼까요?",
        description: "분석할 프로필을 선택하면 무료 분석과 개인 추천을 같은 대상 기준으로 이어갈 수 있어요.",
        primary: "분석 대상 선택하기",
        primaryHref: "/mypage",
        secondary: "마이페이지",
        secondaryHref: "/mypage",
      };
    case "analysis_complete":
      return {
        eyebrow: state.status === "needs_retry" ? "저장된 분석" : "내 운보다",
        title: "내 분석을 이어서 볼까요?",
        description: state.status === "needs_retry" ? "계산 결과와 추천은 안전하게 저장되어 있어요. 결과 화면에서 해석만 다시 생성할 수 있습니다." : "무료 분석 결과를 다시 보고, 그 결과에서 이어지는 개인 추천을 확인해 보세요.",
        primary: "내 분석 이어보기",
        primaryHref: `/result?profileId=${state.profileId}`,
        secondary: "현재 추천 보기",
        secondaryHref: `/recommendations?profileId=${state.profileId}`,
      };
    case "analysis_stale":
      return {
        eyebrow: "분석 갱신 필요",
        title: "최신 흐름으로 다시 이어볼까요?",
        description: "출생 정보 또는 현재 평가 기간이 달라졌어요. 최신 기준으로 무료 분석을 갱신하면 추천도 함께 새로 이어집니다.",
        primary: "분석 갱신하기",
        primaryHref: "/saju",
        secondary: "마이페이지",
        secondaryHref: "/mypage",
      };
    case "analysis_in_progress":
      return {
        eyebrow: "분석 진행 중",
        title: "지금 내 흐름을 읽고 있어요",
        description: "분석이 준비되면 결과와 개인 추천까지 바로 이어서 확인할 수 있습니다.",
        primary: "분석 결과 확인하기",
        primaryHref: `/loading?profileId=${state.profileId}`,
        secondary: "마이페이지",
        secondaryHref: "/mypage",
      };
    case "analysis_ready":
      return {
        eyebrow: "무료 분석부터 시작",
        title: "지금 내 운, 어디로 가고 있을까?",
        description: "먼저 무료 분석으로 지금의 흐름을 보고, 궁금한 부분이 생기면 나에게 맞는 심층 분석으로 이어가세요.",
        primary: "무료로 내 운 보기",
        primaryHref: "/saju",
        secondary: "마이페이지",
        secondaryHref: "/mypage",
      };
    case "guest":
      return {
        eyebrow: "무료 분석부터 시작",
        title: "지금 내 운, 어디로 가고 있을까?",
        description: "먼저 무료 분석으로 지금의 흐름을 보고, 궁금한 부분이 생기면 나에게 맞는 심층 분석으로 이어가세요.",
        primary: "무료로 내 운 보기",
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
