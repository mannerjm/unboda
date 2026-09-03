import { hasSignupOwnershipProof } from "./identity";

export type SignupProviderUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
  identities?: readonly unknown[] | null;
};

export type SignupProviderResult = {
  user: SignupProviderUser | null;
  error: unknown;
};

export type SignupCompletionResult =
  | { status: "AUTH_FAILED" }
  | { status: "IDENTITY_AMBIGUOUS" }
  | { status: "EVIDENCE_RECORDED"; user: SignupProviderUser };

export async function completeNewSignupWithEvidence(input: {
  email: string;
  password: string;
  signupAttemptId: string;
  signUp: (input: { email: string; password: string; signupAttemptId: string }) => Promise<SignupProviderResult>;
  getAuthoritativeUser: (userId: string) => Promise<SignupProviderUser | null>;
  recordEvidence: (userId: string) => Promise<void>;
}): Promise<SignupCompletionResult> {
  const signup = await input.signUp({
    email: input.email,
    password: input.password,
    signupAttemptId: input.signupAttemptId,
  });

  if (signup.error || !signup.user) return { status: "AUTH_FAILED" };

  const authoritativeUser = await input.getAuthoritativeUser(signup.user.id);
  if (!authoritativeUser || !hasSignupOwnershipProof({
    returnedUser: signup.user,
    authoritativeUser,
    email: input.email,
    signupAttemptId: input.signupAttemptId,
  })) {
    return { status: "IDENTITY_AMBIGUOUS" };
  }

  await input.recordEvidence(authoritativeUser.id);
  return { status: "EVIDENCE_RECORDED", user: authoritativeUser };
}