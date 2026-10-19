import { handleResetPost } from "@/app/lib/staging/bPasswordReset";
import { createResetDependencies } from "@/app/lib/staging/bPasswordResetServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleResetPost(request, createResetDependencies());
}
