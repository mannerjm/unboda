import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getMyUnbodaJourney, type MyUnbodaMemory } from "@/app/lib/aiConsulting/journey";

export const dynamic = "force-dynamic";

const MEMORY_LABELS: Record<MyUnbodaMemory["kind"], string> = {
  user_fact: "현재 상황",
  life_event: "최근 변화",
  goal: "목표",
  preference: "내 기준",
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default async function MyUnbodaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?returnTo=/my-unboda");

  const activeProfile = await getActiveProfile(user.id);
  if (!activeProfile) redirect("/mypage");

  const journey = await getMyUnbodaJourney({
    userId: user.id,
    profileId: activeProfile.id,
  });

  return (
    <AppShell>
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-[#11162d] sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <Link href="/mypage" className="text-sm font-semibold text-slate-600 underline underline-offset-4">← 마이페이지</Link>

          <header className="mt-5 overflow-hidden rounded-[2rem] border border-[#d8d3ff] bg-[radial-gradient(circle_at_82%_20%,rgba(113,89,233,0.12),transparent_30%),linear-gradient(145deg,#ffffff_0%,#f5f3ff_100%)] p-6 shadow-sm sm:p-8">
            <p className="text-xs font-black tracking-[0.16em] text-[#6f5ce7]">MY UNBODA</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-4xl">나의 운보다 기록</h1>
            <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-700">
              {activeProfile.label}님의 구매 리포트, AI 상담, 직접 저장한 상황과 목표가 시간 순서로 이어집니다.
              오래 쓸수록 지난 고민과 지금의 변화를 한곳에서 돌아볼 수 있어요.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/ai-consulting" className="rounded-xl bg-[#6f5ce7] px-4 py-3 text-sm font-bold text-white">AI 상담 이어가기 →</Link>
              <Link href="/purchased-analyses" className="rounded-xl border border-[#dce1ef] bg-white px-4 py-3 text-sm font-bold text-slate-700">구매 리포트 보기</Link>
            </div>
          </header>

          <section className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="나의 운보다 요약">
            <div className="rounded-2xl border border-[#dce1ef] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-500">현재 저장한 상황·목표</p>
              <p className="mt-2 text-3xl font-black">{journey.activeMemoryCount}<span className="ml-1 text-sm font-semibold text-slate-500">개</span></p>
            </div>
            <div className="rounded-2xl border border-[#dce1ef] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-500">완료된 구매 리포트</p>
              <p className="mt-2 text-3xl font-black">{journey.completedReportCount}<span className="ml-1 text-sm font-semibold text-slate-500">개</span></p>
            </div>
            <div className="rounded-2xl border border-[#dce1ef] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-500">이어진 AI 상담</p>
              <p className="mt-2 text-3xl font-black">{journey.consultationCount}<span className="ml-1 text-sm font-semibold text-slate-500">개</span></p>
            </div>
          </section>

          <section className="mt-5 rounded-[1.75rem] border border-[#dce1ef] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-[0.14em] text-[#6f5ce7]">NOW</p>
                <h2 className="mt-2 text-xl font-black">지금 기억하고 있는 내 상황</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">내가 직접 허용해 저장한 현재 내용만 다음 상담에서 사용자 사실로 참고합니다.</p>
              </div>
              <Link href="/ai-consulting" className="text-sm font-bold text-[#5e4bd1] underline underline-offset-4">상담에서 관리하기 →</Link>
            </div>
            {journey.currentMemories.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-[#f7f8fc] px-4 py-5 text-sm leading-6 text-slate-600">
                아직 저장한 상황이나 목표가 없습니다. AI 상담에서 내가 남긴 말 중 다음 상담에도 이어갈 내용만 직접 선택해 저장할 수 있어요.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {journey.currentMemories.map((memory) => (
                  <div key={memory.id} className="rounded-2xl border border-[#eceef5] bg-[#fafbff] px-4 py-4">
                    <p className="text-xs font-bold text-[#5e4bd1]">{MEMORY_LABELS[memory.kind]}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{memory.content}</p>
                    <p className="mt-2 text-[11px] text-slate-400">마지막 업데이트 {formatDate(memory.updatedAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-5 rounded-[1.75rem] border border-[#dce1ef] bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-bold tracking-[0.14em] text-[#6f5ce7]">TIMELINE</p>
            <h2 className="mt-2 text-xl font-black">내 흐름이 어떻게 이어졌는지</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              운보다가 결과를 맞았다고 판정하지 않습니다. 당시 구매한 분석과 내가 직접 남긴 상황 변화를 날짜 순서로 함께 보여줍니다.
            </p>

            {journey.timeline.length === 0 ? (
              <div className="mt-5 rounded-2xl bg-[#f7f8fc] px-4 py-5 text-sm leading-6 text-slate-600">
                아직 쌓인 기록이 없습니다. 리포트를 구매하거나 AI 상담에서 상황을 저장하면 이곳에 시간 순서로 이어집니다.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {journey.timeline.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-[#eceef5] bg-[#fafbff] px-4 py-4 sm:px-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-[#eeecff] px-3 py-1 text-[11px] font-black text-[#5e4bd1]">{item.label}</span>
                      <time className="text-xs text-slate-400">{formatDate(item.occurredAt)}</time>
                    </div>
                    <h3 className="mt-3 text-base font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.description}</p>
                    {item.href ? <Link href={item.href} className="mt-3 inline-flex text-xs font-bold text-[#5e4bd1] underline underline-offset-4">관련 기록 보기 →</Link> : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </AppShell>
  );
}
