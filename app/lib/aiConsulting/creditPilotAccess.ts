/**
 * Exact-account, fail-closed production LIVE question-credit pilot.
 * This pure config predicate is shared by order entry and partial refunds.
 * Never infer approval from public report checkout alone.
 */
const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function hasAccount(list: string | undefined, userId: string): boolean {
  return (list ?? "").split(",").some((id) => id.trim().toLowerCase() === userId.toLowerCase());
}

export function isAiCreditLivePilotAllowed(userId: string): boolean {
  return process.env.NODE_ENV === "production"
    && process.env.TOSS_HYBRID_ROUTING_ENABLED === "true"
    && process.env.TOSS_LIVE_CHECKOUT_ENABLED === "true"
    && process.env.TOSS_LIVE_PILOT_ENABLED === "true"
    && process.env.AI_CREDIT_LIVE_PILOT_ENABLED === "true"
    && process.env.AI_CREDIT_REFUND_PILOT_ENABLED === "true"
    && UUID.test(userId)
    && hasAccount(process.env.TOSS_LIVE_PILOT_ACCOUNT_IDS, userId)
    && hasAccount(process.env.AI_CREDIT_REFUND_PILOT_ACCOUNT_IDS, userId);
}
