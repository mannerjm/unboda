import Link from "next/link";
import CheckoutAccessPanel from "./CheckoutAccessPanel";
import FamilyExtendedCheckoutAccessPanel from "./FamilyExtendedCheckoutAccessPanel";
import ProfileSelector from "@/app/components/ProfileSelector";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import { notFound } from "next/navigation";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import { getPremiumProductDisplayTitle } from "@/app/lib/premiumPresentation";
import { resolveLaunchPurchasableProduct } from "@/app/lib/purchases/products";
import { resolveAnalysisEditionForOrder } from "@/app/lib/analysisEditionForOrder";
import { formatAnalysisEditionLabel } from "@/app/lib/analysisEditionLabel";
import { getKoreaEvaluationDate } from "@/app/lib/evaluationContext";
import { getProfileFreeAnalysisFoundationStatus } from "@/app/lib/freeAnalysisEligibility";
import {
  getCompatibilityPairEntryPath,
  getSpecialAnalysisProduct,
  isCompatibilityFamilyOtherProductId,
  isCompatibilityFamilyParentChildProductId,
  isCompatibilityFamilySiblingProductId,
  isCompatibilityPairProductId,
} from "@/app/lib/specialAnalysisProducts";
import Script from "next/script";

type CheckoutPageProps = {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ profileId?: string }>;
};

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { productId } = await params;
  const { profileId } = await searchParams;
  const user = await getCurrentUser();

  if (profileId && !isProfileId(profileId)) notFound();

  const profile = user && profileId ? await getUserProfile(profileId, user.id) : null;
  if (user && profileId && !profile) notFound();
  const freeAnalysisStatus = user && profile
    ? await getProfileFreeAnalysisFoundationStatus(user.id, profile)
    : null;

  const resolved = resolveLaunchPurchasableProduct(productId);
  if (!resolved.ok) notFound();

  const canonicalProductId = resolved.productId;
  const specialProduct = getSpecialAnalysisProduct(canonicalProductId);
  const premiumProduct = specialProduct ? undefined : getPremiumProduct(canonicalProductId);
  if (!specialProduct && !premiumProduct) notFound();

  const displayTitle = specialProduct
    ? specialProduct.title
    : getPremiumProductDisplayTitle(premiumProduct!.id, premiumProduct!.title);

  const edition = user && profile && premiumProduct
    ? await resolveAnalysisEditionForOrder({
        userId: user.id,
        profileId: profile.id,
        productId: premiumProduct.id,
        profile,
      })
    : null;
  const familyEvaluationYear = Number(getKoreaEvaluationDate().slice(0, 4));
  const checkoutEditionLabel = edition
    ? formatAnalysisEditionLabel(edition.editionKey, edition.referenceSnapshot).replace(/ 분석$/, "")
    : isCompatibilityPairProductId(canonicalProductId)
      ? `${familyEvaluationYear}년 ${specialProduct?.shortTitle ?? "궁합"}`
      : isCompatibilityFamilyParentChildProductId(canonicalProductId)
      ? `${familyEvaluationYear}년 부모·자녀 궁합`
      : isCompatibilityFamilySiblingProductId(canonicalProductId)
        ? `${familyEvaluationYear}년 형제·자매 궁합`
        : isCompatibilityFamilyOtherProductId(canonicalProductId)
          ? `${familyEvaluationYear}년 기타 가족 궁합`
          : undefined;
  const isFamilyExtended = isCompatibilityFamilySiblingProductId(canonicalProductId)
    || isCompatibilityFamilyOtherProductId(canonicalProductId);
  const backHref = isCompatibilityPairProductId(canonicalProductId)
    ? getCompatibilityPairEntryPath(canonicalProductId)
    : isCompatibilityFamilyParentChildProductId(canonicalProductId) || isFamilyExtended
      ? "/special-analysis/compatibility/family/parent-child#family-relationship-selector"
      : specialProduct
        ? "/special-analysis/compatibility"
        : `/paid-analysis/${canonicalProductId}${profileId ? `?profileId=${profileId}` : ""}`;

  const accessPanelProps = {
    productId: canonicalProductId,
    profileId,
    productTitle: displayTitle,
    profileLabel: profile?.label,
    priceLabel: `${resolved.amount.toLocaleString("ko-KR")}원`,
    editionLabel: checkoutEditionLabel,
    freeAnalysisStatus,
  };

  return (
    <main className="min-h-screen bg-[#f5f7fc] px-5 py-10 text-[#11162d] sm:px-8 sm:py-14">
      <Script src="https://js.tosspayments.com/v2/standard" strategy="afterInteractive" />
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href={backHref}
          className="inline-flex items-center rounded-full border border-[#dce1ef] bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-[#b9b2f6] hover:text-[#5e4bd1]"
        >
          ← 상품 설명으로 돌아가기
        </Link>

        <header className="mt-8 overflow-hidden rounded-[2rem] border border-[#d9deed] bg-[radial-gradient(circle_at_top_right,rgba(132,111,241,0.18),transparent_32%),linear-gradient(145deg,#11162d_0%,#171a3d_62%,#242957_100%)] px-6 py-7 text-white shadow-[0_18px_55px_rgba(33,40,83,0.1)] sm:px-8 sm:py-9">
          <p className="text-xs font-bold tracking-[0.22em] text-[#b9b2f6]">CHECKOUT</p>
          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="max-w-2xl text-3xl font-black leading-tight tracking-[-0.035em] sm:text-4xl">{displayTitle}</h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200">
                계정 인증, 분석 대상, 결제 금액을 한 번 더 확인한 뒤 결제를 진행합니다.
              </p>
            </div>
            <div className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.07] px-5 py-4">
              <p className="text-[10px] font-bold tracking-[0.14em] text-slate-300">결제 금액</p>
              <p className="mt-1 text-2xl font-black">{resolved.amount.toLocaleString("ko-KR")}원</p>
            </div>
          </div>

          <div className="mt-6 grid gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
              <p className="font-bold text-white">01 · 계정 확인</p>
              <p className="mt-1 leading-5 text-slate-300">이메일·본인 인증 확인</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
              <p className="font-bold text-white">02 · 분석 대상 확인</p>
              <p className="mt-1 leading-5 text-slate-300">{profile?.label ?? "프로필 선택 필요"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
              <p className="font-bold text-white">03 · 결제 후 생성</p>
              <p className="mt-1 leading-5 text-slate-300">승인 직후 개인화 분석 시작</p>
            </div>
          </div>
        </header>

        {profile ? (
          <section className="mt-6 rounded-2xl border border-[#dce1ef] bg-white p-5 shadow-sm" aria-labelledby="checkout-subject-heading">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[0.14em] text-[#6f5ce7]">ANALYSIS SUBJECT</p>
                <h2 id="checkout-subject-heading" className="mt-2 text-lg font-bold text-[#11162d]">분석 대상 확인</h2>
              </div>
              <Link href="/mypage" className="text-xs font-semibold text-slate-500 underline decoration-slate-300 underline-offset-4">
                마이페이지에서 변경
              </Link>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-[#f7f8fc] px-4 py-3">
                <dt className="text-xs font-semibold text-slate-500">현재 분석 대상</dt>
                <dd className="mt-1 font-bold text-slate-900">{profile.label}</dd>
              </div>
              <div className="rounded-xl bg-[#f7f8fc] px-4 py-3">
                <dt className="text-xs font-semibold text-slate-500">분석 기준</dt>
                <dd className="mt-1 font-bold text-slate-900">{checkoutEditionLabel ?? "현재 기준"}</dd>
              </div>
            </dl>
          </section>
        ) : null}

        {isFamilyExtended
          ? <FamilyExtendedCheckoutAccessPanel {...accessPanelProps} />
          : <CheckoutAccessPanel {...accessPanelProps} />}

        {user && !profileId && premiumProduct ? (
          <ProfileSelector productId={premiumProduct.id} destination="checkout" />
        ) : null}
        {user && !profileId && specialProduct ? (
          <div className="mt-6 rounded-2xl border border-[#dce1ef] bg-white p-5 text-sm leading-7 text-slate-600 shadow-sm">
            궁합 분석은 현재 선택된 내 프로필을 기준으로 진행합니다. <Link href="/mypage" className="font-semibold text-[#5e4bd1] underline underline-offset-4">마이페이지에서 프로필을 선택해 주세요.</Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
