import Link from "next/link";
import CheckoutAccessPanel from "./CheckoutAccessPanel";
import { paidAnalysisProducts } from "@/app/lib/paidAnalysisProducts";

type CheckoutPageProps = {
  params: Promise<{
    productId: string;
  }>;
};



export default async function CheckoutPage({
  params,
}: CheckoutPageProps) {
  const { productId } = await params;

 const product =
  paidAnalysisProducts[
    productId as keyof typeof paidAnalysisProducts
  ];


  if (!product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] px-6">
        <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-stone-900">
            구매할 수 없는 분석 상품입니다.
          </h1>

          <Link
            href="/result"
            className="mt-5 inline-flex text-sm font-semibold text-stone-700 underline"
          >
            결과로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/paid-analysis/${productId}`}
          className="text-sm font-semibold text-stone-600 transition hover:text-stone-900"
        >
          ← 상품 설명으로 돌아가기
        </Link>

        <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-stone-500">
          CHECKOUT
        </p>

        <h1 className="mt-3 text-3xl font-bold">
          {product.title}
        </h1>

        <p className="mt-5 text-sm leading-7 text-stone-600">
          구매를 진행하기 전에 계정 연결과 결제 단계를 확인합니다.
        </p>
       
       <CheckoutAccessPanel productId={productId} />
      </div>
    </main>
  );
}