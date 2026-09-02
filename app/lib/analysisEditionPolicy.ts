import { getLaunchProductIds } from "./paidAnalysisTopicConfig";

/**
 * Operational policy vocabulary for time-aware paid-analysis editions.
 * See STEP 57D-48F. No DAILY policy: daily luck is a dynamic supplemental
 * context layer, never a paid-edition boundary.
 */
export type AnalysisEditionPolicy =
  | "MONTHLY"
  | "YEARLY"
  | "TARGET_MONTH"
  | "TARGET_YEAR"
  | "ROLLING_MULTIYEAR"
  | "DAEUN"
  | "LIFETIME";

const ALLOWED_POLICIES: ReadonlySet<AnalysisEditionPolicy> = new Set([
  "MONTHLY",
  "YEARLY",
  "TARGET_MONTH",
  "TARGET_YEAR",
  "ROLLING_MULTIYEAR",
  "DAEUN",
  "LIFETIME",
]);

/**
 * Operational policy mapping, not immutable historical truth: changing a
 * product's policy here only affects FUTURE edition computation. Previously
 * persisted analysis_edition_key values are never rewritten retroactively.
 */
const ANALYSIS_EDITION_POLICY_BY_PRODUCT_ID: Readonly<Record<string, AnalysisEditionPolicy>> = {
  // TOPIC — career
  "career": "YEARLY",
  "career-job-change": "MONTHLY",
  "career-job-fit": "LIFETIME",
  "career-specialization": "YEARLY",
  "career-promotion-readiness": "MONTHLY",
  "career-workplace-adaptation": "MONTHLY",
  "career-leadership-readiness": "MONTHLY",
  "career-freelance-transition": "MONTHLY",
  "career-workload-recovery": "MONTHLY",
  "career-workplace-relationships": "MONTHLY",

  // TOPIC — money
  "wealth": "YEARLY",
  "money-wealth-accumulation": "YEARLY",
  "money-leak-risk": "MONTHLY",
  "money-saving-discipline": "MONTHLY",
  "money-income-stability": "YEARLY",
  "money-debt-repayment": "YEARLY",
  "money-emergency-buffer": "YEARLY",
  "money-shared-finance": "YEARLY",
  "money-contract-commitment": "MONTHLY",
  "money-spending-decision": "MONTHLY",

  // TOPIC — relationship
  "relationship": "YEARLY",
  "relationship-long-distance": "YEARLY",
  "relationship-unrequited": "MONTHLY",
  "relationship-current": "MONTHLY",
  "relationship-marriage": "YEARLY",
  "relationship-partner-pattern": "LIFETIME",
  "relationship-new-connection": "MONTHLY",
  "relationship-intimacy": "YEARLY",
  "relationship-conflict": "MONTHLY",
  "relationship-boundary": "YEARLY",
  "relationship-reunion": "MONTHLY",

  // TOPIC — social
  "relationship-friendship": "YEARLY",
  "relationship-family-role": "YEARLY",

  // TOPIC — health
  "health-energy-recovery": "MONTHLY",
  "health-sleep-rhythm": "MONTHLY",
  "health-stress-regulation": "MONTHLY",
  "health-burnout-risk": "MONTHLY",
  "health-habit-continuity": "MONTHLY",
  "health-body-signal-review": "MONTHLY",

  // TOPIC — growth (study)
  "study-learning-strategy": "YEARLY",
  "study-exam-preparation": "YEARLY",
  "study-focus-routine": "MONTHLY",
  "study-credential-decision": "YEARLY",

  // TOPIC — business
  "business-startup-readiness": "YEARLY",
  "business-expansion-control": "YEARLY",
  "business-client-relationship": "MONTHLY",
  "business-team-management": "MONTHLY",

  // PERIOD
  "monthly-current": "TARGET_MONTH",
  "monthly-next": "TARGET_MONTH",
  "yearly-current": "TARGET_YEAR",
  "annual-next": "TARGET_YEAR",
  "annual-3years": "ROLLING_MULTIYEAR",
  "daeun-current": "DAEUN",
  "lifetime-overview": "LIFETIME",
};

/**
 * Resolves the edition policy for a canonical, launch-sale product.
 * Fails closed: unknown or non-launch productIds resolve to null. Historical
 * canonical (non-launch) lookups are a separate concern and untouched here.
 */
export function getAnalysisEditionPolicy(productId: string): AnalysisEditionPolicy | null {
  if (!getLaunchProductIds().includes(productId)) {
    return null;
  }

  const policy = ANALYSIS_EDITION_POLICY_BY_PRODUCT_ID[productId];

  return policy && ALLOWED_POLICIES.has(policy) ? policy : null;
}

/** Exposed for exhaustive validation in regression tests only. */
export function getConfiguredEditionPolicyProductIds(): readonly string[] {
  return Object.keys(ANALYSIS_EDITION_POLICY_BY_PRODUCT_ID);
}
