"use client";

import { useEffect, useMemo, useState } from "react";

type OwnReview = {
  id: string;
  rating: number;
  easyToUnderstand: number;
  helpfulness: number;
  aiConsultingUsed: boolean;
  aiConsultingHelpfulness: number | null;
  body: string;
  status: "PENDING" | "PUBLISHED" | "HIDDEN";
};

type ReviewContext = {
  eligible: boolean;
  aiConsultingUsed: boolean;
  ownReview: OwnReview | null;
};

const STATUS_COPY: Record<OwnReview["status"], string> = {
  PENDING: "검토 후 공개 예정",
  PUBLISHED: "구매 인증 후기 공개 중",
  HIDDEN: "공개 보류",
};

function Choice({
  value,
  selected,
  onClick,
}: {
  value: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={selected
        ? "rounded-xl bg-[#6f5ce7] px-3 py-2 text-xs font-bold text-white"
        : "rounded-xl border border-[#dce1ef] bg-white px-3 py-2 text-xs font-semibold text-slate-600"}
    >
      {value}
    </button>
  );
}

export default function VerifiedReviewPanel({
  productId,
  profileId,
  edition,
}: {
  productId: string;
  profileId: string;
  edition: string;
}) {
  const [context, setContext] = useState<ReviewContext | null>(null);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(5);
  const [easy, setEasy] = useState(3);
  const [helpful, setHelpful] = useState(3);
  const [aiHelpful, setAiHelpful] = useState(3);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ productId, profileId, edition });
    return params.toString();
  }, [edition, productId, profileId]);

  async function refresh() {
    try {
      const response = await fetch("/api/reviews?" + query, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as { context: ReviewContext | null };
      setContext(data.context);
      const own = data.context?.ownReview;
      if (own) {
        setRating(own.rating);
        setEasy(own.easyToUnderstand);
        setHelpful(own.helpfulness);
        setAiHelpful(own.aiConsultingHelpfulness ?? 3);
        setBody(own.body);
      }
    } catch {
      // Review is a non-blocking post-report feature.
    }
  }

  useEffect(() => {
    void refresh();
  }, [query]);

  if (!context?.eligible) return null;

  const own = context.ownReview;

  async function save() {
    if (body.trim().length < 10) {
      setMessage("한 줄 후기를 10자 이상 적어 주세요.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          profileId,
          edition,
          rating,
          easyToUnderstand: easy,
          helpfulness: helpful,
          aiConsultingHelpfulness: context?.aiConsultingUsed ? aiHelpful : null,
          body: body.trim(),
        }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setMessage(data.error ?? "후기를 저장하지 못했습니다.");
        return;
      }
      setEditing(false);
      setMessage("후기가 저장됐어요. 개인정보·스팸 여부 확인 후 공개됩니다.");
      await refresh();
    } catch {
      setMessage("후기를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm("작성한 후기를 삭제할까요?")) return;
    setSaving(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, profileId, edition }),
      });
      if (!response.ok) {
        setMessage("후기를 삭제하지 못했습니다.");
        return;
      }
      setContext((current) => current ? { ...current, ownReview: null } : current);
      setEditing(false);
      setBody("");
      setMessage("후기를 삭제했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-5 rounded-[1.75rem] border border-[#d8d3ff] bg-white p-5 shadow-sm sm:p-6" aria-label="구매 인증 후기 작성">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.13em] text-[#6f5ce7]">구매 인증 후기</p>
          <h2 className="mt-2 text-lg font-black text-[#11162d]">이번 분석은 어떠셨나요?</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            실제 구매가 확인된 이 리포트에 한 번만 후기를 남길 수 있어요. 개인정보나 다른 사람의 실명은 적지 말아 주세요.
          </p>
        </div>
        {own ? <span className="rounded-full bg-[#eef0f6] px-3 py-1.5 text-xs font-bold text-slate-600">{STATUS_COPY[own.status]}</span> : null}
      </div>

      {own && !editing ? (
        <div className="mt-4 rounded-2xl bg-[#f7f8fc] px-4 py-4">
          <p className="text-sm font-bold text-[#6f5ce7]">{"★".repeat(own.rating)}{"☆".repeat(5 - own.rating)}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{own.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setEditing(true)} className="rounded-xl border border-[#d8d3ff] bg-white px-4 py-2 text-xs font-bold text-[#5e4bd1]">후기 수정</button>
            <button type="button" onClick={() => void remove()} disabled={saving} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-50">후기 삭제</button>
          </div>
          {own.status === "HIDDEN" ? <p className="mt-3 text-xs leading-5 text-slate-500">개인정보·스팸 등 공개 기준에 따라 보류된 후기입니다. 내용을 수정하면 다시 검토됩니다.</p> : null}
        </div>
      ) : null}

      {!own && !editing ? (
        <button type="button" onClick={() => setEditing(true)} className="mt-4 rounded-xl bg-[#6f5ce7] px-5 py-3 text-sm font-bold text-white">
          짧은 후기 남기기
        </button>
      ) : null}

      {editing ? (
        <div className="mt-5 space-y-5 border-t border-[#e4e7f0] pt-5">
          <div>
            <p className="text-sm font-bold text-slate-800">전체 만족도</p>
            <div className="mt-2 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" onClick={() => setRating(value)} className={value <= rating ? "text-2xl text-[#6f5ce7]" : "text-2xl text-slate-300"} aria-label={String(value) + "점"}>
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-800">내용을 이해하기 쉬웠나요?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3].map((value) => <Choice key={value} value={value} selected={easy === value} onClick={() => setEasy(value)} />)}
              <span className="self-center text-xs text-slate-500">1 어려움 · 2 보통 · 3 쉬움</span>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-800">내 고민을 정리하는 데 도움이 됐나요?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3].map((value) => <Choice key={value} value={value} selected={helpful === value} onClick={() => setHelpful(value)} />)}
              <span className="self-center text-xs text-slate-500">1 잘 모르겠음 · 2 조금 도움 · 3 도움됨</span>
            </div>
          </div>

          {context.aiConsultingUsed ? (
            <div>
              <p className="text-sm font-bold text-slate-800">AI 상담이 리포트를 이어서 이해하는 데 도움이 됐나요?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[1, 2, 3].map((value) => <Choice key={value} value={value} selected={aiHelpful === value} onClick={() => setAiHelpful(value)} />)}
              </div>
            </div>
          ) : null}

          <label className="block text-sm font-bold text-slate-800">
            한 줄 후기
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value.slice(0, 500))}
              rows={4}
              maxLength={500}
              placeholder="예: 내용이 어렵지 않았고, 리포트에서 궁금했던 부분을 AI 상담으로 이어서 물어볼 수 있어 좋았어요."
              className="mt-2 block w-full rounded-2xl border border-[#dce1ef] bg-white px-4 py-3 text-sm font-normal leading-6 outline-none focus:border-[#6f5ce7]"
            />
          </label>
          <p className="text-xs leading-5 text-slate-500">실명, 연락처, 회사명, 상대방 이름 등 개인을 알아볼 수 있는 정보는 적지 말아 주세요. 수정한 후기는 다시 검토됩니다.</p>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void save()} disabled={saving} className="rounded-xl bg-[#6f5ce7] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "저장 중..." : "후기 저장"}</button>
            <button type="button" onClick={() => { setEditing(false); if (own) { setBody(own.body); setRating(own.rating); } }} disabled={saving} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-600">취소</button>
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p> : null}
    </section>
  );
}
