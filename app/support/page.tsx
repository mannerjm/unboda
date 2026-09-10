import { getCurrentUser } from "@/app/lib/supabase/auth";
import { listCurrentUserSupportRequests } from "@/app/lib/support/server";
import type { SupportRequestDto } from "@/app/lib/support/types";
import SupportCenterClient from "./SupportCenterClient";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const user = await getCurrentUser();
  let requests: SupportRequestDto[] = [];

  if (user) {
    try {
      requests = await listCurrentUserSupportRequests();
    } catch {
      requests = [];
    }
  }

  return <SupportCenterClient isAuthenticated={Boolean(user)} initialRequests={requests} />;
}