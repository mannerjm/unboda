import Link from "next/link";
import {
  getUserAccessPermissions,
  type UserAccessLevel,
} from "@/app/lib/userAccess";
import PaidAnalysisAccessPanel from "./PaidAnalysisAccessPanel";
import { paidAnalysisProducts } from "@/app/lib/paidAnalysisProducts";

type PaidAnalysisPageProps = {
  params: Promise<{
    productId: string;
  }>;
};


export default async function PaidAnalysisPage({
  params,
}: PaidAnalysisPageProps) {
  const { productId } = await params;

  const product =
    paidAnalysisProducts[
      productId as keyof typeof paidAnalysisProducts
    ];

  const userAccessLevel: UserAccessLevel = "guest";
const permissions = getUserAccessPermissions(userAccessLevel);

  if (!product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] px-6">
        <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-stone-900">
            존재하지 않는 분석 상품입니다.
          </h1>

          <p className="mt-3 text-sm leading-7 text-stone-600">
            올바른 분석 상품을 선택해 주세요.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
      <div className="mx-auto max-w-3xl">
        <Link
  href="/result"
  className="inline-flex text-sm font-semibold text-stone-600 transition hover:text-stone-900"
>
  ← 결과로 돌아가기
</Link>

        <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-stone-500">
  PREMIUM ANALYSIS
</p>

        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          {product.title}
        </h1>

        <p className="mt-5 text-sm leading-7 text-stone-600">
          {product.description}
        </p>
        <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
  <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">
    WHAT YOU GET
  </p>

  <h2 className="mt-3 text-2xl font-bold text-stone-900">
    이 심층 분석에서 확인할 수 있는 내용
  </h2>

  <div className="mt-6 grid gap-3">
    {product.details.map((item) => (
      <div
        key={item}
        className="rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4 text-sm leading-6 text-stone-700"
      >
        {item}
      </div>
    ))}
  </div>

  <div className="mt-7 rounded-2xl bg-stone-900 p-6 text-white">
    <p className="text-sm font-semibold">
      구매 전 안내
    </p>

    <p className="mt-3 text-sm leading-7 text-stone-300">
      운보다의 유료 분석은 무료 분석의 정확도를 높이는 상품이 아니라,
      같은 명리 계산 결과를 바탕으로 분석의 깊이와 문제 해결 범위를
      확장하는 심층 분석입니다.
    </p>
  </div>

  <PaidAnalysisAccessPanel productId={productId} />
  
</section>
      </div>
    </main>
  );
}