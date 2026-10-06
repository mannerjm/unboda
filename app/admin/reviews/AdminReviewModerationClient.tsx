"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminReviewItem } from "@/app/lib/reviews/server";

const STATUS_LABEL = {
  PENDING: "검토 대기",
  PUBLISHED: "공개",
  HIDDEN: "숨김",
} as const;

export default function AdminReviewModerationClient({ items }: { items: AdminReviewItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function moderate(reviewId: string, status: "PUBLISHED" | "HIDDEN") {
    const reason = reasonById[reviewId]?.trim() ?? "";
    if (status === "HIDDEN" && reason.length < 3) {
      setMessage("숨김 사유를 3자 이상 입력해 주세요. 개인정보·스팸·욕설 등 공개 기준 사유만 사용하세요.");
      return;
    }

    setBusyId(reviewId);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/reviews/" + reviewId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setMessage(data.error ?? "후기 상태를 변경하지 못했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setMessage("후기 상태를 변경하지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">아직 작성된 구매 인증 후기가 없습니다.</div>;
  }

  return (
    <div className="mt-5 space-y-4">
      {message ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{message}</div> : null}
      {items.map((item) => (
        <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">{item.productTitle}</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{STATUS_LABEL[item.status]}</span>
              {item.aiConsultingUsed ? <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">AI 상담 이용</span> : null}
            </div>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.body}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>이해도 {item.easyToUnderstand}/3</span>
            <span>도움도 {item.helpfulness}/3</span>
            {item.aiConsultingHelpfulness ? <span>AI 상담 도움도 {item.aiConsultingHelpfulness}/3</span> : null}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <label className="block text-xs font-semibold text-slate-600">
              숨김 사유
              <input
                value={reasonById[item.id] ?? ""}
                onChange={(event) => setReasonById((current) => ({ ...current, [item.id]: event.target.value.slice(0, 240) }))}
                placeholder="예: 실명/연락처 포함, 스팸, 욕설"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-slate-400"
              />
            </label>
            <p className="mt-2 text-xs leading-5 text-slate-500">낮은 평점이나 서비스 불만 자체는 숨김 사유가 아닙니다.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => void moderate(item.id, "PUBLISHED")} disabled={busyId === item.id} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">공개 승인</button>
              <button type="button" onClick={() => void moderate(item.id, "HIDDEN")} disabled={busyId === item.id} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">숨김</button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
