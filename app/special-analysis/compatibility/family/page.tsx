import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";

const FAMILY_RELATIONSHIPS = [
  {
    id: "parent-child",
    title: "부모·자녀",
    description: "기대와 독립, 보호와 간섭, 대화의 거리와 반복되는 갈등·회복 방식을 중심으로 살펴봅니다.",
  },
  {
    id: "siblings",
    title: "형제·자매",
    description: "비교와 경쟁, 역할 차이, 정서적 거리, 오래 쌓인 패턴과 관계 회복의 조건을 중심으로 살펴봅니다.",
  },
  {
    id: "other-family",
    title: "기타 가족",
    description: "가족 안에서의 역할과 기대, 거리 조절, 소통과 반복 갈등을 관계 특성에 맞춰 살펴보는 범위입니다.",
  },
] as const;

export default async function FamilyCompatibilityPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login?returnTo=/special-analysis/compatibility/family");
  }

  const activeProfile = await getActiveProfile(user.id);
  if (!activeProfile) {
    return (
      <AppShell>
        <main className="min-h-screen bg-[#fbfbfa] px-5 py-8 text-stone-900 sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-3xl">
            <Link href="/special-analysis/compatibility" className="text-sm font-semibold text-stone-600 underline decoration-stone-300 underline-offset-4">← 궁합 유형 선택</Link>
            <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-8 text-center">
              <h1 className="text-2xl font-bold text-stone-950">가족 궁합</h1>
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
          <Link href="/special-analysis/compatibility" className="text-sm font-semibold text-stone-600 underline decoration-stone-300 underline-offset-4">← 궁합 유형 선택</Link>

          <header className="mt-7 border-b border-stone-200 pb-7">
            <p className="text-xs font-semibold tracking-[0.16em] text-stone-400">전문 분석 · 궁합</p>
            <h1 className="mt-2 text-3xl font-bold text-stone-950 sm:text-4xl">가족 궁합</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
              가족은 관계마다 기대와 역할이 다르기 때문에 먼저 어떤 가족 관계인지 구분해 분석 기준을 나눕니다.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
              <span>현재 분석 대상</span>
              <strong className="font-semibold text-stone-900">{activeProfile.label}</strong>
              <Link href="/mypage" className="text-xs underline decoration-stone-300 underline-offset-4">프로필 변경</Link>
            </div>
          </header>

          <section className="mt-8">
            <div className="rounded-3xl border border-[#e5dac8] bg-[#faf6ee] px-5 py-4 text-sm leading-7 text-stone-600 sm:px-6">
              가족 궁합은 현재 관계별 분석 기준을 분리해 설계하는 단계입니다. 아직 결제나 분석 생성은 연결하지 않았습니다.
            </div>

            <h2 className="mt-8 text-xl font-bold text-stone-950">어떤 가족 관계인가요?</h2>
            <p className="mt-2 text-sm leading-7 text-stone-500">관계 유형에 따라 결과에서 중요하게 보는 항목을 다르게 구성합니다.</p>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {FAMILY_RELATIONSHIPS.map((relationship) => (
                <article key={relationship.id} className="rounded-[26px] border border-stone-200 bg-white p-6 shadow-sm">
                  <p className="text-[11px] font-bold tracking-[0.14em] text-stone-400">가족 관계</p>
                  <h3 className="mt-3 text-xl font-bold text-stone-950">{relationship.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-stone-600">{relationship.description}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
