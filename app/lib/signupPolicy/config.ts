import "server-only";

export const SIGNUP_POLICY_TYPES = {
  TERMS: "TERMS",
  AGE_14_PLUS: "AGE_14_PLUS",
} as const;

export type SignupPolicyType = typeof SIGNUP_POLICY_TYPES[keyof typeof SIGNUP_POLICY_TYPES];

type SignupPolicyDefinition = {
  type: SignupPolicyType;
  version: string;
  enforceable: boolean;
};

export const SIGNUP_POLICIES: Readonly<Record<SignupPolicyType, SignupPolicyDefinition>> = {
  TERMS: {
    type: SIGNUP_POLICY_TYPES.TERMS,
    version: "TERMS_V1",
    enforceable: true,
  },
  AGE_14_PLUS: {
    type: SIGNUP_POLICY_TYPES.AGE_14_PLUS,
    version: "AGE_14_PLUS_V1",
    enforceable: true,
  },
};

export type SignupPolicyAcceptanceInput = {
  termsAccepted: boolean;
  termsVersion: string;
  age14OrOlderConfirmed: boolean;
  agePolicyVersion: string;
};

export function isSignupPolicyAcceptanceValid(input: SignupPolicyAcceptanceInput): boolean {
  return input.termsAccepted === true &&
    input.age14OrOlderConfirmed === true &&
    input.termsVersion === SIGNUP_POLICIES.TERMS.version &&
    input.agePolicyVersion === SIGNUP_POLICIES.AGE_14_PLUS.version;
}
