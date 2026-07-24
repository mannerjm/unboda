"use client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getSafeReturnTo,
  saveAuthState,
  type AuthState,
} from "@/app/lib/auth";

import Link from "next/link";
import { Suspense } from "react";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnTo = searchParams.get("returnTo") ?? undefined;
  const safeReturnTo = getSafeReturnTo(returnTo);

  function handleLogin() {
    const authenticatedState: AuthState = {
      status: "authenticated",
      user: {
        id: "demo-user",
        email: "demo@unboda.com",
        name: "운보다 사용자",
        accessLevel: "free_member",
      },
    };

    saveAuthState(authenticatedState);
    router.push(safeReturnTo);
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
      <div className="mx-auto w-full max-w-xl">
        <Link
          href="/result"
          className="text-sm font-semibold text-stone-600 transition hover:text-stone-900"
        >
          ← 이전 화면으로 돌아가기
        </Link>

        <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-stone-500">
          LOGIN
        </p>

        <h1 className="mt-3 text-3xl font-bold">
          운보다에 로그인
        </h1>

        <p className="mt-5 text-sm leading-7 text-stone-600">
          구매한 심층 분석을 보관하고 다시 확인하려면 계정에 로그인해 주세요.
        </p>

        <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
          <form className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="text-sm font-semibold text-stone-900"
              >
                이메일
              </label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="example@email.com"
                className="mt-3 w-full rounded-2xl border border-stone-300 bg-white px-4 py-4 text-sm outline-none transition focus:border-stone-900"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-sm font-semibold text-stone-900"
              >
                비밀번호
              </label>

              <input
                id="password"
                name="password"
                type="password"
                placeholder="비밀번호를 입력해 주세요"
                className="mt-3 w-full rounded-2xl border border-stone-300 bg-white px-4 py-4 text-sm outline-none transition focus:border-stone-900"
              />
            </div>

            <button
              type="button"
              onClick={handleLogin}
              className="w-full rounded-2xl bg-stone-900 px-5 py-4 font-semibold text-white transition hover:bg-stone-800"
            >
              로그인
            </button>
          </form>

          <div className="mt-6 border-t border-stone-200 pt-6 text-center">
            <p className="text-sm text-stone-600">
              아직 계정이 없으신가요?
            </p>

            <Link
               href={`/auth/signup?returnTo=${encodeURIComponent(safeReturnTo)}`}
              className="mt-3 inline-block text-sm font-bold text-stone-900 underline"
            >
              회원가입하기
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7f3ea] p-5 py-14 text-stone-900">
          <div className="mx-auto w-full max-w-xl">
            <p className="text-sm text-stone-600">
              로그인 페이지를 불러오는 중입니다...
            </p>
          </div>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}