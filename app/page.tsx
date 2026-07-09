import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#f7f3ea] text-center px-6">
      <p className="text-sm tracking-[0.3em] text-stone-500 mb-4">
        AI 명리 플랫폼
      </p>

      <h1 className="text-6xl font-bold text-stone-900 mb-6">
        운보다
      </h1>

      <p className="text-2xl text-stone-700 mb-10">
        당신의 운명을, 데이터로 읽다.
      </p>

      <Link
        href="/saju"
        className="rounded-full bg-stone-900 text-white px-8 py-4 text-lg"
      >
        사주 시작하기
      </Link>
    </main>
  );
}