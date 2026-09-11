import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] px-6 text-stone-900">
      <section className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">404</p>
        <h1 className="mt-3 text-2xl font-bold">페이지를 찾을 수 없습니다.</h1>
        <p className="mt-4 text-sm leading-7 text-stone-600">
          주소가 잘못되었거나 더 이상 제공되지 않는 페이지입니다.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            홈으로 이동
          </Link>
          <Link
            href="/deep-analysis"
            className="rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-50"
          >
            심층 분석 보기
          </Link>
        </div>
      </section>
    </main>
  );
}
