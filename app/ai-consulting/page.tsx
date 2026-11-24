import Link from "next/link";
import { isGeneralConsultingSource } from "@/app/lib/aiConsulting/generalSource";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import AiConsultingPortfolioClient from "./AiConsultingPortfolioClient";
import { getFreeAnalysisResult } from "@/app/lib/freeAnalysisResults/server";
import { hasVerifiedConsultingFoundation } from "@/app/lib/aiConsulting/consultingFoundation";
import { getAccountLifecycle } from "@/app/lib/accounts/server";
import { getProfileFreeAnalysisFoundationStatus } from "@/app/lib/freeAnalysisEligibility";
import { isAiConsultingCreditCheckoutEnabled } from "@/app/lib/aiConsulting/creditCheckout";
import { isTossCheckoutUserAllowed } from "@/app/lib/toss/config";
import { getAiConsultingPortfolioState } from "@/app/lib/aiConsulting/portfolio";
import { getCanonicalPremiumProductId } from "@/app/lib/premiumProductRegistry";

export default async function AiConsultingPage({
  searchParams,
}: {
  searchParams: Promise<{
    profileId?: string;
    productId?: string;
    edition?: string;
  }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    const returnTo = params.productId && params.edition
      ? `/ai-consulting?productId=${encodeURIComponent(params.productId)}&edition=${encodeURIComponent(params.edition)}`
      : "/ai-consulting";
    redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const activeProfile = await getActiveProfile(user.id);
  if (!activeProfile) {
    return (
      <AppShell>
        <main className="min-h-screen bg-[#f5f7fc] px-5 py-10 text-[#11162d] sm:px-8">
          <section className="mx-auto max-w-2xl rounded-[2rem] border border-[#dce1ef] bg-white p-7 text-center shadow-sm sm:p-9">
            <p className="text-xs font-black tracking-[0.16em] text-[#6f5ce7]">AI CONSULTING · STEP 1</p>
            <h1 className="mt-3 text-2xl font-black">AI 상담 전에 내 분석 대상을 먼저 정해 주세요</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">운보다 AI 상담은 마이페이지에 저장된 프로필로 이어집니다. 유료 리포트 구매는 필요하지 않습니다.</p>
            <Link href="/mypage" className="mt-6 inline-flex rounded-2xl bg-[#6f5ce7] px-5 py-3.5 text-sm font-bold text-white">마이페이지에서 분석 대상 등록</Link>
          </section>
        </main>
      </AppShell>
    );
  }

  const freeAnalysisStatus = await getProfileFreeAnalysisFoundationStatus(user.id, activeProfile);
  const free = await getFreeAnalysisResult(user.id, activeProfile.id);
  if (!hasVerifiedConsultingFoundation(activeProfile, free)) {
    return <AppShell activeProfileId={activeProfile.id}><main className="min-h-screen bg-[#f5f0fb] px-5 py-10"><section className="mx-auto max-w-xl rounded-3xl border border-[#ded0f5] bg-white p-8 text-center"><h1 className="text-2xl font-black">운담 선생님과 상담하기 전에</h1><p className="mt-3 leading-7 text-slate-600">현재 프로필의 무료 사주 분석을 먼저 완료해 주세요. 실제 사주 정보를 바탕으로 상담하며, 유료 리포트 구매는 필요하지 않습니다.</p><Link href={freeAnalysisStatus === "generating" ? `/loading?profileId=${encodeURIComponent(activeProfile.id)}` : "/saju"} className="mt-6 inline-flex rounded-xl bg-[#713bd6] px-5 py-3 font-bold text-white">무료 사주 먼저 보기</Link></section></main></AppShell>;
  }
  const account = await getAccountLifecycle(user.id);
  if (account?.status !== "ACTIVE" || account.paidEligibilityStatus !== "VERIFIED_ADULT") {
    return <AppShell activeProfileId={activeProfile.id}><main className="min-h-screen bg-[#f5f0fb] px-5 py-10"><section className="mx-auto max-w-xl rounded-3xl border border-[#ded0f5] bg-white p-8 text-center"><h1 className="text-2xl font-black">AI 상담 이용을 위한 성인인증</h1><p className="mt-3 leading-7 text-slate-600">성인인증을 완료하면 질문권으로 운담 선생님과 상담할 수 있습니다.</p><Link href="/account" className="mt-6 inline-flex rounded-xl bg-[#713bd6] px-5 py-3 font-bold text-white">계정 정보 및 성인인증 확인</Link></section></main></AppShell>;
  }
  // A report entry must start from the exact purchased report, never infer it
  // from a URL alone or silently switch to another active profile.
  const reportEntryRequested = Boolean(params.productId && params.edition && !isGeneralConsultingSource(params.productId, params.edition));
  const reportEntryMatchesProfile = !params.profileId || params.profileId === activeProfile.id;
  const requestedReport = reportEntryRequested && reportEntryMatchesProfile
    ? { productId: getCanonicalPremiumProductId(params.productId!), analysisEditionKey: params.edition! }
    : null;
  const initialPortfolioState = requestedReport
    ? await getAiConsultingPortfolioState({
        userId: user.id,
        profileId: activeProfile.id,
        profile: activeProfile,
        // Show unified, profile-scoped history even when arriving from a report.
        // Historical birth-input reports still remain isolated server-side.
        includePreviousSource: requestedReport,
      })
    : null;
  const verifiedReport = initialPortfolioState?.analyses.find((analysis) =>
    analysis.productId === requestedReport?.productId
    && analysis.analysisEditionKey === requestedReport.analysisEditionKey,
  ) ?? null;
  // No misleading "buy now" call to action for customers blocked by the
  // production-hosted TEST allowlist or the disabled credit checkout feature.
  let creditCheckoutAvailable = false;
  if (isAiConsultingCreditCheckoutEnabled(user.id)) {
    try {
      creditCheckoutAvailable = isTossCheckoutUserAllowed(user.id);
    } catch {
      creditCheckoutAvailable = false;
    }
  }

  return (
    <AppShell activeProfileId={activeProfile.id}>
    <AiConsultingPortfolioClient
      profileId={activeProfile.id}
      focusProductId={verifiedReport?.productId ?? null}
      focusEdition={verifiedReport?.analysisEditionKey ?? null}
      initialPortfolioState={initialPortfolioState}
      reportEntryUnavailable={reportEntryRequested && !verifiedReport}
      freeAnalysisStatus={freeAnalysisStatus}
      creditCheckoutAvailable={creditCheckoutAvailable}
    />
    </AppShell>
  );
}
