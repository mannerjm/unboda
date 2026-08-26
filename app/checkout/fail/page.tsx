"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CheckoutFailContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] px-6 text-stone-900">
      <section className="max-w-md text-center">
        <h1 className="text-2xl font-bold">결제를 완료하지 못했습니다.</h1>
        <p className="mt-4 text-sm leading-7 text-stone-600">
          결제는 승인되지 않았습니다. 다시 시도하거나 잠시 후 확인해 주세요.
          {code ? "" : ""}
        </p>
        <Link href="/result" className="mt-6 inline-block font-semibold underline">
          결과로 돌아가기
        </Link>
      </section>
    </main>
  );
}

export default function CheckoutFailPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] px-6 text-stone-900"><p>결제 결과를 확인하고 있습니다.</p></main>}><CheckoutFailContent /></Suspense>;
}