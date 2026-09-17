"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSafeReturnTo } from "@/app/lib/auth";
import { createClient } from "@/app/lib/supabase/client";
import { AUTH_CAPTCHA_ENABLED, AuthCaptcha } from "@/app/auth/AuthCaptcha";
import Link from "next/link";
import { Suspense } from "react";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnTo = searchParams.get("returnTo") ?? undefined;
  const safeReturnTo = getSafeReturnTo(returnTo);
  const origin = searchParams.get("origin");
  const isGuestResultOrigin = searchParams.get("origin") === "guest-result";
  const isGuestNavigationOrigin = searchParams.get("origin") === "guest-navigation";
  const isGuestResultNavigationOrigin = searchParams.get("origin") === "guest-result-navigation";
  const isGuestRecommendationContinuation = safeReturnTo === "/recommendations"
    && (isGuestResultOrigin || isGuestResultNavigationOrigin);
  const postLoginReturnTo = isGuestRecommendationContinuation
    ? "/auth/complete-guest-analysis?next=recommendations"
    : safeReturnTo;
  // Back link is a distinct navigation target from the post-login redirect: it must never dead-end on /result.
  const backHref = isGuestResultOrigin || isGuestResultNavigationOrigin ? "/guest-result" : isGuestNavigationOrigin ? "/guest-saju" : getSafeReturnTo(returnTo, "/");
  const guestContextCopy = safeReturnTo === "/recommendations"
    ? "추천 심층 분석을 확인하려면 로그인해 주세요."
    : safeReturnTo === "/interests"
      ? "관심 분석을 저장하고 관리하려면 로그인해 주세요."
      : safeReturnTo === "/purchased-analyses"
        ? "구매한 분석을 확인하려면 로그인해 주세요."
        : "마이페이지를 이용하려면 로그인해 주세요.";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    urlError === "auth_failed" ? "인증에 실패했습니다. 다시 시도해 주세요." : null,
  );

  async function handleLogin() {
    if (!email || !password) {
      setErrorMessage("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    if (AUTH_CAPTCHA_ENABLED && !captchaToken) {
      setErrorMessage("보안 확인을 완료해 주세요.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const supabase = createClient();
    const credentials = AUTH_CAPTCHA_ENABLED
      ? { email, password, options: { captchaToken: captchaToken ?? undefined } }
      : { email, password };
    const { error } = await supabase.auth.signInWithPassword(credentials);

    setIsLoading(false);
    if (AUTH_CAPTCHA_ENABLED) {
      setCaptchaToken(null);
      setCaptchaResetSignal((value) => value + 1);
    }

    if (error) {
      setErrorMessage(/captcha/i.test(error.message)
        ? "보안 확인에 실패했습니다. 다시 확인해 주세요."
        : error.message === "Invalid login credentials"
          ? "이메일 또는 비밀번호가 올바르지 않습니다."
          : error.message);
      return;
    }

    router.push(postLoginReturnTo);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f5f7fc] px-5 py-14 text-[#11162d]">
      <div className="mx-auto w-full max-w-xl">
        <Link
          href={backHref}
          className="text-sm font-semibold text-[#626b85] transition hover:text-[#11162d]"
        >
          ← 이전 화면으로 돌아가기
        </Link>

        <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-[#7b8299]">
          LOGIN
        </p>

        <h1 className="mt-3 text-3xl font-bold">
          운보다에 로그인
        </h1>

        <p className="mt-5 text-sm leading-7 text-[#626b85]">
          {isGuestResultOrigin || isGuestResultNavigationOrigin || isGuestNavigationOrigin
            ? guestContextCopy
            : "구매한 심층 분석을 보관하고 다시 확인하려면 계정에 로그인해 주세요."}
        </p>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-[#dfe3ef] bg-white shadow-[0_20px_55px_rgba(32,38,72,0.08)]"><div className="bg-[linear-gradient(135deg,#0a1128,#15183a_58%,#241b43)] px-7 py-6 text-white"><p className="text-xs font-black tracking-[0.14em] text-[#aa9cff]">운보다 계정</p><p className="mt-2 text-sm leading-6 text-[#b7bdd1]">분석과 구매 기록을 안전하게 이어서 관리해요.</p></div><div className="p-7 sm:p-9">
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void handleLogin(); }}>
            <div>
              <label
                htmlFor="email"
                className="text-sm font-semibold text-[#11162d]"
              >
                이메일
              </label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-3 w-full rounded-2xl border border-[#d7dcea] bg-white px-4 py-4 text-sm outline-none transition focus:border-[#745fe7] focus:ring-4 focus:ring-[#745fe7]/10"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-sm font-semibold text-[#11162d]"
              >
                비밀번호
              </label>

              <input
                id="password"
                name="password"
                type="password"
                placeholder="비밀번호를 입력해 주세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-3 w-full rounded-2xl border border-[#d7dcea] bg-white px-4 py-4 text-sm outline-none transition focus:border-[#745fe7] focus:ring-4 focus:ring-[#745fe7]/10"
                required
              />
            </div>

            <AuthCaptcha onToken={setCaptchaToken} resetSignal={captchaResetSignal} />

            {errorMessage && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || (AUTH_CAPTCHA_ENABLED && !captchaToken)}
              className="w-full rounded-2xl bg-[linear-gradient(135deg,#6f5ce7,#8d68ef)] px-5 py-4 font-black text-white shadow-[0_12px_28px_rgba(111,92,231,0.20)] transition hover:brightness-105 disabled:opacity-50"
            >
              {isLoading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <Link
            href={`/auth/forgot-password?returnTo=${encodeURIComponent(postLoginReturnTo)}`}
            className="mt-4 block text-center text-sm font-semibold text-[#626b85] underline"
          >
            비밀번호를 잊으셨나요?
          </Link>

          <div className="mt-6 border-t border-[#dfe3ef] pt-6 text-center">
            <p className="text-sm text-[#626b85]">
              아직 계정이 없으신가요?
            </p>

            <Link
              href={`/auth/signup?returnTo=${encodeURIComponent(safeReturnTo)}${origin ? `&origin=${encodeURIComponent(origin)}` : ""}`}
              className="mt-3 inline-block text-sm font-bold text-[#11162d] underline"
            >
              회원가입하기
            </Link>
          </div>
        </div></section>
      </div>
    </main>
  );
}
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f5f7fc] p-5 py-14 text-[#11162d]">
          <div className="mx-auto w-full max-w-xl">
            <p className="text-sm text-[#626b85]">
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
