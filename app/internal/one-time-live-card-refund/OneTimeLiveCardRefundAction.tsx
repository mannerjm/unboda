"use client";

import { useEffect, useState } from "react";

type Preflight = { ready?: boolean; amount?: number | null; message?: string; state?: string };
type Result = { status?: string; message?: string; error?: string };

export default function OneTimeLiveCardRefundAction() {
  const [check, setCheck] = useState<Preflight | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/internal/one-time-live-card-refund", { cache: "no-store", credentials: "same-origin" })
      .then(async response => (await response.json()) as Preflight)
      .then(data => { if (active) setCheck(data); })
      .catch(() => { if (active) setCheck({ ready: false, message: "LIVE 원결제 사전검사에 실패했습니다." }); });
    return () => { active = false; };
  }, []);

  async function cancelOnce() {
    if (busy || submitted || !acknowledged || !check?.ready || check.amount !== 9900) return;
    if (!window.confirm("실제 카드에 결제된 9,900원 한 건을 취소하고 해당 유료 리포트 이용권을 회수합니다. 진행하시겠습니까?")) return;
    setSubmitted(true); // No resubmission, including after any timeout or unknown outcome.
    setBusy(true);
    try {
      const response = await fetch("/api/internal/one-time-live-card-refund", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true, amount: 9900, livePaymentAcknowledged: true }),
      });
      const body = await response.json() as Result;
      setResult(body);
    } catch {
      setResult({ error: "연결이 끊겼습니다. 카드가 이미 취소됐을 수 있으므로 다시 누르지 마세요." });
    } finally {
      setBusy(false);
    }
  }

  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
    <h2 className="text-lg font-bold text-slate-900">실제 카드 9,900원 한 건 취소</h2>
    <p className="mt-3 text-sm leading-7 text-slate-700">
      저축과 자산 관리 습관 · 2026년 10월 · LIVE 실결제 9,900원 한 건만 대상입니다.
      이는 TEST 취소가 아닌 실제 카드 취소입니다. 취소 완료 시 이 구매의 리포트 열람 이용권을 회수합니다.
      결제·환불 이력은 감사 기록으로 남습니다.
    </p>
    <p role="status" className="mt-4 text-sm font-semibold text-slate-800">
      {busy ? "토스 LIVE 카드 취소·리포트 이용권 회수 처리 중…" :
        result ? (result.message ?? result.error ?? "취소 결과를 확인해 주세요.") :
        check ? check.message : "원결제 및 기존 취소 이력 안전검사 중…"}
    </p>
    <label className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-800">
      <input type="checkbox" checked={acknowledged} disabled={submitted}
        onChange={event => setAcknowledged(event.target.checked)}
        className="mt-1 h-5 w-5" />
      <span>이번 취소는 실제 카드에 청구된 <strong>9,900원</strong>을 돌려받는 절차이며,
        해당 유료 리포트의 열람 권한이 회수됨을 확인했습니다.</span>
    </label>
    <button type="button" onClick={cancelOnce}
      disabled={!check?.ready || check.amount !== 9900 || !acknowledged || busy || submitted}
      className="mt-5 rounded-xl bg-indigo-700 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400">
      {submitted ? "취소 요청 전달됨 · 중복 실행 금지" : "LIVE 카드 9,900원 한 건 취소"}
    </button>
    <p className="mt-4 text-xs leading-6 text-rose-700">
      취소 요청 후 결과에 관계없이 다시 누르지 마세요. 실패하거나 연결이 끊겨도 토스의 실제 상태와 환불 기록을 먼저 대조해야 합니다.
    </p>
  </section>;
}
