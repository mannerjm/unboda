import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { listUserProfiles } from "@/app/lib/profiles/server";
import { getKoreaEvaluationDate } from "@/app/lib/evaluationContext";
import type { TodayReading } from "@/app/lib/dailyUnboda";
import { getCachedTodayReading } from "@/app/lib/dailyUnboda/server";

export const metadata = {
  title: "오늘의 운보다 | 운보다",
  description: "매일 무료로 확인하는 나의 짧은 일일 명리 흐름",
};

export default async function TodayPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?returnTo=/today");

  // The member's own daily result must never silently switch to a family
  // member when the active analysis profile changes elsewhere in the app.
  const profiles = await listUserProfiles(user.id);
  const selfProfile = profiles.find((profile) => profile.relationshipType === "self");
  const date = getKoreaEvaluationDate();

  if (!selfProfile) {
    return (
      <AppShell>
        <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-5 py-10 sm:px-8">
          <section className="w-full rounded-[2rem] border border-[#dfe3ef] bg-white p-7 shadow-[0_16px_44px_rgba(32,38,72,.06)] sm:p-10">
            <p className="text-xs font-black tracking-[.16em] text-[#7866d8]">DAILY UNBODA · 매일 무료</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#11162d]">오늘의 운보다</h1>
            <p className="mt-4 text-sm leading-7 text-[#59647c]">본인의 출생정보를 등록하면 매일 짧은 일일 흐름을 무료로 확인할 수 있어요. 가족 등 다른 분석 대상으로 선택한 프로필은 본인의 결과로 사용하지 않습니다.</p>
            <Link href="/mypage" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#6755d2] px-5 py-3 text-sm font-black text-white hover:bg-[#5543c0]">마이페이지에서 본인 등록하기</Link>
          </section>
        </main>
      </AppShell>
    );
  }

  let reading: TodayReading | null = null;
  try {
    // Cache only the derived daily text, never the user's session/profile lookup.
    reading = await getCachedTodayReading(user.id, selfProfile, date);
  } catch (error) {
    // Fail closed: never show a generic daily fortune as though calculated.
    console.error("[today] Daily reading calculation failed", error instanceof Error ? error.message : "unknown");
  }

  const formattedDate = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Seoul",
  }).format(new Date(`${date}T12:00:00+09:00`));

  return (
    <AppShell>
      <main className="min-h-[75vh] bg-[#f5f7fc] px-5 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto w-full max-w-3xl">
          <div className="rounded-[2rem] border border-[#dee2f0] bg-white shadow-[0_22px_64px_rgba(32,38,72,.07)]">
            <header className="rounded-t-[2rem] bg-[linear-gradient(135deg,#0b1530,#1b1a43_70%,#322650)] px-6 py-8 text-white sm:px-10 sm:py-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black tracking-[.16em] text-[#c0b4ff]">DAILY UNBODA · 매일 무료</p>
                  <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">오늘의 운보다</h1>
                  <p className="mt-3 text-sm text-[#ccd1e6]">{formattedDate}</p>
                  <p className="mt-2 text-xs text-[#aab2ce]">{selfProfile.label}님의 오늘</p>
                </div>
                <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#e1d9ff]/20 bg-[#a58bff]/15 text-2xl text-[#f5d28a]">✦</span>
              </div>
            </header>
            {reading ? (
              <div className="space-y-6 px-6 py-8 sm:px-10 sm:py-10">
                <section aria-labelledby="today-flow">
                  <p className="inline-flex rounded-full bg-[#f0edff] px-3 py-1.5 text-xs font-bold text-[#6150be]">오늘의 짧은 흐름</p>
                  <h2 id="today-flow" className="sr-only">오늘의 짧은 흐름</h2>
                  <p className="mt-4 text-base font-medium leading-8 text-[#263049] sm:text-lg">{reading.flow}</p>
                </section>
                <section className="space-y-5 rounded-2xl border border-[#e7e6f1] bg-[#f8f8fd] p-5 sm:p-6" aria-label="오늘 살펴볼 주제와 한 가지 제안">
                  <div>
                    <h2 className="text-xs font-black tracking-wide text-[#7165aa]">오늘 살펴볼 주제</h2>
                    <p className="mt-2 text-lg font-black text-[#1a2340]">{reading.topic}</p>
                  </div>
                  <div className="border-t border-[#e1e0ee] pt-5">
                    <h2 className="text-xs font-black tracking-wide text-[#7165aa]">오늘의 한 가지 제안</h2>
                    <p className="mt-2 text-sm leading-7 text-[#36415e]">{reading.action}</p>
                  </div>
                </section>
                <p className="text-xs leading-6 text-[#778197]">본인의 사주와 오늘의 일진 사이의 십성·지지 관계를 참고해 구성한 짧은 명리 콘텐츠입니다. 실제 사건이나 결과를 확정적으로 예측하지 않습니다.</p>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e9eaf2] pt-5">
                  <p className="text-xs text-[#79829a]">내일은 새로운 날짜의 흐름을 확인할 수 있어요.</p>
                  <Link href="/" className="text-sm font-bold text-[#6553cd] underline underline-offset-4 hover:text-[#4933a4]">운보다 홈으로</Link>
                </div>
              </div>
            ) : (
              <div className="px-6 py-10 sm:px-10">
                <p className="text-base font-bold text-[#263049]">오늘의 흐름을 불러오지 못했어요.</p>
                <p className="mt-2 text-sm leading-7 text-[#66718a]">계산 결과가 확인되지 않아 임의의 운세를 보여드리지 않습니다. 잠시 후 다시 방문해 주세요.</p>
                <Link href="/" className="mt-5 inline-block text-sm font-bold text-[#6553cd] underline underline-offset-4">운보다 홈으로</Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
