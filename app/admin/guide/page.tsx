import Link from "next/link";
import { redirect } from "next/navigation";
import { OperatorAuthorizationError, requireOperator } from "@/app/lib/operators/server";

export const dynamic = "force-dynamic";

const cases = [
  {
    title: "결제 확인 필요",
    when: "결제사 상태와 내부 주문 상태가 아직 완전히 맞지 않을 때",
    do: "운영 확인 필요에서 해당 건을 열고 ‘연결 주문 상세 확인’을 누릅니다. 재시도 예정이면 기다리고, terminal mismatch 또는 재시도 시각이 없는 최종 실패면 Toss 관리자 기록의 주문번호·금액·통화·결제 상태를 대조한 뒤 개발 검토로 넘깁니다.",
    why: "결제 데이터를 사람이 임의로 paid 처리하면 이중 제공이나 환불 오류가 생길 수 있습니다.",
  },
  {
    title: "환불 재시도",
    when: "환불 요청은 유효하지만 결제사 또는 네트워크 오류로 자동 취소가 끝나지 않았을 때",
    do: "연결 주문 상세에서 다음 재시도 시각과 실패 코드를 확인한 뒤 자동 재시도를 기다립니다. 고객에게는 처리 중이라고 안내합니다.",
    why: "동일 주문에 수동 취소를 겹쳐 실행하면 중복 취소나 내부 상태 불일치가 생길 수 있습니다.",
  },
  {
    title: "환불 수동 확인",
    when: "자동 재시도 한도를 넘었거나 결제사 응답과 내부 기록이 모순되어 시스템이 OWNER_REVIEW_REQUIRED로 멈춘 때",
    do: "연결 주문 상세에서 금액, 결제 상태, 환불 상태, 실패 코드를 확인하고 Toss 관리자 기록과 대조합니다. 결제사 취소 여부가 명확하지 않거나 내부 기록과 다르면 증거를 보존한 채 개발 검토로 넘깁니다. DB 값을 직접 변경하거나 환불 완료로 표시하지 않습니다.",
    why: "금전 상태가 모호한 예외는 자동 처리보다 보수적으로 멈추는 것이 안전합니다.",
  },
  {
    title: "분석 생성 실패",
    when: "결제와 이용권은 정상인데 유료 리포트 생성이 failed로 끝난 때",
    do: "연결 주문 상세에서 결제 완료·분석 회차·활성 이용권·리포트 상태를 확인합니다. 결제와 이용권이 정상이라면 고객에게 동일 구매의 유료 분석 화면을 다시 열도록 안내할 수 있습니다. 기존 failed 리포트는 같은 구매 단위에서 재시도되며, 반복 실패하면 개발 검토로 넘깁니다.",
    why: "구매 단위와 분석 회차를 유지해야 중복 리포트와 잘못된 결과 연결을 막을 수 있습니다.",
  },
  {
    title: "분석 생성 지연",
    when: "유료 리포트가 기존 지연 임계값보다 오래 generating 상태에 머문 때",
    do: "연결 주문 상세에서 리포트가 아직 generating인지 확인합니다. 결제와 이용권이 정상인데 계속 지연 중이면 고객의 동일 분석 화면 재진입으로 stale 작업을 기존 구매 단위에서 재시도할 수 있습니다. 계속 수렴하지 않으면 개발 검토로 넘깁니다.",
    why: "진행 중 작업을 별도 리포트로 새로 만들지 않아야 동일 구매에 여러 생성 작업이 겹치지 않습니다.",
  },
  {
    title: "계정 종료 재시도",
    when: "탈퇴 요청은 접수됐지만 일시 오류 또는 금전 처리 대기 때문에 최종 정리가 끝나지 않은 때",
    do: "운영 확인 필요에서 해당 건의 ‘연결 계정 상세 확인’을 누르고 다음 재시도 시각을 확인한 뒤 자동 처리를 기다립니다. 결제·환불 상태가 남아 있으면 먼저 그것이 수렴해야 합니다.",
    why: "미해결 금전 기록이 있는 계정을 먼저 삭제하면 환불과 거래 증빙이 깨질 수 있습니다.",
  },
  {
    title: "계정 종료 수동 확인",
    when: "재시도 한도를 넘었거나 안전하게 자동 종료할 수 없는 모순이 발견된 때",
    do: "연결 계정 상세에서 계정 상태와 안전한 실패 코드를 확인하고, 관련 결제·환불 수동 확인 항목이 남아 있는지 먼저 봅니다. 금전 예외가 없는데도 계속 막히면 개발 검토로 넘깁니다. Production에서 사용자를 직접 삭제하지 않습니다.",
    why: "탈퇴는 결제·환불·법적 보존 데이터와 연결되어 있어 순서를 지켜야 합니다.",
  },
  {
    title: "AI 질문권 무결성",
    when: "답변과 질문권 차감 기록이 맞지 않거나 만료 예약이 남아 있을 때",
    do: "AI 상담 운영 화면에서 차감됐지만 답변 없음, 답변 있지만 미차감, 원장 불일치, 만료 예약 건수를 확인합니다. 0이 아니면 우선 운영 이상으로 취급하고 원장 값을 직접 수정하지 않은 채 개발 검토로 넘깁니다.",
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

        <section className="mt-6 border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">대표가 예외를 판단하는 순서</h2>
          <ol className="mt-3 space-y-2 text-sm leading-7 text-stone-700">
            <li><strong>1.</strong> `/admin`의 운영 확인 필요에서 해당 분류를 엽니다. 화면에 ‘자동 대기 / 대표 확인 / 상태에 따라 판단’이 바로 표시됩니다.</li>
            <li><strong>2.</strong> 각 건의 ‘연결 주문 상세 확인’ 또는 ‘연결 계정 상세 확인’을 눌러 관련 상태를 한 화면에서 확인합니다. 리포트 실패도 구매와 연결된 원래 주문으로 이어집니다.</li>
            <li><strong>3.</strong> 자동 재시도 시각이 있으면 기다립니다. 대표 확인 상태라면 화면에 적힌 최소 증거만 확인합니다.</li>
            <li><strong>4.</strong> 결제·환불처럼 외부 결제사 확인이 필요한 경우에만 Toss 관리자 기록을 대조합니다. 내부 DB 값을 맞추기 위해 직접 수정하지 않습니다.</li>
            <li><strong>5.</strong> 화면 지침으로 결론이 나지 않거나 외부·내부 기록이 모순되면 그때만 개발 검토로 넘깁니다.</li>
          </ol>
        </section>

        <section className="mt-6 border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">대표 예외 이메일 알림은 이렇게 동작합니다</h2>
          <p className="mt-3 text-sm leading-7 text-stone-700">
            자동 재시도 중인 정상 복구 건에는 이메일을 보내지 않습니다. 결제 상태가 최종 불일치로 멈춤, 환불 수동 확인, 유료 분석 생성 실패, 계정 종료 수동 확인, AI 질문권 무결성 이상처럼 대표 판단이 필요한 경우에만 활성 운영자 계정 이메일로 알립니다. 이메일에는 고객 이메일·주문 ID·사주·상담 내용 같은 식별 정보를 넣지 않고 건수만 전달합니다.
          </p>
          <p className="mt-3 text-sm leading-7 text-stone-700">
            이메일은 승인 버튼이 아니라 “관리자 화면을 확인하라”는 신호입니다. 메일을 받은 뒤 <Link href="/admin" className="font-semibold underline underline-offset-4">운영 대시보드</Link>에서 해당 분류를 열어 실제 상태를 확인합니다.
          </p>
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
