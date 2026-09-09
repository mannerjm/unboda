"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function AiCreditCheckoutFailContent() {
  const searchParams = useSearchParams();
  const profileId = searchParams.get("profileId");
  const productId = searchParams.get("productId");
  const edition = searchParams.get("edition");
  const message = searchParams.get("message") ?? "결제가 완료되지 않았습니다.";
  const params = profileId && productId && edition
    ? new URLSearchParams({ profileId, productId, edition }).toString()
    : "";
  const retryHref = params ? `/ai-consulting/credits?${params}` : "/";
  const consultationHref = params ? `/ai-consulting?${params}` : "/";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f2e8] px-6 text-stone-900">
      <section className="w-full max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold">AI 질문권 결제가 완료되지 않았습니다</h1>
        <p className="mt-3 text-sm leading-7 text-stone-600">{message}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href={retryHref} className="rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white">
            다시 시도하기
          </Link>
          <Link href={consultationHref} className="rounded-2xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-800">
            AI 상담으로 돌아가기
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function AiCreditCheckoutFailPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#f7f2e8] px-6"><p>결제 상태를 확인하고 있습니다.</p></main>}>
      <AiCreditCheckoutFailContent />
    </Suspense>
  );
}
