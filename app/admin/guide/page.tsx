import Link from "next/link";
import { redirect } from "next/navigation";
import { OperatorAuthorizationError, requireOperator } from "@/app/lib/operators/server";

export const dynamic = "force-dynamic";

const cases = [
  {
    title: "결제 확인 필요",
    when: "결제사 상태와 내부 주문 상태가 아직 완전히 맞지 않을 때",
    do: "주문 ID로 조회해 결제 상태·정산 상태·실패 코드를 확인합니다. 재시도 예정이면 기다리고, terminal mismatch처럼 금액·통화·주문 참조가 어긋난 경우에는 임의 수정하지 않습니다.",
    why: "결제 데이터를 사람이 임의로 paid 처리하면 이중 제공이나 환불 오류가 생길 수 있습니다.",
  },
  {
    title: "환불 재시도",
    when: "환불 요청은 유효하지만 결제사 또는 네트워크 오류로 자동 취소가 끝나지 않았을 때",
    do: "다음 재시도 시각과 실패 코드를 확인한 뒤 자동 재시도를 기다립니다. 고객에게는 처리 중이라고 안내합니다.",
    why: "동일 주문에 수동 취소를 겹쳐 실행하면 중복 취소나 내부 상태 불일치가 생길 수 있습니다.",
  },
  {
    title: "환불 수동 확인",
    when: "자동 재시도 한도를 넘었거나 결제사 응답과 내부 기록이 모순되어 시스템이 OWNER_REVIEW_REQUIRED로 멈춘 때",
    do: "주문 조회에서 금액, 결제 상태, 환불 상태, 실패 코드를 확인하고 증거를 보존합니다. 현재 콘솔은 조회 전용이므로 DB 값을 직접 변경하거나 환불 완료로 표시하지 않습니다.",
    why: "금전 상태가 모호한 예외는 자동 처리보다 보수적으로 멈추는 것이 안전합니다.",
  },
  {
    title: "분석 생성 실패",
    when: "결제와 이용권은 정상인데 유료 리포트 생성이 failed로 끝난 때",
    do: "정확한 주문·상품·분석 회차와 안전한 오류 코드만 확인합니다. 리포트를 수동 생성하거나 이용권을 새로 만들지 않습니다.",
    why: "구매 단위와 분석 회차를 유지해야 중복 리포트와 잘못된 결과 연결을 막을 수 있습니다.",
  },
  {
    title: "분석 생성 지연",
    when: "유료 리포트가 기존 지연 임계값보다 오래 generating 상태에 머문 때",
    do: "주문·이용권·리포트 상태를 확인하고 잠시 기다립니다. 계속 수렴하지 않으면 분석 생성 장애로 분류합니다.",
    why: "진행 중 작업을 중복 실행하면 동일 구매에 여러 생성 작업이 겹칠 수 있습니다.",
  },
  {
    title: "계정 종료 재시도",
    when: "탈퇴 요청은 접수됐지만 일시 오류 또는 금전 처리 대기 때문에 최종 정리가 끝나지 않은 때",
    do: "다음 재시도 시각을 확인하고 자동 처리를 기다립니다. 결제·환불 상태가 남아 있으면 먼저 그것이 수렴해야 합니다.",
    why: "미해결 금전 기록이 있는 계정을 먼저 삭제하면 환불과 거래 증빙이 깨질 수 있습니다.",
  },
  {
    title: "계정 종료 수동 확인",
    when: "재시도 한도를 넘었거나 안전하게 자동 종료할 수 없는 모순이 발견된 때",
    do: "계정 상태와 안전한 실패 코드만 확인합니다. Production에서 사용자를 직접 삭제하거나 관련 데이터를 SQL로 지우지 않습니다.",
    why: "탈퇴는 결제·환불·법적 보존 데이터와 연결되어 있어 순서를 지켜야 합니다.",
  },
  {
    title: "AI 질문권 무결성",
    when: "답변과 질문권 차감 기록이 맞지 않거나 만료 예약이 남아 있을 때",
    do: "AI 상담 운영 화면에서 차감됐지만 답변 없음, 답변 있지만 미차감, 원장 불일치, 만료 예약 건수를 확인합니다. 0이 아니면 우선 운영 이상으로 취급합니다.",
    why: "질문권은 금전 가치가 있는 공용 지갑이므로 답변과 차감이 정확히 1:1로 맞아야 합니다.",
  },
] as const;

export default async function AdminGuidePage() {
  try {
    await requireOperator();
  } catch (error) {
    if (error instanceof OperatorAuthorizationError && error.code === "UNAUTHENTICATED") {
      redirect("/auth/login?returnTo=/admin/guide");
    }
    return (
      <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
        <div className="mx-auto w-full max-w-xl">
          <h1 className="text-3xl font-bold">접근 권한 없음</h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">승인된 운영자만 운영 가이드를 볼 수 있습니다.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-10 text-stone-900 sm:px-8 sm:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <Link href="/admin" className="text-sm font-semibold text-stone-600 underline underline-offset-4">← 운영 대시보드</Link>
        <header className="mt-6 border-b border-stone-200 pb-6">
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">OWNER RUNBOOK</p>
          <h1 className="mt-3 text-3xl font-bold">대표 운영 가이드</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
            운보다의 기본 원칙은 정상 흐름은 자동 처리하고, 모호한 금전·계정·질문권 상태에서만 멈추는 것입니다. 숫자가 0이면 조치하지 않습니다.
          </p>
        </header>

        <section className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-700">정상</p><p className="mt-2 font-bold">아무것도 하지 않기</p><p className="mt-2 text-xs leading-5 text-emerald-800">시스템이 완료한 정상 거래나 상담을 사람이 다시 만지지 않습니다.</p></div>
          <div className="border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-700">자동 복구/대기</p><p className="mt-2 font-bold">상태와 다음 시각만 확인</p><p className="mt-2 text-xs leading-5 text-amber-800">재시도 중인 건은 중복 수동 처리를 하지 않습니다.</p></div>
          <div className="border border-red-200 bg-red-50 p-4"><p className="text-xs font-semibold text-red-700">대표 확인 필요</p><p className="mt-2 font-bold">증거 확인 후 보수적으로 판단</p><p className="mt-2 text-xs leading-5 text-red-800">금전·계정·질문권 모순은 임의 DB 수정 없이 원인을 확인합니다.</p></div>
        </section>

        <section className="mt-8 space-y-4">
          {cases.map((item) => (
            <article key={item.title} className="border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">{item.title}</h2>
              <dl className="mt-4 grid gap-3 text-sm leading-6 md:grid-cols-3">
                <div><dt className="text-xs font-semibold text-stone-500">언제</dt><dd className="mt-1 text-stone-800">{item.when}</dd></div>
                <div><dt className="text-xs font-semibold text-stone-500">무엇을 어떻게</dt><dd className="mt-1 text-stone-800">{item.do}</dd></div>
                <div><dt className="text-xs font-semibold text-stone-500">왜</dt><dd className="mt-1 text-stone-800">{item.why}</dd></div>
              </dl>
            </article>
          ))}
        </section>

        <section className="mt-8 border-y border-stone-200 py-6">
          <h2 className="text-xl font-bold">절대 하지 않는 것</h2>
          <p className="mt-3 text-sm leading-7 text-stone-700">
            Production DB에서 주문을 paid로 바꾸기, 이용권을 임의 생성·회수하기, 환불을 완료 상태로 직접 바꾸기, 유료 리포트를 강제로 생성하기, AI 질문권 원장을 임의 수정하기, 계정을 직접 삭제하기, 결제사 콜백을 흉내 내기, 비밀키를 브라우저나 채팅에 노출하기는 운영 절차로 사용하지 않습니다.
          </p>
        </section>
      </div>
    </main>
  );
}
