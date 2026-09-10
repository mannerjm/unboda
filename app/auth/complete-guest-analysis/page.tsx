"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type TransferBlockCode = "SELF_PROFILE_CONFLICT" | "PROFILE_LIMIT_REACHED";

function CompleteGuestAnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [message, setMessage] = useState("분석 결과를 계정에 연결하고 있습니다...");
  const [blockCode, setBlockCode] = useState<TransferBlockCode | null>(null);

  useEffect(() => {
    void fetch("/api/guest-free-analysis/transfer", { method: "POST" })
      .then(async (response) => {
        const body = await response.json() as { resolvedProfileId?: string; selectedProductId?: string | null; transferStatus?: string; code?: string; error?: string };
        if (
          response.status === 409 &&
          (body.code === "SELF_PROFILE_CONFLICT" || body.code === "PROFILE_LIMIT_REACHED")
        ) {
          setBlockCode(body.code);
          return;
        }
        if (!response.ok || !body.resolvedProfileId) throw new Error(body.error ?? "분석 결과를 이전하지 못했습니다.");
        if (body.selectedProductId) {
          router.replace(`/checkout/${body.selectedProductId}?profileId=${body.resolvedProfileId}`);
          return;
        }
        if (body.transferStatus === "pending_existing_result") {
          router.replace("/saju");
          return;
        }
        if (next === "recommendations") {
          router.replace(`/recommendations?profileId=${body.resolvedProfileId}`);
          return;
        }
        router.replace(`/result?profileId=${body.resolvedProfileId}`);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "분석 결과를 이전하지 못했습니다."));
  }, [next, router]);

  return <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] px-6 text-center text-stone-900"><section className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
    {blockCode === "SELF_PROFILE_CONFLICT" ? <><h1 className="text-2xl font-bold">등록된 본인 정보와 입력한 정보가 다릅니다.</h1><p className="mt-4 text-sm leading-7 text-stone-600">계정에 이미 본인 프로필이 있어 이번 무료 조회 정보로 자동 변경하지 않았습니다. 출생일이나 출생시간 등 본인 정보를 수정해야 한다면 마이페이지에서 기존 정보를 확인한 후 직접 변경해 주세요.</p><Link href="/mypage" className="mt-6 inline-flex rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800">마이페이지에서 확인하기</Link></> : blockCode === "PROFILE_LIMIT_REACHED" ? <><h1 className="text-2xl font-bold">프로필을 더 저장할 수 없습니다.</h1><p className="mt-4 text-sm leading-7 text-stone-600">프로필은 계정당 최대 10명까지 관리할 수 있습니다. 기존 프로필을 확인한 후 다시 시도해 주세요. 이번 무료 조회 정보로 기존 프로필을 자동 수정하거나 삭제하지 않았습니다.</p><Link href="/mypage" className="mt-6 inline-flex rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800">마이페이지에서 확인하기</Link></> : <p className="text-sm leading-7 text-stone-700">{message}</p>}
  </section></main>;
}

export default function CompleteGuestAnalysisPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] px-6 text-center text-sm text-stone-700">분석 결과를 계정에 연결하고 있습니다...</main>}>
      <CompleteGuestAnalysisContent />
    </Suspense>
  );
}
