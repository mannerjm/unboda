import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";

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
              가족은 관계마다 기대와 역할이 다르기 때문에 먼저 어떤 가족 관계인지 구분해 살펴봅니다.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
              <span>현재 분석 대상</span>
              <strong className="font-semibold text-stone-900">{activeProfile.label}</strong>
              <Link href="/mypage" className="text-xs underline decoration-stone-300 underline-offset-4">프로필 변경</Link>
            </div>
          </header>

          <section className="mt-8">
            <h2 className="text-xl font-bold text-stone-950">어떤 가족 관계인가요?</h2>
            <p className="mt-2 text-sm leading-7 text-stone-500">관계 유형에 따라 중요하게 보는 항목을 다르게 구성합니다.</p>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <Link
                href="/special-analysis/compatibility/family/parent-child"
                className="group flex min-h-[280px] flex-col rounded-[26px] border border-[#dfd3c1] bg-[linear-gradient(145deg,#fbf6ed_0%,#fffdf9_65%,#ffffff_100%)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#cdbb9f] hover:shadow-md"
              >
                <span className="w-fit rounded-full bg-stone-900 px-3 py-1.5 text-[11px] font-bold text-white">첫 번째 가족 유형</span>
                <h3 className="mt-5 text-xl font-bold text-stone-950">부모·자녀</h3>
                <p className="mt-3 text-sm leading-7 text-stone-600">
                  정서적 연결, 대화 방식, 기대와 독립, 보호와 경계, 갈등 뒤 회복을 부모와 자녀의 방향을 나누어 살펴봅니다.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-stone-600">
                  <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-stone-200">정서적 연결</span>
                  <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-stone-200">기대·독립</span>
                  <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-stone-200">보호·경계</span>
                </div>
                <span className="mt-auto pt-6 text-sm font-bold text-stone-900">부모·자녀 궁합 살펴보기 →</span>
              </Link>

              <article className="flex min-h-[280px] flex-col rounded-[26px] border border-stone-200 bg-white p-6 shadow-sm">
                <span className="w-fit rounded-full bg-stone-100 px-3 py-1.5 text-[11px] font-bold text-stone-600">준비 중</span>
                <h3 className="mt-5 text-xl font-bold text-stone-950">형제·자매</h3>
                <p className="mt-3 text-sm leading-7 text-stone-600">
                  비교와 경쟁, 역할 차이, 정서적 거리, 오래 쌓인 패턴과 관계 회복의 조건을 중심으로 살펴볼 예정입니다.
                </p>
              </article>

              <article className="flex min-h-[280px] flex-col rounded-[26px] border border-stone-200 bg-white p-6 shadow-sm">
                <span className="w-fit rounded-full bg-stone-100 px-3 py-1.5 text-[11px] font-bold text-stone-600">준비 중</span>
                <h3 className="mt-5 text-xl font-bold text-stone-950">기타 가족</h3>
                <p className="mt-3 text-sm leading-7 text-stone-600">
                  가족 안에서의 역할과 기대, 거리 조절, 소통과 반복 갈등을 관계 특성에 맞춰 살펴볼 예정입니다.
                </p>
              </article>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
