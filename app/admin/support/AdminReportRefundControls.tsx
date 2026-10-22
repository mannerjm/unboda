"use client";

import { useState } from "react";

type Reason = "CONTENT_NOT_PROVIDED" | "MATERIAL_DEFECT" | "MATERIALLY_DIFFERENT" | "CHANGE_OF_MIND";
type Preview = { enabled?: boolean; ready?: boolean; amount?: number | null; message?: string; error?: string };
const options: { value: Reason; label: string }[] = [
  { value: "CONTENT_NOT_PROVIDED", label: "리포트 미제공·복구 불가" },
  { value: "MATERIAL_DEFECT", label: "실질적 결함 확인" },
  { value: "MATERIALLY_DIFFERENT", label: "구매 내용과 실질적으로 다름" },
  { value: "CHANGE_OF_MIND", label: "생성 시작 전 단순 취소" },
];

export default function AdminReportRefundControls({ ticketId, status }: {
  ticketId: string; status: string;
}) {
  const [reason, setReason] = useState<Reason>("CONTENT_NOT_PROVIDED");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const inReview = status === "IN_REVIEW";
  async function inspect() {
    setBusy(true); setPreview(null); setResult(null); setConfirmed(false);
    try {
      const res = await fetch("/api/internal/admin/report-refunds?ticketId=" +
        encodeURIComponent(ticketId) + "&reason=" + encodeURIComponent(reason), { cache: "no-store" });
      const body = await res.json().catch(() => ({})) as Preview;
      setPreview(res.ok ? body : { ready: false, message: body.error ?? "사전검사 실패" });
    } catch {
      setPreview({ ready: false, message: "환불 확인에 실패했습니다. 거래 상태를 확인하세요." });
    } finally { setBusy(false); }
  }
  async function approve() {
    if (!preview?.ready || !preview.enabled || !confirmed || !inReview
      || busy || !Number.isSafeInteger(preview.amount) || !note.trim() || note.trim().length < 10) return;
    if (!window.confirm("원결제 " + Number(preview.amount).toLocaleString("ko-KR")
      + "원 전액 카드 취소 및 리포트 이용 권한 회수를 승인하시겠습니까? 실제 카드 취소가 실행됩니다.")) return;
    setBusy(true); setResult(null);
    try {
      const res = await fetch("/api/internal/admin/report-refunds", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, reason, note, confirmed: true, amountConfirmation: preview.amount }),
      });
      const body = await res.json().catch(() => ({})) as { status?: string; message?: string; error?: string };
      setResult(body.message ?? body.error ?? "환불 결과를 확인하세요.");
      setPreview(null); setConfirmed(false);
    } catch {
      setResult("취소 결과를 확인할 수 없습니다. 토스와 운보다 상태를 조회하기 전 재실행하지 마세요.");
      setPreview(null);
    } finally { setBusy(false); }
  }
  return <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
    <h3 className="text-sm font-bold text-amber-950">리포트 카드 전액 환불 · 관리자 승인형</h3>
    <p className="mt-1 text-xs leading-5 text-amber-900">
      사전검사 후 승인 시 실제 토스 카드 취소가 실행됩니다. 중복 취소 및 부분환불은 지원하지 않습니다.
      시스템이 비활성 상태라면 토스에서 임의로 중복 취소하지 마세요.
    </p>
    <label className="mt-3 block text-xs font-bold">관리자가 확인한 환불 사유
      <select value={reason} disabled={busy} onChange={(e) => {
        setReason(e.target.value as Reason); setPreview(null); setConfirmed(false);
      }} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
    <button type="button" className="mt-3 rounded-lg border border-slate-600 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50"
      disabled={busy || !inReview} onClick={() => void inspect()}>
      {busy ? "확인 중..." : "원결제·중복 환불·정책 사전검사"}
    </button>
    {!inReview ? <p className="mt-2 text-xs text-amber-900">먼저 고객지원 문의 상태를 &apos;확인 중&apos;으로 저장하세요.</p> : null}
    {preview ? <p role="status" className="mt-3 text-xs font-semibold leading-5">
      {preview.message} {preview.amount != null ? " · 원결제 " + preview.amount.toLocaleString("ko-KR") + "원" : ""}
    </p> : null}
    {preview?.ready && preview.enabled ? <div className="mt-3 rounded-lg border border-amber-300 bg-white p-3">
      <label className="block text-xs font-bold">승인 근거 메모 (10~120자, 개인정보 금지)
        <textarea value={note} onChange={(e) => { setNote(e.target.value); setConfirmed(false); }}
          maxLength={120} rows={2} className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
          placeholder="예: 유료 리포트 생성 재시도 실패 및 최종 미제공 확인" />
      </label>
      <label className="mt-3 flex items-start gap-2 text-xs font-semibold">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        토스 원결제 금액과 고객 문의를 확인했고 전액 취소 및 이용권 회수에 동의합니다.
      </label>
      <button type="button" disabled={busy || !confirmed || note.trim().length < 10}
        onClick={() => void approve()} className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
        카드 전액 환불 승인 · 실제 취소 실행
      </button>
    </div> : null}
    {result ? <p role="status" className="mt-3 text-xs font-semibold leading-5">{result}</p> : null}
  </section>;
}
