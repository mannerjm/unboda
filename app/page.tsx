import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { listUserProfiles } from "@/app/lib/profiles/server";
import {
  listUserFreeAnalysisResults,
  resolveProfileFreeAnalysisStatus,
  type ProfileFreeAnalysisStatus,
} from "@/app/lib/freeAnalysisResults/server";
import { createEvaluationContext } from "@/app/lib/evaluationContext";
import { listUserPaidAnalysisSummaries } from "@/app/lib/paidReports/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import HomeExperience from "@/app/components/HomeExperience";

type HomeCustomerStage = "free_only" | "paid_preparing" | "paid_failed" | "paid_ready" | "consulting_active";

type LandingState =
  | { kind: "guest" }
  | { kind: "no_profiles" }
  | { kind: "needs_profile_selection" }
  | { kind: "analysis_ready"; profileId: string }
  | { kind: "analysis_in_progress"; profileId: string; profileLabel: string }
  | { kind: "analysis_stale"; profileId: string; profileLabel: string }
  | { kind: "analysis_complete"; profileId: string; profileLabel: string; status: Extract<ProfileFreeAnalysisStatus, "completed" | "needs_retry">; customerStage: HomeCustomerStage };

async function hasAiConsultingHistory(userId: string, profileId: string): Promise<boolean> {
  const { count, error } = await createAdminClient()
    .from("ai_consulting_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("profile_id", profileId)
    .eq("role", "assistant");

  if (error) {
    console.error("[home] AI consulting history lookup failed");
    return false;
  }
  return (count ?? 0) > 0;
}

async function resolveCustomerStage(userId: string, profileId: string): Promise<HomeCustomerStage> {
  const paid = (await listUserPaidAnalysisSummaries(userId)).filter((item) => item.profileId === profileId);
  const hasCompleted = paid.some((item) => item.reportStatus === "completed");
  if (hasCompleted) {
    return await hasAiConsultingHistory(userId, profileId) ? "consulting_active" : "paid_ready";
  }
  if (paid.some((item) => item.reportStatus === "generating" || item.reportStatus === "none")) return "paid_preparing";
  if (paid.some((item) => item.reportStatus === "failed")) return "paid_failed";
  return "free_only";
}

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
    const customerStage = await resolveCustomerStage(user.id, activeProfile.id);
    return { kind: "analysis_complete", profileId: activeProfile.id, profileLabel: activeProfile.label, status, customerStage };
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
      if (state.customerStage === "consulting_active") {
        return {
          eyebrow: "나를 기억하는 AI 운세 상담",
          title: "지난 이야기에서 이어서 볼까요?",
          description: "구매한 분석과 지난 상담 기록을 바탕으로, 지금 궁금한 내용을 같은 상담에서 이어서 물어볼 수 있어요.",
          primary: "상담 이어가기",
          primaryHref: "/ai-consulting",
          secondary: "구매한 분석 보기",
          secondaryHref: "/purchased-analyses",
        };
      }
      if (state.customerStage === "paid_ready") {
        return {
          eyebrow: "나를 기억하는 AI 운세 상담",
          title: "분석은 끝났지만, 상담은 이제부터 이어집니다.",
          description: "구매한 리포트를 바탕으로 남은 궁금증을 AI에게 바로 물어보세요. 새 분석이 늘어나면 상담할 수 있는 범위도 함께 넓어집니다.",
          primary: "AI 상담 시작하기",
          primaryHref: "/ai-consulting",
          secondary: "구매한 분석 보기",
          secondaryHref: "/purchased-analyses",
        };
      }
      if (state.customerStage === "paid_preparing") {
        return {
          eyebrow: "구매한 분석 준비 중",
          title: "리포트를 준비하고 있어요.",
          description: "구매한 분석이 완성되면 같은 리포트를 바탕으로 AI 상담까지 이어갈 수 있어요. 지금은 준비 상태를 먼저 확인해 주세요.",
          primary: "준비 상태 확인하기",
          primaryHref: "/purchased-analyses",
          secondary: "내 분석 다시 보기",
          secondaryHref: `/result?profileId=${state.profileId}`,
        };
      }
      if (state.customerStage === "paid_failed") {
        return {
          eyebrow: "구매한 분석 확인 필요",
          title: "구매한 리포트 상태를 먼저 확인해 주세요.",
          description: "완료되지 않은 구매 분석이 있어요. 구매한 분석 보관함에서 상태와 다시 진행할 수 있는 경로를 확인해 주세요.",
          primary: "구매한 분석 확인하기",
          primaryHref: "/purchased-analyses",
          secondary: "내 분석 다시 보기",
          secondaryHref: `/result?profileId=${state.profileId}`,
        };
      }
      return {
        eyebrow: "내 운보다",
        title: "내 사주에서 더 궁금한 걸 찾아볼까요?",
        description: state.status === "needs_retry"
          ? "계산 결과와 추천은 저장되어 있어요. 무료 결과를 다시 확인하거나, 지금 궁금한 주제에 맞는 분석을 찾아볼 수 있습니다."
          : "무료 분석에서 확인한 흐름을 바탕으로, 지금 나에게 필요한 분석만 골라 더 깊게 볼 수 있어요.",
        primary: "나에게 맞는 분석 보기",
        primaryHref: `/recommendations?profileId=${state.profileId}`,
        secondary: "내 분석 다시 보기",
        secondaryHref: `/result?profileId=${state.profileId}`,
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
        eyebrow: "나를 기억하는 AI 운세 상담",
        title: "지금 내 운, 어디로 가고 있을까?",
        description: "먼저 무료로 현재 흐름을 확인해 보세요. 더 깊은 분석을 구매하면 그 결과를 바탕으로 AI 상담까지 이어집니다.",
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
