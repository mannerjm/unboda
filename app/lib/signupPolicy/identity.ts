export type SignupAuthIdentity = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

function normalizeEmail(email: string | null | undefined): string | null {
  return typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
}

export function hasSignupOwnershipProof(input: {
  returnedUser: SignupAuthIdentity;
  authoritativeUser: SignupAuthIdentity;
  email: string;
  signupAttemptId: string;
}): boolean {
  return Boolean(
    input.returnedUser.id &&
      input.returnedUser.id === input.authoritativeUser.id &&
      normalizeEmail(input.authoritativeUser.email) === normalizeEmail(input.email) &&
      input.authoritativeUser.user_metadata?.signupAttemptId === input.signupAttemptId,
  );
}