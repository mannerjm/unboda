"use client";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { getSafeReturnTo } from "@/app/lib/auth";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo") ?? undefined, "/account");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function requestReset() {
    if (!email.trim()) { setMessage("이메일을 입력해 주세요."); return; }
    setIsLoading(true);
    setMessage(null);
    await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password?returnTo=${encodeURIComponent(returnTo)}`,
    });
    setIsLoading(false);
    setMessage("입력한 이메일 주소가 맞다면 비밀번호 재설정 안내를 보냈습니다.");
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
      <div className="mx-auto w-full max-w-xl">
        <Link href="/auth/login" className="text-sm font-semibold text-stone-600">로그인으로 돌아가기</Link>
        <h1 className="mt-10 text-3xl font-bold">비밀번호 재설정</h1>
        <p className="mt-4 text-sm leading-7 text-stone-600">가입할 때 사용한 이메일을 입력해 주세요.</p>
        <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void requestReset(); }}>
            <label className="block text-sm font-semibold" htmlFor="email">이메일
              <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-stone-900" required />
            </label>
            {message ? <p className="rounded-xl bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-600">{message}</p> : null}
            <button type="submit" disabled={isLoading} className="w-full rounded-xl bg-stone-900 px-5 py-3 font-semibold text-white disabled:bg-stone-400">{isLoading ? "보내는 중..." : "재설정 이메일 보내기"}</button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return <Suspense fallback={<main className="p-5">불러오는 중입니다...</main>}><ForgotPasswordContent /></Suspense>;
}
