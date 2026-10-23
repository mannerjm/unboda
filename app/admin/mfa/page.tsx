import Link from "next/link";
import { redirect } from "next/navigation";
import { OperatorAuthorizationError, requireOperator } from "@/app/lib/operators/server";
import AdminMfaSetup from "./AdminMfaSetup";

export const dynamic = "force-dynamic";

export default async function AdminMfaPage() {
  try {
    await requireOperator();
  } catch (error) {
    if (error instanceof OperatorAuthorizationError && error.code === "UNAUTHENTICATED") {
      redirect("/auth/login?returnTo=/admin/mfa");
    }
    return <main className="mx-auto max-w-xl px-5 py-14">
      <h1 className="text-2xl font-bold">접근 권한 없음</h1>
      <p className="mt-3">승인된 관리자만 추가 인증을 등록할 수 있습니다.</p>
    </main>;
  }
  return <main className="min-h-screen bg-[#f5f7fc] px-5 py-10 text-slate-900">
    <div className="mx-auto max-w-2xl">
      <Link className="text-sm font-semibold underline" href="/admin">← 관리자 대시보드</Link>
      <h1 className="mt-6 text-3xl font-bold">관리자 인증 앱(MFA) 설정</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        유료 리포트 카드 환불을 승인하려면 관리자 로그인 외에 인증 앱의 6자리 코드를 검증해야 합니다.
        QR코드와 인증번호를 타인에게 보내거나 고객지원에 붙여넣지 마세요.
      </p>
      <AdminMfaSetup />
    </div>
  </main>;
}
