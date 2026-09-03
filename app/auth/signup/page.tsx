"use client";
import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSafeReturnTo } from "@/app/lib/auth";
import { getSignupCompletionState } from "@/app/lib/signupPolicy/completion";
import Link from "next/link";
import { Suspense } from "react";

function SignupPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const returnTo = searchParams.get("returnTo") ?? undefined;
  const safeReturnTo = getSafeReturnTo(returnTo, "/saju");
  const origin = searchParams.get("origin");
  const isGuestOrigin = origin === "guest-result" || origin === "guest-result-navigation" || origin === "guest-navigation";
  const initialError = searchParams.get("error") === "policy_incomplete"
    ? "가입 정책 확인이 완료되지 않았습니다. 두 항목을 다시 확인해 주세요."
    : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [isConfirmationSent, setIsConfirmationSent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [age14OrOlderConfirmed, setAge14OrOlderConfirmed] = useState(false);
  const ageRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  async function handleSignup() {
    if (!age14OrOlderConfirmed) {
      setErrorMessage("서비스 이용자가 만 14세 이상임을 확인해 주세요.");
      ageRef.current?.focus();
      return;
    }
    if (!termsAccepted) {
      setErrorMessage("이용약관에 동의해 주세요.");
      termsRef.current?.focus();
      return;
    }
    if (!email || !password) {
      setErrorMessage("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMessage("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, termsAccepted, age14OrOlderConfirmed, returnTo: safeReturnTo }),
    });
    const body = await response.json() as { error?: string; policyComplete?: boolean; emailVerified?: boolean };

    setIsLoading(false);

    if (!response.ok) {
      setErrorMessage(body.error ?? "가입을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    const completionState = getSignupCompletionState({
      policyComplete: body.policyComplete === true,
      emailVerified: body.emailVerified === true,
    });

    if (completionState === "SIGNUP_COMPLETE") {
      router.push(safeReturnTo);
      router.refresh();
      return;
    }

    if (completionState === "POLICY_RECOVERY_REQUIRED") {
      setErrorMessage("이메일 인증은 완료되었지만 가입 확인이 끝나지 않았습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setIsConfirmationSent(true);
  }

  if (isConfirmationSent) {
    return (
      <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
        <div className="mx-auto w-full max-w-xl">
          <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9 text-center">
            <h2 className="text-2xl font-bold text-stone-900">이메일을 확인해 주세요</h2>
            <p className="mt-4 text-sm leading-7 text-stone-600">
              <strong>{email}</strong> 주소로 확인 이메일을 보냈습니다.
              <br />
              이메일의 링크를 클릭하면 로그인이 완료됩니다.
            </p>
            <p className="mt-4 text-xs text-stone-500">
              이메일이 오지 않으면 스팸함을 확인해 주세요.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
      <div className="mx-auto w-full max-w-xl">
        <Link
          href={origin === "guest-result" || origin === "guest-result-navigation" ? "/guest-result" : origin === "guest-navigation" ? "/guest-saju" : "/result"}
          className="text-sm font-semibold text-stone-600 transition hover:text-stone-900"
        >
          ← 이전 화면으로 돌아가기
        </Link>

        <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-stone-500">
          SIGN UP
        </p>

        <h1 className="mt-3 text-3xl font-bold">
          운보다 계정 만들기
        </h1>

        <p className="mt-5 text-sm leading-7 text-stone-600">
          구매한 심층 분석과 저장한 사주 프로필을 안전하게 보관하려면
          계정을 만들어 주세요.
        </p>

        <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void handleSignup(); }}>
            <div>
              <label htmlFor="email" className="text-sm font-semibold text-stone-900">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-3 w-full rounded-2xl border border-stone-300 bg-white px-4 py-4 text-sm outline-none transition focus:border-stone-900"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-semibold text-stone-900">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="8자 이상 입력해 주세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-3 w-full rounded-2xl border border-stone-300 bg-white px-4 py-4 text-sm outline-none transition focus:border-stone-900"
                required
              />
            </div>

            <div>
              <label htmlFor="passwordConfirm" className="text-sm font-semibold text-stone-900">
                비밀번호 확인
              </label>
              <input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                placeholder="비밀번호를 다시 입력해 주세요"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="mt-3 w-full rounded-2xl border border-stone-300 bg-white px-4 py-4 text-sm outline-none transition focus:border-stone-900"
                required
              />
            </div>

            <fieldset className="space-y-4 border-t border-stone-200 pt-6">
              <legend className="text-sm font-semibold text-stone-900">가입 확인</legend>
              <label className="flex items-start gap-3 text-sm leading-6 text-stone-700">
                <input
                  ref={ageRef}
                  type="checkbox"
                  checked={age14OrOlderConfirmed}
                  onChange={(e) => setAge14OrOlderConfirmed(e.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
                />
                <span>저는 만 14세 이상입니다.</span>
              </label>
              <label className="flex items-start gap-3 text-sm leading-6 text-stone-700">
                <input
                  ref={termsRef}
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
                />
                <span><Link href="/terms" className="font-semibold text-stone-900 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900">이용약관</Link>에 동의합니다.</span>
              </label>
            </fieldset>

            {errorMessage && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-stone-900 px-5 py-4 font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60"
            >
              {isLoading ? "가입 중..." : "회원가입"}
            </button>
          </form>

          <div className="mt-6 border-t border-stone-200 pt-6 text-center">
            <p className="text-sm text-stone-600">
              이미 계정이 있으신가요?
            </p>

            <Link
              href={`/auth/login?returnTo=${encodeURIComponent(safeReturnTo)}${isGuestOrigin ? `&origin=${encodeURIComponent(origin)}` : ""}`}
              className="mt-3 inline-block text-sm font-bold text-stone-900 underline"
            >
              로그인하기
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
          <div className="mx-auto w-full max-w-xl">
            <p className="text-sm text-stone-600">불러오는 중입니다...</p>
          </div>
        </main>
      }
    >
      <SignupPageContent />
    </Suspense>
  );
}
