"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type EvaluationContext = {
  evaluationDate: string;
  evaluationYear: number;
  evaluationMonth: number;
};

type FreeAnalysisStatusBody = {
  status?: string;
  freshness?: "CURRENT" | "STALE";
  currentEvaluationContext?: EvaluationContext | null;
  refreshAvailable?: boolean;
  error?: string;
};

type MonthlyRefreshState = {
  context: EvaluationContext;
  refreshAvailable: boolean;
  generating: boolean;
};

type Props = {
  profileId: string;
  surface: "result" | "compact";
};

const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_ATTEMPTS = 90;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function currentMonthLabel(context: EvaluationContext): string {
  return `${context.evaluationYear}년 ${context.evaluationMonth}월`;
}

async function readRefreshState(profileId: string): Promise<MonthlyRefreshState | null> {
  const response = await fetch(`/api/free-analysis/${encodeURIComponent(profileId)}`, {
    cache: "no-store",
  });
  if (!response.ok) return null;

  const body = await response.json() as FreeAnalysisStatusBody;
  if (body.freshness !== "STALE" || !body.currentEvaluationContext) return null;

  return {
    context: body.currentEvaluationContext,
    refreshAvailable: body.refreshAvailable !== false,
    generating: body.status === "generating" || body.refreshAvailable === false,
  };
}

export default function MonthlyFreeAnalysisRefreshNotice({ profileId, surface }: Props) {
  const [state, setState] = useState<MonthlyRefreshState | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void readRefreshState(profileId)
      .then((nextState) => {
        if (!cancelled) setState(nextState);
      })
      .catch(() => {
        if (!cancelled) setState(null);
      });

    return () => { cancelled = true; };
  }, [profileId]);

  async function waitForRefreshCompletion(): Promise<boolean> {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      await sleep(POLL_INTERVAL_MS);
      const nextState = await readRefreshState(profileId);
      if (!nextState) return true;
      setState(nextState);
    }
    return false;
  }

  async function refreshCurrentMonth() {
    if (!state || isRefreshing || !state.refreshAvailable) return;
    setIsRefreshing(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/free-analysis/${encodeURIComponent(profileId)}/refresh`, {
        method: "POST",
        cache: "no-store",
      });
      const body = await response.json().catch(() => null) as FreeAnalysisStatusBody | null;

      if (response.status === 401) {
        window.location.assign(`/auth/login?returnTo=${encodeURIComponent(`/result?profileId=${profileId}`)}`);
        return;
      }

      if (response.ok && response.status !== 202 && body?.status === "current") {
        window.location.reload();
        return;
      }

      if (response.status === 202) {
        setState((current) => current ? { ...current, refreshAvailable: false, generating: true } : current);
        setMessage("이번 달 운세를 갱신하고 있어요. 기존 결과는 완료될 때까지 그대로 볼 수 있습니다.");
        const completed = await waitForRefreshCompletion();
        if (completed) {
          window.location.reload();
          return;
        }
        setMessage("갱신이 계속 진행 중입니다. 잠시 후 다시 확인해 주세요.");
        return;
      }

      setMessage(body?.error ?? "이번 달 운세를 갱신하지 못했습니다. 다시 시도해 주세요.");
    } catch {
      setMessage("이번 달 운세를 갱신하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setIsRefreshing(false);
    }
  }

  if (!state) return null;

  const monthLabel = currentMonthLabel(state.context);
  const busy = isRefreshing || state.generating;

  if (surface === "compact") {
    return (
      <section className="border-b border-amber-200 bg-amber-50/90 px-5 py-3 text-stone-900" aria-label="월운 갱신 안내">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold">{monthLabel} 운세 갱신 가능</p>
            <p className="mt-0.5 text-xs leading-5 text-stone-600">갱신하기 전까지 기존 무료 분석과 추천 TOP 3는 그대로 유지됩니다.</p>
          </div>
          <Link
            href={`/result?profileId=${encodeURIComponent(profileId)}`}
            className="shrink-0 text-sm font-semibold text-stone-800 underline decoration-stone-400 underline-offset-4"
          >
            무료 분석에서 확인하기
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#f7f3ea] px-5 pt-6" aria-labelledby="monthly-refresh-heading">
      <div className="mx-auto w-full max-w-6xl rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-amber-700">MONTHLY UPDATE</p>
          <h2 id="monthly-refresh-heading" className="mt-2 text-lg font-bold text-stone-900">{monthLabel}의 새로운 운세가 도착했어요</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            갱신하기 전까지 기존 결과는 그대로 볼 수 있습니다. 이번 달 흐름을 반영하면 무료 분석과 추천 분석 TOP 3가 새롭게 갱신될 수 있습니다.
          </p>
          {message ? <p className="mt-2 text-xs leading-5 text-amber-800" aria-live="polite">{message}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => void refreshCurrentMonth()}
          disabled={busy || !state.refreshAvailable}
          className="mt-4 w-full shrink-0 rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400 sm:mt-0 sm:w-auto"
        >
          {busy ? `${monthLabel} 운세 갱신 중...` : `${monthLabel} 운세로 갱신하기`}
        </button>
      </div>
    </section>
  );
}
