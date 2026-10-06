import Link from "next/link";
import AppShell from "@/app/components/AppShell";

export default function TrustPage() {
  const principles = [
    {
      title: "구매한 분석을 기준으로 AI 상담",
      body: "AI 상담은 계정이 실제로 보유한 완료 리포트를 확인한 뒤 그 범위 안에서 답변합니다. 구매하지 않은 다른 유료 분석의 독자적인 결론을 임의로 대신하지 않습니다.",
    },
    {
      title: "내가 허용한 내용만 장기 기억",
      body: "상담 전체를 자동으로 장기 저장하지 않습니다. 내가 직접 ‘기억하기’를 선택한 상황과 목표만 다음 상담에 참고하며, 저장한 내용은 수정하거나 삭제할 수 있습니다.",
    },
    {
      title: "프로필과 구매 당시 기준을 섞지 않음",
      body: "프로필별 분석과 상담을 분리하고, 출생정보가 바뀐 뒤의 새 분석과 이전 구매 리포트를 같은 근거처럼 섞지 않습니다.",
    },
    {
      title: "완료된 구매 리포트는 다시 열람",
      body: "구매한 상품·프로필·에디션 연결을 보존하고, 완료된 리포트는 구매한 분석에서 다시 확인할 수 있습니다.",
    },
    {
      title: "정상 답변 완료 기준으로 질문권 차감",
      body: "AI 상담에서 범위를 벗어난 질문, 안전상 답변할 수 없는 질문, 답변 생성 실패에는 질문권을 차감하지 않습니다.",
    },
    {
      title: "구매 인증 후기만 표시",
      body: "후기는 완료된 유료 리포트의 실제 구매 기록이 서버에서 확인된 계정만 작성할 수 있습니다. 운영자는 개인정보·스팸·욕설 등 공개 적합성만 검수하고, 부정적인 평가라는 이유만으로 숨기지 않습니다.",
    },
  ];

  return (
    <AppShell>
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-10 text-[#11162d] sm:px-8 sm:py-14">
        <div className="mx-auto w-full max-w-4xl">
          <header className="rounded-[2rem] border border-[#d8d3ff] bg-[radial-gradient(circle_at_84%_18%,rgba(113,89,233,0.14),transparent_28%),linear-gradient(145deg,#ffffff_0%,#f5f3ff_100%)] p-6 shadow-sm sm:p-8">
            <p className="text-xs font-black tracking-[0.16em] text-[#6f5ce7]">TRUST & TRANSPARENCY</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-4xl">운보다가 지키는 이용 원칙</h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-slate-700">
              과장된 적중률이나 검증되지 않은 숫자보다, 실제 서비스가 어떻게 동작하는지 투명하게 안내합니다.
              아래 원칙은 현재 운보다의 결제·리포트·AI 상담·기억 시스템이 실제로 지키는 기준입니다.
            </p>
          </header>

          <section className="mt-5 grid gap-4 sm:grid-cols-2">
            {principles.map((item) => (
              <article key={item.title} className="rounded-[1.5rem] border border-[#dce1ef] bg-white p-5 shadow-sm">
                <h2 className="text-base font-black">{item.title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-650">{item.body}</p>
              </article>
            ))}
          </section>

          <section className="mt-5 rounded-[1.5rem] border border-[#dce1ef] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-black">정책과 지원</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">구체적인 법적 기준과 개인정보 처리, 환불·취소 기준은 아래 공식 문서를 따릅니다.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/privacy" className="rounded-xl border border-[#dce1ef] bg-[#f7f8fc] px-4 py-2.5 text-sm font-bold text-slate-700">개인정보처리방침</Link>
              <Link href="/terms" className="rounded-xl border border-[#dce1ef] bg-[#f7f8fc] px-4 py-2.5 text-sm font-bold text-slate-700">이용약관</Link>
              <Link href="/refund" className="rounded-xl border border-[#dce1ef] bg-[#f7f8fc] px-4 py-2.5 text-sm font-bold text-slate-700">환불·취소 정책</Link>
              <Link href="/support" className="rounded-xl border border-[#d8d3ff] bg-[#f3f1ff] px-4 py-2.5 text-sm font-bold text-[#5e4bd1]">고객지원</Link>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
