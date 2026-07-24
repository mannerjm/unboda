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

const AUTH_STORAGE_KEY = "unboda-auth-state";

export function saveAuthState(authState: AuthState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify(authState)
  );
}

export function loadAuthState(): AuthState {
  if (typeof window === "undefined") {
    return guestAuthState;
  }

  const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!stored) {
    return guestAuthState;
  }

  try {
    const parsed = JSON.parse(stored) as AuthState;

    if (
      parsed.status === "authenticated" &&
      parsed.user
    ) {
      return parsed;
    }

    return guestAuthState;
  } catch {
    return guestAuthState;
  }
}

export function clearAuthState(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}