import Link from "next/link";
import { redirect } from "next/navigation";
import { OperatorAuthorizationError, requireOperator } from "@/app/lib/operators/server";
import { listSupportRequestsForOperator } from "@/app/lib/support/operatorServer";
import type { OperatorSupportRequestDto } from "@/app/lib/support/types";
import AdminSupportConsole from "./AdminSupportConsole";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  try {
    await requireOperator();
  } catch (error) {
    if (error instanceof OperatorAuthorizationError && error.code === "UNAUTHENTICATED") {
      redirect("/auth/login?returnTo=/admin/support");
    }
    return (
      <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
        <div className="mx-auto w-full max-w-xl">
          <h1 className="text-3xl font-bold">접근 권한 없음</h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">승인된 운영자만 고객지원 요청을 볼 수 있습니다.</p>
        </div>
      </main>
    );
  }

  let requests: OperatorSupportRequestDto[] = [];
  let unavailable = false;
  try {
    requests = await listSupportRequestsForOperator();
  } catch {
    unavailable = true;
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-10 text-stone-900 sm:px-8 sm:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <Link href="/admin" className="text-sm font-semibold text-stone-600 underline underline-offset-4">← 운영 대시보드</Link>
        {unavailable ? <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">고객지원 요청을 불러오지 못했습니다. 임의로 DB를 수정하지 말고 잠시 후 다시 확인해 주세요.</p> : null}
        <div className="mt-6"><AdminSupportConsole initialRequests={requests} /></div>
      </div>
    </main>
  );
}