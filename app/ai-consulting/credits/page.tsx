import Link from "next/link";
import Script from "next/script";
import CreditCheckoutClient from "./CreditCheckoutClient";
import {
  isAiConsultingCreditCheckoutEnabled,
} from "@/app/lib/aiConsulting/creditCheckout";
import { AI_CONSULTING_CREDIT_BUNDLES } from "@/app/lib/aiConsulting/commercialPolicy";
import { getAiConsultingSessionState } from "@/app/lib/aiConsulting/session";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getTossConfig } from "@/app/lib/toss/config";

export default async function AiConsultingCreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ profileId?: string; productId?: string; edition?: string }>;
}) {
  const { profileId, productId, edition } = await searchParams;
  const returnParams = profileId && productId && edition
    ? new URLSearchParams({ profileId, productId, edition }).toString()
    : "";
  const consultationHref = returnParams ? `/ai-consulting?${returnParams}` : "/";
  const currentHref = returnParams ? `/ai-consulting/credits?${returnParams}` : "/ai-consulting/credits";
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f2e8] px-5 text-stone-900">
        <section className="w-full max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold">로그인이 필요합니다</h1>
          <p className="mt-3 text-sm leading-7 text-stone-600">AI 질문권은 구매한 심층 분석과 같은 계정·프로필에 연결됩니다.</p>
          <Link
            href={`/auth/login?returnTo=${encodeURIComponent(currentHref)}`}
            className="mt-6 inline-flex rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white"
          >
            로그인
          </Link>
        </section>
      </main>
    );
  }

  if (!profileId || !isProfileId(profileId) || !productId || !edition) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f2e8] px-5 text-stone-900">
        <section className="w-full max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold">AI 질문권 구매 정보를 확인하지 못했습니다</h1>
          <p className="mt-3 text-sm leading-7 text-stone-600">구매한 심층 분석의 AI 상담 화면에서 다시 진입해 주세요.</p>
        </section>
      </main>
    );
  }

  const profile = await getUserProfile(profileId, user.id).catch(() => null);
  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f2e8] px-5 text-stone-900">
        <section className="w-full max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold">프로필을 확인하지 못했습니다</h1>
          <Link href={consultationHref} className="mt-5 inline-flex text-sm font-semibold underline underline-offset-4">AI 상담으로 돌아가기</Link>
        </section>
      </main>
    );
  }

  let session;
  try {
    session = await getAiConsultingSessionState({
      userId: user.id,
      profileId: profile.id,
      productId,
      analysisEditionKey: edition,
    });
  } catch {
    session = null;
  }

  if (!session || session.state === "report_required") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f2e8] px-5 text-stone-900">
        <section className="w-full max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold">AI 질문권을 구매할 수 있는 분석이 아닙니다</h1>
          <p className="mt-3 text-sm leading-7 text-stone-600">완료된 구매 심층 분석의 AI 상담 화면에서 질문권을 구매해 주세요.</p>
          <Link href={consultationHref} className="mt-5 inline-flex text-sm font-semibold underline underline-offset-4">AI 상담으로 돌아가기</Link>
        </section>
      </main>
    );
  }

  let providerReady = false;
  if (isAiConsultingCreditCheckoutEnabled()) {
    try {
      getTossConfig();
      providerReady = true;
    } catch {
      providerReady = false;
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f2e8] px-5 py-10 text-stone-900">
      <Script src="https://js.tosspayments.com/v2/standard" strategy="afterInteractive" />
      <div className="mx-auto max-w-4xl">
        <Link href={consultationHref} className="text-sm font-semibold text-stone-600 hover:text-stone-900">
          ← AI 상담으로 돌아가기
        </Link>

        <header className="mt-7 rounded-[2rem] bg-stone-950 p-7 text-white shadow-xl sm:p-9">
          <p className="text-xs font-semibold tracking-[0.2em] text-amber-300">UNBODA AI CREDIT</p>
          <h1 className="mt-3 text-3xl font-bold">AI 질문권 구매</h1>
          <p className="mt-4 text-sm leading-7 text-stone-300">
            {profile.label} 프로필의 공통 질문권입니다. 남은 질문권은 다른 시기·다른 주제의 구매 심층 분석에서도 같은 프로필이라면 이어서 사용할 수 있습니다.
          </p>
        </header>

        <CreditCheckoutClient
          customerKey={user.id}
          profileId={profile.id}
          productId={productId}
          edition={edition}
          currentBalance={session.questionsRemaining}
          bundles={AI_CONSULTING_CREDIT_BUNDLES}
          checkoutEnabled={providerReady}
        />

        <p className="mt-6 text-xs leading-6 text-stone-500">
          질문권만으로 구매하지 않은 심층 분석 내용이 열리지는 않습니다. 범위를 벗어난 질문, 확인 요청, 안전 안내, 생성 실패에는 질문권이 차감되지 않습니다.
        </p>
      </div>
    </main>
  );
}
