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
