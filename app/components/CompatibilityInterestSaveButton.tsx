"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { saveCompatibilityInterestAction } from "@/app/lib/interestedAnalyses/actions";

type Props = {
  productId: string;
  initialSaved: boolean;
  authenticated: boolean;
  hasActiveProfile: boolean;
  compact?: boolean;
};

export default function CompatibilityInterestSaveButton({
  productId,
  initialSaved,
  authenticated,
  hasActiveProfile,
  compact = false,
}: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setSaved(initialSaved), [initialSaved, productId]);

  const style = "inline-flex min-h-9 items-center justify-center rounded-lg border border-[#d8c7ec] bg-[#faf7ff] px-3 py-2 text-xs font-bold text-[#7551af] transition hover:border-[#b99ce5] hover:bg-[#f1e7ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7752b8] disabled:cursor-not-allowed disabled:opacity-70";
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
      setSaved(true);
    } catch {
      setError("저장되지 않았어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "flex flex-wrap items-center gap-3"}>
      <button type="button" onClick={() => void save()} disabled={saved || loading} aria-label={saved ? "관심 분석에 저장됨" : "관심 분석에 저장"} className={style}>
        {saved ? "관심 분석에 저장됨" : loading ? "저장 중..." : "관심 분석에 저장"}
      </button>
      {saved ? <Link href="/interests" className="text-xs font-bold text-[#7751b0] underline underline-offset-2">관심 목록 보기</Link> : null}
      {error ? <span role="alert" className="text-xs font-medium text-red-700">{error}</span> : null}
    </div>
  );
}
