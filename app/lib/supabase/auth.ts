import { createClient } from "./server";

export type AuthenticatedUser = {
  id: string;
  email: string;
};

/**
 * Returns the Supabase-authenticated user from the server session.
 * Never trusts client-supplied identity; identity comes from the verified JWT.
 * Returns null if no valid session exists.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? "",
  };
}
