"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CompleteGuestAnalysisPage() {
  const router = useRouter();
  const [message, setMessage] = useState("분석 결과를 계정에 연결하고 있습니다...");
  const [selfConflict, setSelfConflict] = useState(false);

  useEffect(() => {
    void fetch("/api/guest-free-analysis/transfer", { method: "POST" })
      .then(async (response) => {
        const body = await response.json() as { resolvedProfileId?: string; selectedProductId?: string | null; transferStatus?: string; code?: string; error?: string };
        if (response.status === 409 && body.code === "SELF_PROFILE_CONFLICT") {
          setSelfConflict(true);
          return;
        }
        if (!response.ok || !body.resolvedProfileId) throw new Error(body.error ?? "분석 결과를 이전하지 못했습니다.");
        if (body.selectedProductId) {
          router.replace(`/checkout/${body.selectedProductId}?profileId=${body.resolvedProfileId}`);
          return;
        }
        router.replace(body.transferStatus === "pending_existing_result" ? "/saju" : `/result?profileId=${body.resolvedProfileId}`);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "분석 결과를 이전하지 못했습니다."));
  }, [router]);

  return <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] px-6 text-center text-stone-900"><section className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
    {selfConflict ? <><h1 className="text-2xl font-bold">이 계정에는 이미 본인 프로필이 있습니다.</h1><p className="mt-4 text-sm leading-7 text-stone-600">현재 guest 대상은 본인으로 저장되어 있어 자동 이전할 수 없습니다. 배우자, 자녀, 부모, 형제자매 또는 기타 관계로 변경하려면 guest 관계 변경 API가 추가로 필요합니다.</p><div className="mt-5 grid grid-cols-2 gap-2 text-sm text-stone-600">{["배우자", "자녀", "부모", "형제자매", "기타"].map((label) => <span key={label} className="rounded-xl border border-stone-200 px-3 py-2">{label}</span>)}</div></> : <p className="text-sm leading-7 text-stone-700">{message}</p>}
  </section></main>;
}