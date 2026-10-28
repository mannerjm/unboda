// Backend interface for durable candidate staging.
// No remote API calls or production writes are implemented here.
// A future Supabase worker must implement atomic UNIQUE(job_key) claim and
// transaction-safe getRecentTopicKeys / updateJob to prevent two cron runs
// from charging for the same creative.
import {generateEditorialCandidate} from "./creative.mjs";
import {authorizeEstimatedSpend} from "./budget.mjs";
export async function stageEditorialCandidate({job,ledger,generator,budget,
 estimatedCents=null,slotIndex=0}){
 if(!job||job.state!=="CANDIDATE_ONLY"||!job.jobKey||!job.kind)
  return {state:"BLOCKED",reason:"VALID_SCHEDULE_JOB_REQUIRED"};
 if(!ledger||typeof ledger.claimJob!=="function"||
    typeof ledger.readRecentTopicKeys!=="function"||
    typeof ledger.saveCandidate!=="function")
  return {state:"BLOCKED",reason:"DURABLE_LEDGER_NOT_CONNECTED"};
 if(typeof generator!=="function")
  return {state:"BLOCKED",reason:"GENERATOR_NOT_CONNECTED"};
 const spending=authorizeEstimatedSpend({
  ...budget,estimatedCents
 });
 if(!spending.authorized)return {state:"BLOCKED",reason:spending.reasons};
 // A production ledger must transactionally reserve the specified budget
 // together with claiming the job. A false claim means another worker won.
 const claimed=await ledger.claimJob({jobKey:job.jobKey,
  estimatedCents,monthlyBudget:budget.approvedMonthlyLimitCents});
 if(!claimed)return {state:"ALREADY_CLAIMED",jobKey:job.jobKey};
 try{
  const recentTopicKeys=await ledger.readRecentTopicKeys();
  if(!Array.isArray(recentTopicKeys))throw Error("VERIFIED_TOPIC_HISTORY_REQUIRED");
  const result=await generateEditorialCandidate({
   kind:job.kind,slotIndex,recentTopicKeys,generator
  });
  await ledger.saveCandidate({jobKey:job.jobKey,topicKey:result.brief?.topicKey??null,
   state:result.state,draft:result.draft??null,
   validation:result.validation??null,reason:result.reason??null});
  return {state:result.state,jobKey:job.jobKey,topicKey:result.brief?.topicKey,
   validation:result.validation};
 }catch(error){
  await ledger.saveCandidate({jobKey:job.jobKey,state:"BLOCKED",draft:null,
   reason:"CANDIDATE_WORKER_EXCEPTION"});
  return {state:"BLOCKED",reason:"CANDIDATE_WORKER_EXCEPTION"};
 }
}
