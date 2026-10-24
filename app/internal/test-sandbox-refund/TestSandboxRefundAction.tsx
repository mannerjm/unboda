"use client";

import { useEffect, useState } from "react";

type Preflight = { ready?: boolean; amount?: number | null; message?: string; state?: string };
type Result = { status?: string; message?: string; error?: string };
export default function TestSandboxRefundAction() {
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/internal/test-sandbox-refund", { cache: "no-store", credentials: "same-origin" })
      .then(async r => (await r.json()) as Preflight)
      .then(data => { if (alive) setPreflight(data); })
      .catch(() => { if (alive) setPreflight({ ready: false, message: "취소 사전검사에 실패했습니다." }); });
    return () => { alive = false; };
  }, []);

  async function confirmOneTimeCancellation() {
    if (busy || submitted || !preflight?.ready || preflight.amount !== 9900) return;
    if (!window.confirm("토스 TEST 결제 9,900원 한 건을 취소하고 해당 리포트 이용권을 회수합니다. 계속할까요?")) return;
    setSubmitted(true); // never offer a second send, including after an unknown provider result
    setBusy(true);
    try {
      const response = await fetch("/api/internal/test-sandbox-refund", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true, amount: 9900 }),
      });
      const data = await response.json() as Result;
      setResult({ status: data.status, message: data.message, error: data.error });
    } catch {
      setResult({ error: "연결이 중단됐습니다. 결제가 취소됐을 수 있으니 다시 시도하지 마세요." });
    } finally {
      setBusy(false);
    }
  }

  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
    <h2 className="text-lg font-bold text-slate-900">토스 TEST 결제 1건 취소</h2>
    <p className="mt-3 text-sm leading-7 text-slate-700">
      저축과 자산 관리 습관 · 2026년 10월 · 9,900원 TEST 승인만 대상으로 합니다.
      결제 취소가 완료되면 이 구매의 온라인 리포트 열람 권한이 회수됩니다.
      기존 상담·구매 기록은 정책에 따라 별도 보존될 수 있습니다.
    </p>
    <p className="mt-4 text-sm font-semibold text-slate-800" role="status">
      {busy ? "토스 TEST 결제 취소와 이용권 회수 처리 중…" :
        result ? (result.message ?? result.error ?? "최종 상태를 확인해 주세요.") :
        preflight ? preflight.message : "토스 원결제 조회 및 안전검사 중…"}
    </p>
    <button type="button" disabled={!preflight?.ready || preflight.amount !== 9900 || busy || submitted}
      onClick={confirmOneTimeCancellation}
      className="mt-5 rounded-xl bg-indigo-700 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400">
      {submitted ? "취소 요청 완료 · 다시 실행할 수 없음" : "9,900원 TEST 결제 한 건 취소"}
    </button>
    <p className="mt-4 text-xs leading-6 text-rose-700">
      정상 결과 또는 오류가 표시되면 버튼을 다시 누르지 말고 화면 결과를 확인하세요.
      실제 LIVE 결제에는 적용되지 않습니다.
    </p>
  </section>;
}
