"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CheckoutFailContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const productId = searchParams.get("productId");
  const profileId = searchParams.get("profileId");
  const checkoutHref = productId
    ? `/checkout/${encodeURIComponent(productId)}${profileId ? `?profileId=${encodeURIComponent(profileId)}` : ""}`
    : "/deep-analysis";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fc] px-6 text-stone-900">
      <section className="max-w-md text-center">
        <h1 className="text-2xl font-bold">결제를 완료하지 못했습니다.</h1>
        <p className="mt-4 text-sm leading-7 text-stone-600">
          결제는 승인되지 않았습니다. 입력한 분석 정보는 결제 완료 전까지 현재 브라우저에 유지되므로 다시 시도할 수 있습니다.
          {code ? "" : ""}
        </p>
        <Link href={checkoutHref} className="mt-6 inline-flex rounded-2xl bg-stone-900 px-5 py-3 text-sm font-bold text-white">
          결제 다시 확인하기
        </Link>
      </section>
    </main>
  );
}

export default function CheckoutFailPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#f5f7fc] px-6 text-stone-900"><p>결제 결과를 확인하고 있습니다.</p></main>}><CheckoutFailContent /></Suspense>;
}
