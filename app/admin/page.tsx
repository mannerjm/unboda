import { redirect } from "next/navigation";
import { OperatorAuthorizationError, requireOperator } from "@/app/lib/operators/server";
import AdminLookupConsole from "./AdminLookupConsole";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  try {
    await requireOperator();
  } catch (error) {
    if (error instanceof OperatorAuthorizationError && error.code === "UNAUTHENTICATED") {
      redirect("/auth/login?returnTo=/admin");
    }

    return (
      <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
        <div className="mx-auto w-full max-w-xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">CS CONSOLE</p>
          <h1 className="mt-3 text-3xl font-bold">접근 권한 없음</h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">이 화면은 승인된 운영자만 사용할 수 있습니다.</p>
        </div>
      </main>
    );
  }

  return <AdminLookupConsole />;
}