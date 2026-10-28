import test from "node:test";
import assert from "node:assert/strict";
import {authorizeEstimatedSpend} from "./budget.mjs";
const base={estimatedCents:200,approvedMonthlyLimitCents:1000,spentCents:300,
 reservedCents:100,budgetLockAcquired:true,subscriptionConfirmed:true};
test("monthly spending must be explicitly approved",()=>{
 assert.ok(authorizeEstimatedSpend({...base,approvedMonthlyLimitCents:0})
  .reasons.includes("MONTHLY_BUDGET_NOT_APPROVED"));
 assert.ok(authorizeEstimatedSpend({...base,approvedMonthlyLimitCents:undefined})
  .reasons.includes("MONTHLY_BUDGET_NOT_APPROVED"));
});
test("must lock budget and verify provider subscription",()=>{
 assert.ok(authorizeEstimatedSpend({...base,budgetLockAcquired:false})
  .reasons.includes("BUDGET_LOCK_REQUIRED"));
 assert.ok(authorizeEstimatedSpend({...base,subscriptionConfirmed:false})
  .reasons.includes("PROVIDER_PLAN_NOT_VERIFIED"));
});
test("spent and pending costs together count toward cap",()=>{
 assert.equal(authorizeEstimatedSpend(base).authorized,true);
 assert.equal(authorizeEstimatedSpend(base).remainingCents,400);
 assert.ok(authorizeEstimatedSpend({...base,estimatedCents:601})
  .reasons.includes("MONTHLY_BUDGET_CAP_EXCEEDED"));
});
test("malformed costs can never authorize paid call",()=>{
 assert.equal(authorizeEstimatedSpend({...base,estimatedCents:1.3}).authorized,false);
 assert.equal(authorizeEstimatedSpend({...base,reservedCents:-1}).authorized,false);
});
