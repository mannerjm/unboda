// Mandatory spending gate for future paid AI providers.
// No expenses are incurred here. Amounts are integer USD cents.
export function authorizeEstimatedSpend({
 estimatedCents,approvedMonthlyLimitCents,spentCents,reservedCents=0,
 budgetLockAcquired=false,subscriptionConfirmed=false
}){
 const reasons=[];
 for(const [key,val] of Object.entries({estimatedCents,approvedMonthlyLimitCents,spentCents,reservedCents})){
  if(!Number.isSafeInteger(val)||val<0)reasons.push("INVALID_"+key.toUpperCase());
 }
 if(approvedMonthlyLimitCents==null||approvedMonthlyLimitCents===0)
  reasons.push("MONTHLY_BUDGET_NOT_APPROVED");
 if(!budgetLockAcquired)reasons.push("BUDGET_LOCK_REQUIRED");
 if(!subscriptionConfirmed)reasons.push("PROVIDER_PLAN_NOT_VERIFIED");
 if(reasons.length)return {authorized:false,reasons:[...new Set(reasons)]};
 if(spentCents+reservedCents+estimatedCents>approvedMonthlyLimitCents)
  return {authorized:false,reasons:["MONTHLY_BUDGET_CAP_EXCEEDED"]};
 return {authorized:true,reasons:[],remainingCents:
  approvedMonthlyLimitCents-spentCents-reservedCents-estimatedCents};
}
