import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";

const FAMILY_ENTRY = "/special-analysis/compatibility/family/parent-child#family-relationship-selector";

export default async function FamilyCompatibilityPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login?returnTo=/special-analysis/compatibility/family");
  }

  const activeProfile = await getActiveProfile(user.id);
  if (!activeProfile) {
    return (
      <AppShell>
        <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-[#11162d] sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-3xl">
            <Link href="/special-analysis/compatibility" className="text-sm font-semibold text-slate-600 underline decoration-[#c4c9d9] underline-offset-4">← 궁합 유형 선택</Link>
            <section className="mt-8 rounded-3xl border border-[#dce1ef] bg-white p-8 text-center">
              <h1 className="text-2xl font-bold text-[#11162d]">가족 궁합</h1>
              <p className="mt-4 text-sm leading-7 text-slate-600">분석할 내 프로필을 먼저 선택해 주세요.</p>
              <Link href="/mypage" className="mt-5 inline-flex rounded-2xl bg-[#171a3d] px-5 py-3 text-sm font-bold text-white">마이페이지에서 프로필 선택</Link>
            </section>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell activeProfileId={activeProfile.id}>
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-[#11162d] sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <Link href="/special-analysis/compatibility" className="text-sm font-semibold text-slate-600 underline decoration-[#c4c9d9] underline-offset-4">← 궁합 유형 선택</Link>
          <header className="relative mt-7 overflow-hidden rounded-[2rem] border border-[#35375f] bg-[radial-gradient(circle_at_18%_22%,rgba(112,88,229,0.22),transparent_24%),radial-gradient(circle_at_82%_78%,rgba(83,180,215,0.14),transparent_24%),linear-gradient(145deg,#0b1025_0%,#151938_55%,#211b46_100%)] px-6 py-8 text-white shadow-[0_22px_60px_rgba(24,29,67,0.14)] sm:px-8 sm:py-10">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#b9b2f6]">전문 분석 · 궁합</p>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">가족 궁합</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">부모·자녀, 형제·자매, 기타 가족 관계를 한 화면에서 선택하고 관계마다 다른 기준으로 분석합니다.</p>
          </header>

          <section className="mt-8 grid gap-4 lg:grid-cols-3">
            {[
              ["부모·자녀", "정서적 연결, 대화, 기대와 독립, 보호와 경계, 회복을 두 방향으로 살펴봅니다."],
              ["형제·자매", "정서적 연결, 대화, 비교와 경쟁, 오래 굳어진 역할과 경계, 회복을 살펴봅니다."],
              ["기타 가족", "조부모·손주, 조카, 사촌, 인척 등 관계별 역할과 기대, 거리와 소통을 살펴봅니다."],
            ].map(([title, description]) => (
              <Link key={title} href={FAMILY_ENTRY} className="group flex min-h-[250px] flex-col rounded-[26px] border border-[#dfe3ef] bg-[linear-gradient(145deg,#f3f1ff_0%,#f9faff_65%,#ffffff_100%)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#a99bea] hover:shadow-md">
                <span className="w-fit rounded-full bg-[#6f5ce7] px-3 py-1.5 text-[11px] font-bold text-white">이용 가능</span>
                <h2 className="mt-5 text-xl font-bold text-[#11162d]">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
                <span className="mt-auto pt-6 text-sm font-bold text-[#11162d]">같은 화면에서 선택하기 →</span>
              </Link>
            ))}
          </section>
        </div>
      </main>
    </AppShell>
  );
}
