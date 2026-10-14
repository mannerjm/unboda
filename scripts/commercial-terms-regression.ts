import { addPaidServiceMonths, getUnusedQuestionRefundKrw, hasPaidServiceExpired } from "../app/lib/commercialTerms";

function assert(condition: boolean, label: string): void {
  if (!condition) throw new Error(label);
}
assert(addPaidServiceMonths("2026-10-14T08:00:00.000Z") === "2027-10-14T08:00:00.000Z", "12 month anniversary");
assert(addPaidServiceMonths("2028-02-29T08:00:00.000Z") === "2029-02-28T08:00:00.000Z", "leap day clamping");
assert(!hasPaidServiceExpired(null), "legacy purchase never expires by default");
assert(!hasPaidServiceExpired("2027-10-14T08:00:00.000Z", Date.parse("2027-10-14T07:59:59.000Z")), "valid before expiry");
assert(hasPaidServiceExpired("2027-10-14T08:00:00.000Z", Date.parse("2027-10-14T08:00:00.000Z")), "expired at exact deadline");
assert(getUnusedQuestionRefundKrw({paidAmount:8500,purchasedCount:10,consumedCount:3})===5950, "10 pack refund");
assert(getUnusedQuestionRefundKrw({paidAmount:2900,purchasedCount:3,consumedCount:1})===1933, "3 pack rounding");
assert(getUnusedQuestionRefundKrw({paidAmount:8500,purchasedCount:10,consumedCount:10})===0, "fully used");
console.log("commercial terms regression passed");
