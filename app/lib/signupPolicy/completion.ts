export type SignupCompletionState =
  | "INCOMPLETE_SIGNUP"
  | "WAITING_FOR_EMAIL_VERIFICATION"
  | "POLICY_RECOVERY_REQUIRED"
  | "SIGNUP_COMPLETE";

export function getSignupCompletionState(input: {
  policyComplete: boolean;
  emailVerified: boolean;
}): SignupCompletionState {
  if (input.policyComplete && input.emailVerified) return "SIGNUP_COMPLETE";
  if (input.policyComplete) return "WAITING_FOR_EMAIL_VERIFICATION";
  if (input.emailVerified) return "POLICY_RECOVERY_REQUIRED";
  return "INCOMPLETE_SIGNUP";
}