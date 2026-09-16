import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import FamilyParentChildAnalysisClient from "@/app/components/FamilyParentChildAnalysisClient";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";

const REPORT_AREAS = [
  {
    title: "정서적 연결",
    description: "서로 가까워지기 쉬운 방식과 감정을 주고받는 거리감을 살펴봅니다.",
  },
  {
    title: "대화 방식",
    description: "말을 꺼내는 속도, 반응하는 방식, 같은 뜻도 다르게 받아들이기 쉬운 지점을 봅니다.",
  },
  {
    title: "기대와 독립",
    description: "가족으로서 기대하는 부분과 각자 스스로 결정하고 싶은 영역 사이의 균형을 살펴봅니다.",
  },
  {
    title: "보호와 경계",
    description: "도움과 관심이 힘이 되는 지점, 반대로 간섭이나 압박처럼 느껴지기 쉬운 지점을 나눠 봅니다.",
  },
  {
    title: "갈등 뒤 회복",
    description: "다툰 뒤 다시 대화를 시작하기 쉬운 조건과 반복되는 갈등을 줄이는 방식을 살펴봅니다.",
  },
  {
    title: "현재 관계 흐름",
    description: "기본 관계와 별개로, 올해 두 사람의 부담과 여유가 관계에 어떻게 겹치는지 따로 살펴봅니다.",
  },
] as const;

export default async function ParentChildCompatibilityPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login?returnTo=/special-analysis/compatibility/family/parent-child");
  }

  const activeProfile = await getActiveProfile(user.id);
  if (!activeProfile) {
    return (
      <AppShell>
        <main className="min-h-screen bg-[#fbfbfa] px-5 py-8 text-stone-900 sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-3xl">
            <Link href="/special-analysis/compatibility/family" className="text-sm font-semibold text-stone-600 underline decoration-stone-300 underline-offset-4">← 가족 궁합</Link>
            <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-8 text-center">
              <h1 className="text-2xl font-bold text-stone-950">부모·자녀 궁합</h1>
              <p className="mt-4 text-sm leading-7 text-stone-600">분석할 내 프로필을 먼저 선택해 주세요.</p>
              <Link href="/mypage" className="mt-5 inline-flex rounded-2xl bg-stone-900 px-5 py-3 text-sm font-bold text-white">마이페이지에서 프로필 선택</Link>
            </section>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell activeProfileId={activeProfile.id}>
      <main className="min-h-screen bg-[#fbfbfa] px-5 py-8 text-stone-900 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <Link href="/special-analysis/compatibility/family" className="text-sm font-semibold text-stone-600 underline decoration-stone-300 underline-offset-4">← 가족 궁합</Link>

          <header className="mt-7 overflow-hidden rounded-[32px] border border-[#e5dac8] bg-[linear-gradient(135deg,#f8f2e7_0%,#fffdf8_58%,#f3eee6_100%)] p-7 shadow-sm sm:p-9">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-stone-900 px-3 py-1.5 text-[11px] font-bold text-white">부모·자녀</span>
              <span className="rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-stone-600 ring-1 ring-stone-200">가족 궁합</span>
            </div>
            <h1 className="mt-6 max-w-3xl text-3xl font-bold tracking-[-0.03em] text-stone-950 sm:text-4xl">가까운 가족일수록, 기대와 거리의 차이를 더 세심하게 봅니다.</h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-stone-600">
              부모와 자녀는 서로를 아끼는 마음이 있어도 보호와 독립, 조언과 선택, 대화의 속도에서 다른 기준을 가질 수 있습니다. 두 사람의 관계를 한쪽의 잘잘못으로 판단하지 않고, 서로에게 미치는 방향을 나누어 살펴봅니다.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
              <span>현재 분석 대상</span>
              <strong className="font-semibold text-stone-900">{activeProfile.label}</strong>
              <Link href="/mypage" className="text-xs underline decoration-stone-300 underline-offset-4">프로필 변경</Link>
            </div>
          </header>

          <section className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[28px] border border-stone-200 bg-stone-950 p-7 text-white">
              <p className="text-[11px] font-bold tracking-[0.15em] text-stone-400">관계를 보는 방식</p>
              <h2 className="mt-3 text-2xl font-bold">부모 → 자녀, 자녀 → 부모를 따로 봅니다.</h2>
              <p className="mt-4 text-sm leading-7 text-stone-300">
                같은 관계라도 부모가 자녀에게 주는 영향과 자녀가 부모에게 주는 영향은 다르게 나타날 수 있습니다. 그래서 하나의 총점으로 합치지 않고 방향별 특징을 따로 설명합니다.
              </p>
              <div className="mt-6 space-y-3 text-sm leading-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">부모의 보호와 기준이 자녀에게 힘이 되는 지점</div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">자녀의 반응과 선택이 부모에게 주는 영향</div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">갈등 뒤 다시 연결되기 쉬운 조건</div>
              </div>
            </div>

            <div className="rounded-[28px] border border-stone-200 bg-white p-7 shadow-sm">
              <p className="text-[11px] font-bold tracking-[0.15em] text-stone-400">분석 범위</p>
              <h2 className="mt-3 text-2xl font-bold text-stone-950">부모·자녀 관계에 맞춘 여섯 가지 영역</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {REPORT_AREAS.map((area, index) => (
                  <article key={area.title} className="rounded-2xl border border-stone-200 bg-[#fcfbf8] p-4">
                    <p className="text-xs font-bold text-stone-400">{String(index + 1).padStart(2, "0")}</p>
                    <h3 className="mt-2 font-bold text-stone-900">{area.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{area.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <FamilyParentChildAnalysisClient myProfileLabel={activeProfile.label} profileId={activeProfile.id} />
        </div>
      </main>
    </AppShell>
  );
}
