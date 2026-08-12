"use client";
import { getCanonicalPremiumProductId } from "@/app/lib/premiumProductRegistry";
import Link from "next/link";
import { useEffect, useState } from "react";
import { guestAuthState, type AuthState } from "@/app/lib/auth";
import { createClient } from "@/app/lib/supabase/client";
import { loadEntitlements } from "@/app/lib/purchaseStorage";
import {
  hasActiveEntitlement,
  type Entitlement,
} from "@/app/lib/userAccess";

type ReportAccessGateProps = {
  productId: string;
  children: React.ReactNode;
};

export default function ReportAccessGate({
  productId,
  children,
}: ReportAccessGateProps) {
  const [authState, setAuthState] =
    useState<AuthState>(guestAuthState);

  const [entitlements, setEntitlements] =
    useState<Entitlement[]>([]);

  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setAuthState({
          status: "authenticated",
          user: {
            id: user.id,
            email: user.email ?? "",
            name: "",
            accessLevel: "free_member",
          },
        });
      }
      setEntitlements(loadEntitlements());
      setIsChecked(true);
    });
  }, []);

  if (!isChecked) {
    return (
      <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-7 text-center shadow-sm sm:p-9">
        <p className="text-sm text-stone-600">
          구매 권한을 확인하는 중입니다...
        </p>
      </section>
    );
  }
const canonicalProductId =
  getCanonicalPremiumProductId(productId);

 const realAccess =
  authState.status === "authenticated" &&
 hasActiveEntitlement(
  entitlements,
  authState.user.id,
  "demo-profile",
  canonicalProductId
);

const hasAccess =
  process.env.NODE_ENV === "development" || realAccess;

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
          구매가 완료된 계정과 프로필에만 심층 분석 열람 권한이 연결됩니다.
        </p>

        <Link
          href={`/paid-analysis/${canonicalProductId}`}
          className="mt-7 block w-full rounded-2xl bg-stone-900 px-5 py-4 text-center font-semibold text-white transition hover:bg-stone-800"
        >
          상품 설명으로 돌아가기
        </Link>
      </section>
    );
  }

  return <>{children}</>;
}