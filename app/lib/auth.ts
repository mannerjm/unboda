import type { UserAccessLevel } from "./userAccess";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  accessLevel: UserAccessLevel;
};

export type AuthState =
  | {
      status: "guest";
      user: null;
    }
  | {
      status: "authenticated";
      user: AuthUser;
    };

export const guestAuthState: AuthState = {
  status: "guest",
  user: null,
};

export function isAuthenticated(
  authState: AuthState
): authState is Extract<AuthState, { status: "authenticated" }> {
  return authState.status === "authenticated";
}

export function getAuthUserAccessLevel(
  authState: AuthState
): UserAccessLevel {
  return authState.status === "authenticated"
    ? authState.user.accessLevel
    : "guest";
}

export function getSafeReturnTo(
  returnTo: string | undefined,
  fallback = "/result"
): string {
  return returnTo?.startsWith("/") ? returnTo : fallback;
}

// ---------------------------------------------------------------------------
// localStorage-based auth functions REMOVED in Phase 3A.
// Authentication is now handled by Supabase Auth (see app/lib/supabase/).
// These stubs prevent import errors in any code not yet migrated.
// ---------------------------------------------------------------------------

/** @deprecated Use Supabase browser client directly. */
export function saveAuthState(_authState: AuthState): void {
  // no-op: localStorage auth is no longer the source of truth
}

/** @deprecated Use createClient().auth.getUser() from app/lib/supabase/client.ts */
export function loadAuthState(): AuthState {
  // Always returns guest; components must switch to Supabase session
  return guestAuthState;
}

/** @deprecated Use createClient().auth.signOut() from app/lib/supabase/client.ts */
export function clearAuthState(): void {
  // no-op: handled by Supabase signOut
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("unboda-auth-state");
  }
}
