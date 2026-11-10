import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import AppShell from "@/app/components/AppShell";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import {
  getProfileFreeAnalysisFoundationStatus,
  isFreeAnalysisFoundationReady,
} from "@/app/lib/freeAnalysisEligibility";
import { getKoreaEvaluationDate } from "@/app/lib/evaluationContext";
import type { TodayReading } from "@/app/lib/dailyUnboda";
import { getCachedTodayReading } from "@/app/lib/dailyUnboda/server";
import { recordCustomerJourneyEvent } from "@/app/lib/analytics/customerJourney";

export const metadata = {
  title: "오늘의 운보다 | 운보다",
  description: "매일 무료로 확인하는 나의 짧은 일일 명리 흐름",
};

// Pure presentation: no fabricated visit incentives, extra AI calls,
// commercial prompts or changes to the date/profile-specific reading engine.
function TodayEventShell({
  date,
  profileLabel,
  ready,
  children,
}: {
  date: string;
  profileLabel: string | null;
  ready: boolean;
  children: ReactNode;
}) {
  const formattedDate = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Seoul",
  }).format(new Date(`${date}T12:00:00+09:00`));
  const day = Number(date.slice(8, 10));

  return (
    <AppShell>
      <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_50%_0%,#ffffff_0%,#f9f3ff_42%,#eee6ff_100%)] px-5 pb-16 pt-7 text-[#281744] sm:px-8 sm:pb-20 sm:pt-10">
        {/* Subtle orbital light echoes the approved white-lavender homepage without changing the daily reading. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.42] [background-image:radial-gradient(circle_at_12%_18%,rgba(154,109,221,.3)_0_1px,transparent_1.5px),radial-gradient(circle_at_78%_14%,rgba(174,159,255,.5)_0_1px,transparent_1.5px),radial-gradient(circle_at_65%_55%,rgba(178,141,227,.35)_0_1px,transparent_1.5px),radial-gradient(circle_at_28%_72%,rgba(130,165,255,.25)_0_1px,transparent_1.5px)] [background-size:210px_190px,260px_230px,180px_170px,300px_280px]" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-28 top-6 h-[30rem] w-[30rem] rounded-full bg-[#c5a6ff]/25 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-28 top-[32rem] h-80 w-80 rounded-full bg-[#d8c5f7]/25 blur-3xl" />

        <div className="relative mx-auto w-full max-w-5xl">
          <header className="relative overflow-hidden rounded-[1.7rem] border border-[#e6d5fa] bg-[radial-gradient(circle_at_83%_18%,rgba(225,192,255,.72),transparent_39%),linear-gradient(130deg,#ffffff_0%,#fbf6ff_48%,#eee0ff_100%)] px-6 pb-8 pt-7 shadow-[0_20px_64px_rgba(112,76,174,.13)] sm:rounded-[2rem] sm:px-10 sm:pb-10 sm:pt-10">
            <div aria-hidden="true" className="pointer-events-none absolute right-[-5rem] top-[-7rem] h-72 w-72 rounded-full bg-[#b98afb]/25 blur-3xl sm:right-5" />
            <div className="relative z-10 grid gap-7 md:grid-cols-[1fr_16rem] md:items-center">
              <div>
                <p className="text-xs font-black tracking-[.15em] text-[#8050b9]">매일 무료 · DAILY UNBODA</p>
                <h1 className="mt-4 text-[2.6rem] font-black leading-[1.08] tracking-[-.06em] text-[#291744] sm:text-[3.65rem]">오늘의 운보다<span className="ml-1 text-[#bb8740]">✦</span></h1>
                <p className="mt-4 text-base font-semibold text-[#8056b8]">{formattedDate}</p>
                <p className="mt-3 max-w-lg text-sm leading-7 text-[#5f5373] sm:text-base">오늘의 나에게 필요한 짧은 흐름과 한 가지 제안. 날짜가 바뀌면 새로운 오늘의 운보다를 만날 수 있어요.</p>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#e5d5fa] bg-white/85 px-3.5 py-2 text-xs font-semibold text-[#4a2a70]">
                    {profileLabel ? `오늘의 분석 대상 · ${profileLabel}` : "오늘의 분석 대상을 선택해 주세요"}
                  </span>
                  {profileLabel ? <Link href="/mypage" className="rounded-full border border-[#dcc7f6] bg-white/60 px-3.5 py-2 text-xs font-semibold text-[#68429c] transition hover:border-[#b899e6] hover:text-[#442174]">대상 변경 →</Link> : null}
                </div>
                {ready ? (
                  <a href="#today-topic" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#8853dc,#6b3fc2)] px-6 py-3 text-sm font-black text-white shadow-[0_10px_26px_rgba(112,69,196,.22)] transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8050b9]">
                    오늘의 흐름 확인하기 <span aria-hidden="true">↘</span>
                  </a>
                ) : null}
              </div>
              <div className="relative mx-auto flex h-48 w-48 items-center justify-center sm:h-56 sm:w-56 md:h-64 md:w-64" aria-hidden="true">
                <div className="absolute inset-[4%] rounded-full border border-[#d9b8ef]/50" />
                <div className="absolute inset-[15%] rounded-full border border-[#b996e8]/35" />
                <div className="absolute inset-[27%] rounded-full border border-[#cf9edc]/40" />
                <div className="absolute inset-[20%] rounded-full bg-[radial-gradient(circle_at_38%_31%,rgba(255,242,211,.86),rgba(236,199,145,.38)_32%,rgba(163,107,232,.25)_63%,transparent_76%)] blur-xl" />
                <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full border border-white/80 bg-[radial-gradient(circle_at_35%_25%,#fff5d7,#f1ce91_37%,#b68ad7_84%)] text-[#38214e] shadow-[0_12px_45px_rgba(161,107,202,.27),inset_0_2px_6px_rgba(255,255,255,.75)] sm:h-32 sm:w-32">
                  <span className="text-[11px] font-black tracking-[.22em]">TODAY</span>
                  <span className="mt-[-.3rem] text-[3.25rem] font-black leading-none tracking-[-.08em] sm:text-[3.8rem]">{day}</span>
                </div>
                <span className="absolute right-[3%] top-[20%] text-lg text-[#ba8a43]">✦</span>
                <span className="absolute bottom-[13%] left-[10%] text-sm text-[#a16bdd]">✧</span>
                <span className="absolute left-[6%] top-[22%] h-1 w-1 rounded-full bg-[#b99cde]/75" />
                <span className="absolute bottom-[20%] right-[9%] h-1 w-1 rounded-full bg-[#cb9d62]" />
              </div>
            </div>
          </header>

          {children}

        </div>
      </main>
    </AppShell>
  );
}

function TodayEntryCard({ title, explanation, href, action }: {
  title: string;
  explanation: string;
  href: string;
  action: string;
}) {
  return (
    <section className="mt-5 rounded-[1.7rem] border border-[#e8dbf7] bg-white/90 px-6 py-8 shadow-[0_16px_48px_rgba(100,61,165,.1)] backdrop-blur-xl sm:rounded-[2rem] sm:px-10 sm:py-10">
      <p className="text-xs font-black tracking-[.14em] text-[#8d5bbd]">오늘의 운보다를 시작하려면</p>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-[#291744] sm:text-3xl">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[#615371] sm:text-base">{explanation}</p>
      <Link href={href} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#8853dc,#6b3fc2)] px-6 py-3 text-sm font-black text-white shadow-[0_10px_30px_rgba(109,79,231,.25)] transition hover:brightness-110">
        {action} <span aria-hidden="true" className="ml-2">→</span>
      </Link>
    </section>
  );
}

export default async function TodayPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?returnTo=/today");

  // Keep the explicitly selected profile and the existing exact-profile,
  // birth-fingerprint free-saju prerequisite. Never calculate another
  // person's daily reading or create an analysis from this landing page.
  const activeProfile = await getActiveProfile(user.id);
  const date = getKoreaEvaluationDate();

  if (!activeProfile) {
    return (
      <TodayEventShell date={date} profileLabel={null} ready={false}>
        <TodayEntryCard
          title="오늘은 누구의 흐름을 볼까요?"
          explanation="마이페이지에서 분석 대상을 선택하면 해당 대상의 오늘의 흐름을 무료로 확인할 수 있어요. 다른 대상을 선택하면 그 대상의 오늘의 운보다로 변경됩니다."
          href="/mypage"
          action="마이페이지에서 분석 대상 선택하기"
        />
      </TodayEventShell>
    );
  }

  // A birth profile alone is not sufficient: the member must finish the
  // EXISTING free-saju journey for this exact active profile/birth fingerprint.
  // Do not invoke free-analysis generation here or reuse another profile's result.
  const freeAnalysisStatus = await getProfileFreeAnalysisFoundationStatus(user.id, activeProfile);
  if (!isFreeAnalysisFoundationReady(freeAnalysisStatus)) {
    const isGenerating = freeAnalysisStatus === "generating";
    const entryHref = isGenerating
      ? `/loading?profileId=${encodeURIComponent(activeProfile.id)}`
      : "/saju";
    return (
      <TodayEventShell date={date} profileLabel={activeProfile.label} ready={false}>
        <TodayEntryCard
          title={isGenerating ? "오늘의 흐름을 준비하고 있어요" : "무료 사주를 먼저 확인해 주세요"}
          explanation={isGenerating
            ? "현재 무료 사주를 분석하고 있어요. 분석이 완료되면 결과를 확인한 뒤 오늘의 운보다를 이용할 수 있습니다."
            : freeAnalysisStatus === "stale"
              ? "출생정보가 변경되어 현재 정보로 무료 사주를 다시 확인해야 합니다."
              : `${activeProfile.label}님의 오늘의 운보다를 보려면 먼저 해당 프로필의 무료 사주 분석을 완료하고 결과를 확인해 주세요.`}
          href={entryHref}
          action={isGenerating ? "무료 사주 분석 진행 상황 보기" : freeAnalysisStatus === "stale" ? "무료 사주 다시 조회하기" : "무료 사주 먼저 조회하기"}
        />
      </TodayEventShell>
    );
  }

  let reading: TodayReading | null = null;
  try {
    // Cache only the derived daily text, never the member/session/profile lookup.
    reading = await getCachedTodayReading(user.id, activeProfile, date);
  } catch (error) {
    // Fail closed: never show a generic daily fortune as though calculated.
    console.error("[today] Daily reading calculation failed", error instanceof Error ? error.message : "unknown");
  }

  if (reading) {
    await recordCustomerJourneyEvent({
      eventName: "TODAY_VIEWED",
      accountId: user.id,
      profileId: activeProfile.id,
      eventDateKst: date,
    });
  }

  return (
    <TodayEventShell date={date} profileLabel={activeProfile.label} ready={Boolean(reading)}>
      {reading ? (
        <>
          <section id="today-topic" className="scroll-mt-6 mt-5 overflow-hidden rounded-[1.7rem] border border-[#e2d0f7] bg-[linear-gradient(135deg,#ffffff_0%,#faf5ff_64%,#f0e5ff_100%)] px-6 py-7 shadow-[0_18px_48px_rgba(105,69,163,.11)] sm:rounded-[2rem] sm:px-10 sm:py-10" aria-labelledby="today-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p id="today-heading" className="text-xs font-black tracking-[.13em] text-[#8050b9]">TODAY'S NOTE · 오늘의 흐름</p>
              <span className="rounded-full border border-[#dfc8f5] bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#7946ae]">오늘의 무료 분석</span>
            </div>
            <p className="mt-6 text-sm font-bold text-[#7c51b1]">오늘 살펴볼 흐름</p>
            <h2 className="mt-2 max-w-3xl text-[1.75rem] font-black leading-snug tracking-[-.035em] text-[#291744] sm:text-[2.25rem]">{reading.topic}</h2>
            <div className="mt-5 h-px w-20 bg-[linear-gradient(90deg,#b783de,transparent)]" aria-hidden="true" />
            <p className="mt-5 max-w-2xl text-[15px] font-medium leading-7 text-[#51445f] sm:text-base sm:leading-8">{reading.flow}</p>
          </section>

          <section className="mt-4 rounded-[1.7rem] border border-[#ead7f9] bg-[linear-gradient(115deg,#fffdf8,#fff9ff_62%,#f2e7ff)] px-6 py-7 shadow-[0_14px_40px_rgba(101,67,157,.09)] backdrop-blur-xl sm:rounded-[2rem] sm:px-10 sm:py-9" aria-labelledby="today-action">
            <div className="flex items-start gap-4">
              <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#e8cfec] bg-[#f8edff] text-2xl text-[#ac72ca]">✦</span>
              <div>
                <h2 id="today-action" className="text-sm font-black tracking-[.02em] text-[#8251b9]">오늘의 한 가지 제안</h2>
                <p className="mt-2 text-base font-semibold leading-8 text-[#392250] sm:text-lg">{reading.action}</p>
              </div>
            </div>
          </section>
          <div className="mt-4 rounded-[1.4rem] border border-[#e6d7f5] bg-white/80 px-5 py-5 text-sm leading-7 text-[#645477] sm:flex sm:items-center sm:justify-between sm:gap-5 sm:px-7">
            <div>
              <p className="font-black text-[#36204c]">오늘 한 가지만 기억하세요.</p>
              <p className="mt-1 text-xs leading-6 text-[#70617f]">위의 한 가지 제안만 기억해도 충분해요. 내일 날짜가 바뀌면 새로운 흐름이 열립니다.</p>
            </div>
            <Link href="/" className="mt-4 inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl border border-[#d7bfee] bg-white px-5 py-2.5 text-sm font-bold text-[#60359b] transition hover:bg-[#f7efff] sm:mt-0">운보다 홈으로 →</Link>
          </div>
          <p className="mt-5 px-1 text-xs leading-6 text-[#766684]">선택한 분석 대상의 사주와 오늘의 일진을 참고한 내용입니다. 실제 사건이나 결과를 확정적으로 예측하지 않습니다.</p>
        </>
      ) : (
        <section className="mt-5 rounded-[1.7rem] border border-[#e6d7f5] bg-white/90 px-6 py-8 shadow-[0_14px_40px_rgba(101,67,157,.08)] sm:px-10 sm:py-10">
          <h2 className="text-xl font-bold text-[#291744]">오늘의 흐름을 불러오지 못했어요.</h2>
          <p className="mt-3 text-sm leading-7 text-[#615371]">계산 결과가 확인되지 않아 임의의 운세를 보여드리지 않습니다. 잠시 후 다시 방문해 주세요.</p>
          <Link href="/" className="mt-5 inline-flex text-sm font-bold text-[#6e3fb4] underline underline-offset-4">운보다 홈으로</Link>
        </section>
      )}
    </TodayEventShell>
  );
}
