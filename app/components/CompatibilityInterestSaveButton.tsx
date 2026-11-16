"use client";

import Link from "next/link";
import { useState } from "react";
import { saveCompatibilityInterestAction } from "@/app/lib/interestedAnalyses/actions";

type Props = {
  productId: string;
  initialSaved: boolean;
  authenticated: boolean;
  hasActiveProfile: boolean;
  onSaved?: () => void;
};

export default function CompatibilityInterestSaveButton({
  productId,
  initialSaved,
  authenticated,
  hasActiveProfile,
  onSaved,
}: Props) {
  const [savedLocally, setSavedLocally] = useState(false);
  const saved = initialSaved || savedLocally;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const style = "inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#cfd5e6] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#aaa0f4] hover:bg-[#faf9ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7752b8] disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-500";
  if (!authenticated) {
    return <Link href="/auth/login?returnTo=/special-analysis/compatibility" className={style}>관심 분석에 저장</Link>;
  }
  if (!hasActiveProfile) {
    return <Link href="/mypage" className={style}>프로필 선택 후 저장</Link>;
  }

  async function save() {
    if (saved || loading) return;
    setLoading(true);
    setError(null);
    try {
      await saveCompatibilityInterestAction(productId);
      setSavedLocally(true);
      onSaved?.();
    } catch {
      setError("저장되지 않았어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button type="button" onClick={() => void save()} disabled={saved || loading} aria-label={saved ? "관심 분석에 저장됨" : "관심 분석에 저장"} className={style}>
        {saved ? "관심 분석에 저장됨" : loading ? "저장 중..." : "관심 분석에 저장"}
      </button>
      {error ? <span role="alert" className="text-xs font-medium text-red-700">{error}</span> : null}
    </div>
  );
}
