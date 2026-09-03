import "server-only";

import { createAdminClient } from "../supabase/admin";
import {
  isSignupPolicyAcceptanceValid,
  SIGNUP_POLICIES,
  type SignupPolicyAcceptanceInput,
} from "./config";

export class SignupPolicyAcceptanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SignupPolicyAcceptanceError";
  }
}

export type SignupPolicyAcceptanceResult = {
  termsAccepted: boolean;
  age14Accepted: boolean;
};

export async function isSignupPolicyComplete(userId: string): Promise<boolean> {
  if (!userId || !SIGNUP_POLICIES.TERMS.enforceable || !SIGNUP_POLICIES.AGE_14_PLUS.enforceable) {
    return false;
  }

  try {
    const { data, error } = await createAdminClient()
      .from("policy_acceptance_events")
      .select("policy_type, policy_version")
      .eq("user_id", userId)
      .in("policy_type", [SIGNUP_POLICIES.TERMS.type, SIGNUP_POLICIES.AGE_14_PLUS.type]);

    if (error || !data) return false;

    const accepted = new Set(data.map((event) => `${event.policy_type}:${event.policy_version}`));
    return accepted.has(`${SIGNUP_POLICIES.TERMS.type}:${SIGNUP_POLICIES.TERMS.version}`) &&
      accepted.has(`${SIGNUP_POLICIES.AGE_14_PLUS.type}:${SIGNUP_POLICIES.AGE_14_PLUS.version}`);
  } catch {
    return false;
  }
}

/**
 * Records the required signup policy pair after a server-owned Auth operation
 * has returned the new user ID. The RPC inserts both events in one database
 * transaction and is idempotent for the configured policy versions.
 */
export async function recordSignupPolicyAcceptance(
  userId: string,
  input: SignupPolicyAcceptanceInput,
): Promise<SignupPolicyAcceptanceResult> {
  if (!userId || !isSignupPolicyAcceptanceValid(input)) {
    throw new SignupPolicyAcceptanceError("SIGNUP_POLICY_ACCEPTANCE_INVALID");
  }

  const { data, error } = await createAdminClient().rpc("record_signup_policy_acceptance", {
    p_user_id: userId,
    p_terms_version: SIGNUP_POLICIES.TERMS.version,
    p_age_policy_version: SIGNUP_POLICIES.AGE_14_PLUS.version,
  });

  if (error || !data) {
    throw new SignupPolicyAcceptanceError("SIGNUP_POLICY_ACCEPTANCE_FAILED");
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.terms_accepted || !result?.age_14_accepted) {
    throw new SignupPolicyAcceptanceError("SIGNUP_POLICY_ACCEPTANCE_INCOMPLETE");
  }

  return {
    termsAccepted: result.terms_accepted,
    age14Accepted: result.age_14_accepted,
  };
}
