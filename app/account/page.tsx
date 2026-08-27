import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { ensureAccountLifecycle } from "@/app/lib/accounts/server";
import { createClient as createServerClient } from "@/app/lib/supabase/server";

const statusLabels = { ACTIVE: "사용 중", DELETION_REQUESTED: "탈퇴 처리 중", CLOSED: "종료됨" } as const;
const eligibilityLabels = { UNVERIFIED: "확인 전", VERIFIED_ADULT: "유료 이용 가능", REVOKED: "확인 만료" } as const;

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?returnTo=/account");
  const account = await ensureAccountLifecycle(user.id);
  const { data } = await (await createServerClient()).auth.getUser();

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-12 text-stone-900 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <Link href="/mypage" className="text-sm font-semibold text-stone-600">마이페이지로 돌아가기</Link>
        <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-stone-500">ACCOUNT</p>
        <h1 className="mt-3 text-3xl font-bold">계정 정보</h1>
        <section className="mt-8 space-y-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div><p className="text-xs font-semibold text-stone-500">로그인 이메일</p><p className="mt-2 break-all text-sm font-semibold">{user.email}</p></div>
          <div className="flex items-center justify-between gap-4 border-t border-stone-100 pt-5"><span className="text-sm text-stone-600">이메일 인증</span><span className="text-sm font-semibold">{data.user?.email_confirmed_at ? "인증됨" : "인증 필요"}</span></div>
          <div className="flex items-center justify-between gap-4 border-t border-stone-100 pt-5"><span className="text-sm text-stone-600">계정 상태</span><span className="text-sm font-semibold">{statusLabels[account.status]}</span></div>
          <div className="flex items-center justify-between gap-4 border-t border-stone-100 pt-5"><span className="text-sm text-stone-600">유료 이용 자격</span><span className="text-sm font-semibold">{eligibilityLabels[account.paidEligibilityStatus]}</span></div>
          <div className="border-t border-stone-100 pt-5"><Link href="/auth/forgot-password?returnTo=/account" className="block w-full rounded-xl border border-stone-300 px-5 py-3 text-center text-sm font-semibold">비밀번호 재설정</Link></div>
        </section>
        <p className="mt-5 text-xs leading-6 text-stone-500">성인 본인확인은 별도 외부 인증 연동 이후 제공됩니다. 프로필의 출생 정보는 계정 자격을 대신하지 않습니다.</p>
      </div>
    </main>
  );
}
