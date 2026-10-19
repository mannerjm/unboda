import { randomBytes } from "node:crypto";
import { PRIVATE_HEADERS, RESET_PAGE_PATH, ResetAccessError, requireResetActor, requireResetGrant, requireResetTarget } from "@/app/lib/staging/bPasswordReset";
import { resetPage } from "@/app/lib/staging/bPasswordResetHtml";
import { createResetDependencies } from "@/app/lib/staging/bPasswordResetServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const dependencies = createResetDependencies();
  try {
    const grant = requireResetGrant(request, dependencies);
    await requireResetActor(dependencies);
    await requireResetTarget(grant, dependencies);
    return resetPage(grant, randomBytes(24).toString("base64"));
  } catch (error) {
    if (error instanceof ResetAccessError && error.status === 401) {
      return new Response(null, { status: 303, headers: {
        ...PRIVATE_HEADERS, Location: `/auth/login?returnTo=${encodeURIComponent(RESET_PAGE_PATH)}`,
      } });
    }
    const status = error instanceof ResetAccessError ? error.status : 503;
    const message = error instanceof ResetAccessError ? error.message : "재설정 화면을 불러오지 못했습니다.";
    return new Response(message, { status, headers: { ...PRIVATE_HEADERS, "Content-Type": "text/plain; charset=utf-8" } });
  }
}
