export default function ResultPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#f7f3ea] px-6 text-center">
      <p className="text-sm tracking-[0.3em] text-stone-500 mb-4">
        AI 사주 분석 결과
      </p>

      <h1 className="text-4xl font-bold text-stone-900 mb-6">
        당신의 사주 리포트
      </h1>

      <div className="w-full max-w-xl bg-white rounded-3xl p-8 text-left shadow-sm">
        <h2 className="text-2xl font-bold mb-4">기본 성향</h2>

        <p className="text-stone-700 leading-8">
          운보다 AI가 입력하신 생년월일과 태어난 시간을 바탕으로
          사주를 분석하고 있습니다. 앞으로 이곳에 성격, 재물운,
          연애운, 직업운, 올해 운세가 표시됩니다.
        </p>
      </div>
    </main>
  );
}