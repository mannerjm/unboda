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

export const metadata = {
  title: "오늘의 운보다 | 운보다",
  description: "매일 무료로 확인하는 나의 짧은 일일 명리 흐름",
};

// Pure presentation: no streak counters, artificial rewards, extra AI calls,
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
      <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#070d20_0%,#0b1330_48%,#090f24_100%)] px-5 pb-16 pt-7 text-white sm:px-8 sm:pb-20 sm:pt-10">
        {/* The same restrained night-sky / glass language as the home page. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.68] [background-image:radial-gradient(circle_at_12%_18%,rgba(255,255,255,.75)_0_1px,transparent_1.5px),radial-gradient(circle_at_78%_14%,rgba(174,159,255,.8)_0_1px,transparent_1.5px),radial-gradient(circle_at_65%_55%,rgba(255,255,255,.45)_0_1px,transparent_1.5px),radial-gradient(circle_at_28%_72%,rgba(130,165,255,.6)_0_1px,transparent_1.5px)] [background-size:210px_190px,260px_230px,180px_170px,300px_280px]" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-28 top-6 h-[30rem] w-[30rem] rounded-full bg-[#7054cf]/15 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-28 top-[32rem] h-80 w-80 rounded-full bg-[#284b88]/15 blur-3xl" />

        <div className="relative mx-auto w-full max-w-5xl">
          <nav className="mb-5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm" aria-label="오늘의 운보다 이동">
            <Link href="/" className="font-semibold text-[#aeb4ca] transition hover:text-white">← 운보다 홈</Link>
            <span className="rounded-full border border-[#f0d39b]/25 bg-[#f0d39b]/10 px-3 py-1.5 font-bold text-[#f1d8a5]">매일 무료 · 오늘의 운보다</span>
          </nav>

          <header className="relative overflow-hidden rounded-[1.7rem] border border-[#e4d3aa]/25 bg-[linear-gradient(115deg,rgba(238,187,114,.14),rgba(120,95,221,.16)_47%,rgba(255,255,255,.04))] px-6 pb-8 pt-7 shadow-[0_18px_70px_rgba(1,6,22,.3)] sm:rounded-[2rem] sm:px-10 sm:pb-10 sm:pt-10">
            <div aria-hidden="true" className="pointer-events-none absolute right-[-5rem] top-[-7rem] h-72 w-72 rounded-full bg-[#af8dff]/10 blur-3xl sm:right-5" />
            <div className="relative z-10 grid gap-7 md:grid-cols-[1fr_16rem] md:items-center">
              <div>
                <p className="text-xs font-black tracking-[.15em] text-[#efd199]">매일 무료 · DAILY UNBODA</p>
                <h1 className="mt-4 text-[2.6rem] font-black leading-[1.08] tracking-[-.06em] text-white sm:text-[3.65rem]">오늘의 운보다<span className="ml-1 text-[#f0ce8e]">✦</span></h1>
                <p className="mt-4 text-base font-semibold text-[#f5deaf]">{formattedDate}</p>
                <p className="mt-3 max-w-lg text-sm leading-7 text-[#c3c8da] sm:text-base">오늘의 나에게 필요한 짧은 흐름과 한 가지 제안. 날짜가 바뀌면 새로운 오늘의 운보다를 만날 수 있어요.</p>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-2 text-xs font-semibold text-white">
                    {profileLabel ? `오늘의 분석 대상 · ${profileLabel}` : "오늘의 분석 대상을 선택해 주세요"}
                  </span>
                  {profileLabel ? <Link href="/mypage" className="rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 text-xs font-semibold text-[#bcc1d5] transition hover:border-white/30 hover:text-white">대상 변경 →</Link> : null}
                </div>
                {ready ? (
                  <a href="#today-topic" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#f7e0af] px-6 py-3 text-sm font-black text-[#28233b] transition hover:-translate-y-0.5 hover:bg-[#fff0c9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                    오늘의 흐름 확인하기 <span aria-hidden="true">↘</span>
                  </a>
                ) : null}
              </div>
              <div className="relative mx-auto flex h-48 w-48 items-center justify-center sm:h-56 sm:w-56 md:h-64 md:w-64" aria-hidden="true">
                <div className="absolute inset-[4%] rounded-full border border-[#f4dcae]/15" />
                <div className="absolute inset-[15%] rounded-full border border-[#d4c1ff]/20" />
                <div className="absolute inset-[27%] rounded-full border border-[#edcf99]/25" />
                <div className="absolute inset-[20%] rounded-full bg-[radial-gradient(circle_at_38%_31%,rgba(255,245,204,.7),rgba(233,188,118,.27)_32%,rgba(126,99,213,.16)_63%,transparent_76%)] blur-xl" />
                <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full border border-[#f6dbaa]/45 bg-[radial-gradient(circle_at_35%_25%,#f9e2b6,#dfb97d_40%,#927cb2_82%)] text-[#27203d] shadow-[0_0_46px_rgba(237,198,136,.24)] sm:h-32 sm:w-32">
                  <span className="text-[11px] font-black tracking-[.22em]">TODAY</span>
                  <span className="mt-[-.3rem] text-[3.25rem] font-black leading-none tracking-[-.08em] sm:text-[3.8rem]">{day}</span>
                </div>
                <span className="absolute right-[3%] top-[20%] text-lg text-[#f7da9c]">✦</span>
                <span className="absolute bottom-[13%] left-[10%] text-sm text-[#b6a7ff]">✧</span>
                <span className="absolute left-[6%] top-[22%] h-1 w-1 rounded-full bg-white/70" />
                <span className="absolute bottom-[20%] right-[9%] h-1 w-1 rounded-full bg-[#f1d39c]" />
              </div>
            </div>
          </header>

          {children}

          <footer className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5 text-xs text-[#959cb5]">
            <span>운보다 · 매일 새로운 날짜에 만나는 무료 명리 콘텐츠</span>
            <Link href="/" className="font-semibold text-[#e1d5ff] underline decoration-[#8877b8] underline-offset-4 hover:text-white">운보다 홈으로 →</Link>
          </footer>
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
    <section className="mt-5 rounded-[1.7rem] border border-white/10 bg-white/[0.055] px-6 py-8 shadow-[0_16px_60px_rgba(2,8,30,.28)] backdrop-blur-xl sm:rounded-[2rem] sm:px-10 sm:py-10">
      <p className="text-xs font-black tracking-[.14em] text-[#d6be88]">오늘의 운보다를 시작하려면</p>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[#c0c6db] sm:text-base">{explanation}</p>
      <Link href={href} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#795cff,#9d78ff)] px-6 py-3 text-sm font-black text-white shadow-[0_10px_30px_rgba(109,79,231,.25)] transition hover:brightness-110">
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

  return (
    <TodayEventShell date={date} profileLabel={activeProfile.label} ready={Boolean(reading)}>
      {reading ? (
        <>
          <section id="today-topic" className="scroll-mt-6 mt-5 overflow-hidden rounded-[1.7rem] border border-[#a99bd8]/30 bg-[linear-gradient(130deg,rgba(35,35,77,.97),rgba(23,27,59,.98))] px-6 py-7 shadow-[0_16px_60px_rgba(2,8,30,.28)] sm:rounded-[2rem] sm:px-10 sm:py-10" aria-labelledby="today-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p id="today-heading" className="text-xs font-black tracking-[.13em] text-[#dfc38d]">TODAY'S NOTE · 오늘의 흐름</p>
              <span className="rounded-full border border-[#e7d099]/25 bg-[#e7d099]/10 px-3 py-1.5 text-xs font-semibold text-[#e8d29e]">오늘의 무료 분석</span>
            </div>
            <p className="mt-6 text-sm font-bold text-[#bfb3f3]">오늘 살펴볼 흐름</p>
            <h2 className="mt-2 text-[2rem] font-black leading-tight tracking-[-.04em] text-white sm:text-[2.8rem]">{reading.topic}</h2>
            <div className="mt-5 h-px w-20 bg-[linear-gradient(90deg,#f3cf8b,transparent)]" aria-hidden="true" />
            <p className="mt-5 max-w-3xl text-[15px] font-medium leading-8 text-[#e5e7f2] sm:text-lg sm:leading-9">{reading.flow}</p>
          </section>

          <section className="mt-4 rounded-[1.7rem] border border-[#eed6a2]/30 bg-[linear-gradient(115deg,rgba(239,201,136,.17),rgba(255,255,255,.055)_62%,rgba(138,111,223,.13))] px-6 py-7 shadow-[0_16px_60px_rgba(2,8,30,.2)] backdrop-blur-xl sm:rounded-[2rem] sm:px-10 sm:py-9" aria-labelledby="today-action">
            <div className="flex items-start gap-4">
              <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#f0d7a8]/30 bg-[#eed6a2]/10 text-2xl text-[#f6d69a]">✦</span>
              <div>
                <h2 id="today-action" className="text-sm font-black tracking-[.02em] text-[#efce91]">오늘의 한 가지 제안</h2>
                <p className="mt-2 text-base font-semibold leading-8 text-white sm:text-lg">{reading.action}</p>
              </div>
            </div>
          </section>
          <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-white/[0.035] px-5 py-5 text-sm leading-7 text-[#b4bcd2] sm:flex sm:items-center sm:justify-between sm:gap-5 sm:px-7">
            <div>
              <p className="font-black text-white">내일도, 새로운 오늘이 열려요.</p>
              <p className="mt-1 text-xs leading-6 text-[#a7afc9]">매일 날짜가 바뀌면 새로운 일일 흐름을 확인할 수 있습니다.</p>
            </div>
            <Link href="/" className="mt-4 inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.065] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10 sm:mt-0">운보다 홈으로 →</Link>
          </div>
          <p className="mt-5 px-1 text-xs leading-6 text-[#929bb6]">선택한 분석 대상의 사주와 오늘의 일진을 참고한 내용입니다. 실제 사건이나 결과를 확정적으로 예측하지 않습니다.</p>
        </>
      ) : (
        <section className="mt-5 rounded-[1.7rem] border border-white/10 bg-white/[0.055] px-6 py-8 backdrop-blur-xl sm:px-10 sm:py-10">
          <h2 className="text-xl font-bold text-white">오늘의 흐름을 불러오지 못했어요.</h2>
          <p className="mt-3 text-sm leading-7 text-[#bdc5dd]">계산 결과가 확인되지 않아 임의의 운세를 보여드리지 않습니다. 잠시 후 다시 방문해 주세요.</p>
          <Link href="/" className="mt-5 inline-flex text-sm font-bold text-[#e5d1a4] underline underline-offset-4">운보다 홈으로</Link>
        </section>
      )}
    </TodayEventShell>
  );
}
