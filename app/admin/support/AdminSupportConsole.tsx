"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_REQUEST_STATUSES,
  SUPPORT_STATUS_LABELS,
  type OperatorSupportRequestDto,
  type SupportRequestStatus,
} from "@/app/lib/support/types";

const filterOptions: Array<{ value: "ACTIVE" | SupportRequestStatus; label: string }> = [
  { value: "ACTIVE", label: "진행 중" },
  ...SUPPORT_REQUEST_STATUSES.map((status) => ({ value: status, label: SUPPORT_STATUS_LABELS[status] })),
];

function time(value: string | null): string {
  return value ? new Date(value).toLocaleString("ko-KR") : "없음";
}

export default function AdminSupportConsole({ initialRequests }: { initialRequests: OperatorSupportRequestDto[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [filter, setFilter] = useState<"ACTIVE" | SupportRequestStatus>("ACTIVE");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, SupportRequestStatus>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const activeCount = useMemo(
    () => requests.filter((item) => item.status !== "RESOLVED").length,
    [requests],
  );

  async function load(nextFilter = filter) {
    setLoading(true);
    setMessage(null);
    try {
      const url = nextFilter === "ACTIVE"
        ? "/api/internal/admin/support/requests"
        : `/api/internal/admin/support/requests?status=${encodeURIComponent(nextFilter)}`;
      const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
      const body = await response.json().catch(() => null) as { requests?: OperatorSupportRequestDto[]; error?: string } | null;
      if (!response.ok || !body?.requests) throw new Error(body?.error ?? "고객지원 요청을 조회하지 못했습니다.");
      setRequests(body.requests);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "고객지원 요청을 조회하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function save(event: FormEvent, requestId: string) {
    event.preventDefault();
    if (savingId) return;
    const status = statuses[requestId] ?? "IN_REVIEW";
    const responseText = responses[requestId] ?? "";
    if ((status === "WAITING_USER" || status === "RESOLVED") && responseText.trim().length < 5) {
      setMessage("고객 확인 필요 또는 답변 완료 상태에는 5자 이상의 답변이 필요합니다.");
      return;
    }

    setSavingId(requestId);
    setMessage(null);
    try {
      const response = await fetch(`/api/internal/admin/support/requests/${encodeURIComponent(requestId)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, response: responseText }),
      });
      const body = await response.json().catch(() => null) as { request?: Partial<OperatorSupportRequestDto> & { id: string }; error?: string } | null;
      if (!response.ok || !body?.request) throw new Error(body?.error ?? "문의 요청을 업데이트하지 못했습니다.");
      setRequests((current) => current.map((item) => item.id === requestId ? {
        ...item,
        status: body.request!.status ?? item.status,
        operatorResponse: body.request!.operatorResponse ?? item.operatorResponse,
        respondedAt: body.request!.respondedAt ?? item.respondedAt,
        resolvedAt: body.request!.resolvedAt ?? item.resolvedAt,
        updatedAt: body.request!.updatedAt ?? item.updatedAt,
      } : item));
      setMessage("문의 상태가 저장되었습니다. 고객은 /support에서 답변을 확인할 수 있습니다.");
      if (filter === "ACTIVE" && status === "RESOLVED") {
        setRequests((current) => current.filter((item) => item.id !== requestId));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "문의 요청을 업데이트하지 못했습니다.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section>
      <header className="border-b border-stone-200 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">SUPPORT QUEUE</p>
            <h1 className="mt-3 text-3xl font-bold">고객지원 요청</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">자동 해결 안내로 해결되지 않은 문의만 들어옵니다. 결제·환불·이용권·리포트 상태는 이 화면에서 직접 바꾸지 않고 기존 운영 조회로 확인합니다.</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm"><span className="text-stone-500">현재 목록 </span><strong>{activeCount}건</strong></div>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {filterOptions.map((option) => (
          <button key={option.value} type="button" onClick={() => { setFilter(option.value); void load(option.value); }} className={`rounded-full border px-3.5 py-2 text-sm font-semibold ${filter === option.value ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700"}`}>{option.label}</button>
        ))}
        <button type="button" onClick={() => void load()} disabled={loading} className="ml-auto rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 disabled:opacity-50">{loading ? "조회 중" : "새로고침"}</button>
      </div>

      {message ? <p role="status" className="mt-4 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">{message}</p> : null}

      {requests.length === 0 ? <p className="mt-6 rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-500">현재 표시할 문의가 없습니다.</p> : (
        <div className="mt-6 space-y-4">
          {requests.map((item) => (
            <article key={item.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-stone-500">{SUPPORT_CATEGORY_LABELS[item.category]}</p>
                  <p className="mt-1 break-all text-sm font-bold text-stone-900">{item.contactEmail}</p>
                </div>
                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">{SUPPORT_STATUS_LABELS[item.status]}</span>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-700">{item.message}</p>
              <dl className="mt-4 grid gap-2 text-xs text-stone-500 sm:grid-cols-2">
                <div><dt className="font-semibold">접수 시각</dt><dd className="mt-1">{time(item.createdAt)}</dd></div>
                <div><dt className="font-semibold">주문 ID</dt><dd className="mt-1 break-all font-mono">{item.orderId ?? "없음"}</dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/admin" className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700">운영 대시보드에서 고객/주문 조회</Link>
              </div>
              {item.operatorResponse ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold text-emerald-700">현재 고객에게 표시되는 답변</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-800">{item.operatorResponse}</p>
                </div>
              ) : null}

              <form onSubmit={(event) => void save(event, item.id)} className="mt-5 border-t border-stone-100 pt-5">
                <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                  <label className="text-sm font-semibold">상태
                    <select value={statuses[item.id] ?? (item.status === "OPEN" ? "IN_REVIEW" : item.status)} onChange={(event) => setStatuses((current) => ({ ...current, [item.id]: event.target.value as SupportRequestStatus }))} className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 font-normal">
                      <option value="OPEN">접수됨</option>
                      <option value="IN_REVIEW">확인 중</option>
                      <option value="WAITING_USER">고객 확인 필요</option>
                      <option value="RESOLVED">답변 완료</option>
                    </select>
                  </label>
                  <label className="text-sm font-semibold">고객에게 표시할 답변
                    <textarea value={responses[item.id] ?? item.operatorResponse ?? ""} onChange={(event) => setResponses((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={1500} rows={4} className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal leading-6" placeholder="확인 결과와 고객이 다음에 해야 할 행동만 적어 주세요. 내부 로그·비밀값·사주 상세는 적지 않습니다." />
                  </label>
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="submit" disabled={savingId !== null} className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-stone-400">{savingId === item.id ? "저장 중..." : "상태/답변 저장"}</button>
                </div>
              </form>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}