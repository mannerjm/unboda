import { getCanonicalPremiumProductId } from "@/app/lib/premiumProductRegistry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import {
  hasActiveEntitlementForProfile,
  hasActiveEntitlementForProfileEdition,
} from "@/app/lib/purchases/server";

type ReportAccessGateProps = {
  productId: string;
  profileId?: string;
  edition?: string;
  children: React.ReactNode;
};

export default async function ReportAccessGate({
  productId,
  profileId,
  edition,
  children,
}: ReportAccessGateProps) {
  const canonicalProductId = getCanonicalPremiumProductId(productId);

  const user = await getCurrentUser();

  if (!profileId || !isProfileId(profileId)) {
    notFound();
  }

  const profile = user ? await getUserProfile(profileId, user.id) : null;
  const activeProfile = user ? await getActiveProfile(user.id) : null;

  if (user && (!profile || activeProfile?.id !== profile.id)) {
    notFound();
  }

  const hasAccess = user && profile
    ? edition
      ? await hasActiveEntitlementForProfileEdition(user.id, profile.id, canonicalProductId, edition)
      : await hasActiveEntitlementForProfile(user.id, profile.id, canonicalProductId)
    : false;

  if (!hasAccess) {
    return (
      <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
        <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">
          ACCESS DENIED
        </p>

        <h2 className="mt-3 text-2xl font-bold text-stone-900">
          이 심층 분석을 열람할 권한이 없습니다
        </h2>

        <p className="mt-4 text-sm leading-7 text-stone-600">
          로그인 상태와 해당 상품의 구매 권한을 확인해 주세요.
          구매가 완료된 계정에만 심층 분석 열람 권한이 연결됩니다.
        </p>

        <Link
          href={`/paid-analysis/${canonicalProductId}?profileId=${profileId}`}
          className="mt-7 block w-full rounded-2xl bg-stone-900 px-5 py-4 text-center font-semibold text-white transition hover:bg-stone-800"
        >
          상품 설명으로 돌아가기
        </Link>
      </section>
    );
  }

  return <>{children}</>;
}