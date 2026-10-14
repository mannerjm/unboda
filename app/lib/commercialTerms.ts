/** Commercial time windows are measured from the actual paid purchase timestamp.
 * Never infer a new expiry for an older purchase: legacy purchases are explicitly null.
 * The server-stored purchase terms, not this helper, determine whether the policy applies.
 */
export const PAID_SERVICE_TERM_MONTHS = 12 as const;

export function addPaidServiceMonths(paidAt: string): string {
  const date = new Date(paidAt);
  if (!Number.isFinite(date.getTime())) throw new Error("INVALID_PAID_AT");
  const originalDay = date.getUTCDate();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + PAID_SERVICE_TERM_MONTHS;
  const monthStart = new Date(Date.UTC(year, month, 1, date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()));
  // Clamp at end of target month. Jan 31 -> Feb 28/29, never Mar 2/3.
  const lastDay = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
  monthStart.setUTCDate(Math.min(originalDay, lastDay));
  return monthStart.toISOString();
}

export function hasPaidServiceExpired(expiresAt: string | null | undefined, asOf = Date.now()): boolean {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= asOf);
}

export function getUnusedQuestionRefundKrw(input: {
  paidAmount: number;
  purchasedCount: number;
  consumedCount: number;
}): number {
  const { paidAmount, purchasedCount, consumedCount } = input;
  if (![paidAmount, purchasedCount, consumedCount].every(Number.isSafeInteger)
    || paidAmount <= 0 || purchasedCount <= 0 || consumedCount < 0 || consumedCount > purchasedCount) {
    throw new Error("INVALID_CREDIT_REFUND_INPUT");
  }
  // One refund for all remaining questions in a bundle; integer KRW, round down.
  return Math.floor(paidAmount * (purchasedCount - consumedCount) / purchasedCount);
}
