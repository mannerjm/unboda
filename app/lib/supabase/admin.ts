import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service_role key.
 *
 * Required because purchase tables have RLS enabled with SELECT-only policies:
 * clients must never be able to insert an order / purchase / entitlement.
 * All writes therefore happen here, and user_id always comes from the verified
 * server session (getCurrentUser()), never from the request body.
 *
 * SUPABASE_SERVICE_ROLE_KEY must NOT be exposed as NEXT_PUBLIC_*.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase 관리자 클라이언트 설정이 없습니다. NEXT_PUBLIC_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY 환경 변수를 확인해 주세요.",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function hasAdminClientConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
