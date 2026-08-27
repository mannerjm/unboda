"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { getSafeReturnTo } from "@/app/lib/auth";
import { Suspense } from "react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo") ?? undefined, "/account");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const client = createClient();
    const { data } = client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    void client.auth.getSession().then(({ data: sessionData }) => setReady(Boolean(sessionData.session)));
    return () => data.subscription.unsubscribe();
  }, []);

  async function updatePassword() {
    if (password.length < 8) { setMessage("비밀번호는 8자 이상이어야 합니다."); return; }
    if (password !== confirmation) { setMessage("비밀번호가 일치하지 않습니다."); return; }
    setIsLoading(true); setMessage(null);
    const { error } = await createClient().auth.updateUser({ password });
    setIsLoading(false);
    if (error) { setMessage("재설정 링크가 만료되었거나 유효하지 않습니다."); return; }
    await createClient().auth.signOut({ scope: "global" });
    router.replace(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
      <div className="mx-auto w-full max-w-xl">
        <Link href="/auth/login" className="text-sm font-semibold text-stone-600">로그인으로 돌아가기</Link>
        <h1 className="mt-10 text-3xl font-bold">새 비밀번호 설정</h1>
        <p className="mt-4 text-sm leading-7 text-stone-600">새 비밀번호를 입력하면 모든 기기에서 다시 로그인해야 합니다.</p>
        <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          {!ready ? <p className="text-sm leading-6 text-stone-600">재설정 링크를 확인하고 있습니다. 링크를 다시 요청해 주세요.</p> : (
            <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void updatePassword(); }}>
              <label className="block text-sm font-semibold" htmlFor="password">새 비밀번호
                <input id="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-stone-900" required />
              </label>
              <label className="block text-sm font-semibold" htmlFor="confirmation">새 비밀번호 확인
                <input id="confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-stone-900" required />
              </label>
              {message ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}
              <button type="submit" disabled={isLoading} className="w-full rounded-xl bg-stone-900 px-5 py-3 font-semibold text-white disabled:bg-stone-400">{isLoading ? "저장 중..." : "비밀번호 저장"}</button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="p-5">불러오는 중입니다...</main>}><ResetPasswordContent /></Suspense>;
}
