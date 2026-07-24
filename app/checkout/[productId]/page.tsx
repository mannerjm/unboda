import Link from "next/link";
import {
  getUserAccessPermissions,
  type UserAccessLevel,
} from "@/app/lib/userAccess";

type CheckoutPageProps = {
  params: Promise<{
    productId: string;
  }>;
};

const checkoutProducts = {
  "career-business": {
    title: "직업·사업운 심층 분석",
  },
  wealth: {
    title: "재물운 심층 분석",
  },
  relationship: {
    title: "연애·관계 심층 분석",
  },
} as const;

export default async function CheckoutPage({
  params,
}: CheckoutPageProps) {
  const { productId } = await params;

  const product =
    checkoutProducts[
      productId as keyof typeof checkoutProducts
    ];

  const userAccessLevel: UserAccessLevel = "guest";
const permissions = getUserAccessPermissions(userAccessLevel);  

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
        <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
  {userAccessLevel === "guest" ? (
    <>
      <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">
        ACCOUNT REQUIRED
      </p>

      <h2 className="mt-3 text-2xl font-bold text-stone-900">
        구매한 분석을 보관하려면 계정 연결이 필요합니다
      </h2>

      <p className="mt-4 text-sm leading-7 text-stone-600">
        회원가입은 무료 분석을 보기 위한 조건이 아닙니다.
        유료 분석을 구매하고 이후 다시 확인할 수 있도록
        구매 결과를 계정에 연결하는 단계입니다.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          className="rounded-2xl bg-stone-900 px-5 py-4 font-semibold text-white transition hover:bg-stone-800"
        >
          로그인
        </button>

        <button
          type="button"
          className="rounded-2xl border border-stone-300 bg-white px-5 py-4 font-semibold text-stone-900 transition hover:bg-stone-50"
        >
          회원가입
        </button>
      </div>
    </>
  ) : (
    <p className="text-sm text-stone-600">
      계정이 확인되었습니다. 결제를 계속 진행할 수 있습니다.
    </p>
  )}

  <p className="mt-5 text-xs leading-5 text-stone-500">
    유료 분석 구매 가능 상태:{" "}
    {permissions.canPurchasePaidAnalysis ? "가능" : "불가"}
  </p>
</section>
      </div>
    </main>
  );
}