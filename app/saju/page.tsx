import Link from "next/link";

export default function SajuPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#f7f3ea] px-6">
      <h1 className="text-5xl font-bold mb-8">
        사주 정보 입력
      </h1>

      <div className="w-full max-w-md space-y-5">
        <input
          type="date"
          className="w-full border rounded-xl p-4"
        />

        <input
          type="time"
          className="w-full border rounded-xl p-4"
        />

        <select className="w-full border rounded-xl p-4">
          <option>남성</option>
          <option>여성</option>
        </select>

        <Link
          href="/loading"
          className="block w-full bg-black text-white rounded-xl p-4 text-center"
        >
          AI 사주 분석하기
        </Link>
      </div>
    </main>
  );
}