import Link from "next/link";

export default function SignupPage() {
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
          <form className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="text-sm font-semibold text-stone-900"
              >
                이름
              </label>

              <input
                id="name"
                name="name"
                type="text"
                placeholder="이름을 입력해 주세요"
                className="mt-3 w-full rounded-2xl border border-stone-300 bg-white px-4 py-4 text-sm outline-none transition focus:border-stone-900"
              />
            </div>

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

            <div>
              <label
                htmlFor="passwordConfirm"
                className="text-sm font-semibold text-stone-900"
              >
                비밀번호 확인
              </label>

              <input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                placeholder="비밀번호를 다시 입력해 주세요"
                className="mt-3 w-full rounded-2xl border border-stone-300 bg-white px-4 py-4 text-sm outline-none transition focus:border-stone-900"
              />
            </div>

            <button
              type="button"
              className="w-full rounded-2xl bg-stone-900 px-5 py-4 font-semibold text-white transition hover:bg-stone-800"
            >
              회원가입
            </button>
          </form>

          <div className="mt-6 border-t border-stone-200 pt-6 text-center">
            <p className="text-sm text-stone-600">
              이미 계정이 있으신가요?
            </p>

            <Link
              href="/auth/login"
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