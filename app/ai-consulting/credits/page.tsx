import Link from "next/link";
import Script from "next/script";
import CreditCheckoutClient from "./CreditCheckoutClient";
import {
  isAiConsultingCreditCheckoutEnabled,
} from "@/app/lib/aiConsulting/creditCheckout";
import {
  AI_CONSULTING_CREDIT_BUNDLES,
  getAiConsultingCreditBundle,
} from "@/app/lib/aiConsulting/commercialPolicy";
import {
  listAiConsultingCreditHistory,
  type AiConsultingCreditHistoryEntry,
} from "@/app/lib/aiConsulting/creditHistory";
import { getAiConsultingSessionState } from "@/app/lib/aiConsulting/session";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getTossConfig } from "@/app/lib/toss/config";

function getHistoryLabel(entry: AiConsultingCreditHistoryEntry): string {
  if (entry.entryType === "PURCHASE") {
    const bundle = entry.bundleId ? getAiConsultingCreditBundle(entry.bundleId) : null;
    return bundle ? `AI 질문권 ${bundle.questions}회 구매` : "AI 질문권 구매";
  }
  if (entry.entryType === "CONSUME") return "AI 상담 답변 1회 사용";
  if (entry.entryType === "REFUND") return "AI 질문권 환불";
  return "AI 질문권 조정";
}

function getHistoryTypeLabel(entry: AiConsultingCreditHistoryEntry): string {
  if (entry.entryType === "PURCHASE") return "구매";
  if (entry.entryType === "CONSUME") return "사용";
  if (entry.entryType === "REFUND") return "환불";
  return "조정";
}

function formatCreditDelta(quantity: number): string {
  return `${quantity > 0 ? "+" : ""}${quantity}회`;
}

function formatHistoryDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

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
          <h1 className="text-xl font-bold">AI 질문권 정보를 확인하지 못했습니다</h1>
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
          <h1 className="text-xl font-bold">AI 질문권을 사용할 수 있는 분석이 아닙니다</h1>
          <p className="mt-3 text-sm leading-7 text-stone-600">완료된 구매 심층 분석의 AI 상담 화면에서 질문권을 확인해 주세요.</p>
          <Link href={consultationHref} className="mt-5 inline-flex text-sm font-semibold underline underline-offset-4">AI 상담으로 돌아가기</Link>
        </section>
      </main>
    );
  }

  const history = await listAiConsultingCreditHistory({
    userId: user.id,
    profileId: profile.id,
    limit: 50,
  }).catch(() => []);

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
          <h1 className="mt-3 text-3xl font-bold">AI 질문권 관리</h1>
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

        <section className="mt-8 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">CREDIT HISTORY</p>
              <h2 className="mt-2 text-xl font-bold text-stone-950">질문권 구매·사용 내역</h2>
            </div>
            <p className="text-sm text-stone-600">현재 잔액 <strong className="text-stone-950">{session.questionsRemaining}회</strong></p>
          </div>

          <p className="mt-4 text-sm leading-7 text-stone-600">
            정상 AI 답변이 저장되어 실제 차감된 경우에만 사용 내역이 기록됩니다. 최근 50건을 표시합니다.
          </p>

          {history.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-stone-300 px-5 py-8 text-center text-sm leading-7 text-stone-500">
              아직 질문권 구매 또는 사용 내역이 없습니다.
            </div>
          ) : (
            <ul className="mt-6 divide-y divide-stone-200 border-y border-stone-200">
              {history.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                        {getHistoryTypeLabel(entry)}
                      </span>
                      <p className="font-semibold text-stone-950">{getHistoryLabel(entry)}</p>
                    </div>
                    <p className="mt-2 text-xs text-stone-500">{formatHistoryDate(entry.createdAt)}</p>
                  </div>
                  <span className={`shrink-0 text-base font-bold ${entry.quantity > 0 ? "text-emerald-700" : "text-stone-800"}`}>
                    {formatCreditDelta(entry.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-6 text-xs leading-6 text-stone-500">
          질문권만으로 구매하지 않은 심층 분석 내용이 열리지는 않습니다. 범위를 벗어난 질문, 확인 요청, 안전 안내, 생성 실패에는 질문권이 차감되지 않습니다.
        </p>
      </div>
    </main>
  );
}
