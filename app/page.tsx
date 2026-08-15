import Link from "next/link";
import { getCurrentUser } from "@/app/lib/supabase/auth";

export default async function Home() {
  const user = await getCurrentUser();

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

      {user ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/saju" className="rounded-full bg-stone-900 px-8 py-4 text-lg text-white">
            내 프로필로 사주 조회하기
          </Link>
          <Link href="/mypage" className="rounded-full border border-stone-300 bg-white px-8 py-4 text-lg text-stone-900">
            마이페이지
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <Link href="/guest-saju" className="block rounded-full bg-stone-900 px-8 py-4 text-lg text-white">
            무료 사주 시작하기
          </Link>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/auth/login?returnTo=/" className="rounded-full border border-stone-300 bg-white px-8 py-3 text-stone-900">
              로그인
            </Link>
            <Link href="/auth/signup?returnTo=/" className="rounded-full border border-stone-300 bg-white px-8 py-3 text-stone-900">
              회원가입
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}