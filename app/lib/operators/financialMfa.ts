import "server-only";
import { createClient } from "@/app/lib/supabase/server";

// Called after an operator session has already been authorized.
export async function isFinancialMfaVerified(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return !error && data?.currentLevel === "aal2" && data.nextLevel === "aal2";
  } catch {
    return false;
  }
}
