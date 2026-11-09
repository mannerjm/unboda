#!/usr/bin/env node
/**
 * UNBODA LIFESTYLE scheduling orchestration, with NO hardcoded credentials.
 * This module cannot independently schedule: inject a secure claim ledger and
 * a Metricool adapter that performs an authenticated single POST.
 *
 * Workflow:
 * - Verify a trusted server-side zero-post preflight release (not a client input).
 * - Independently read the provider's complete day/slot state.
 * - Atomically claim a slot in persistent DB; conflict is terminal.
 * - Commit 'posting' to DB BEFORE attempting provider's POST.
 * - Exactly one provider request, NO retries on timeout or unknown status.
 * - Re-read provider; 'PENDING' only means scheduled, not published.
 * - Never change/delete an existing Metricool post.
 */
const SLOT_NETWORKS=Object.freeze({
 "01":"facebook","04":"instagram","10":"threads",
 "13":"facebook","16":"instagram","19":"threads","22":"facebook"
});
const ALLOWED_NETWORKS=new Set(Object.values(SLOT_NETWORKS));
const KST_SUFFIX="+09:00";
export function expectedUtcTime(day,hour){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Object.hasOwn(SLOT_NETWORKS,hour))
  throw Error("INVALID_KST_SLOT");
 const utc=Date.parse(day+"T"+hour+":00:00"+KST_SUFFIX);
 if(!Number.isFinite(utc))throw Error("INVALID_KST_DATE");
 return utc;
}
function validateBatch(batch){
 if(!batch||batch.state!=="PREFLIGHT_GATES_PASSED_NOT_PUBLISHED"||
   batch.ready!==true||batch.publishAttempted!==false||
   !/^\d{4}-\d{2}-\d{2}$/.test(batch.dateKst)||
   !Array.isArray(batch.prepared)||batch.prepared.length!==7)
  throw Error("TRUSTED_SIGNED_PREFLIGHT_RELEASE_REQUIRED");
 const slots=new Set();
 const topics=new Set();
 const photos=new Set();
 for(const post of batch.prepared){
  if(post.dateKst!==batch.dateKst||SLOT_NETWORKS[post.hourKst]!==post.network||
      !ALLOWED_NETWORKS.has(post.network)||!post.photoSha256?.match(/^[a-f0-9]{64}$/)||
      !/^[a-f0-9]{16}$/.test(post.photoPhash??"")||
      !post.photoSourcePage?.startsWith("https://commons.wikimedia.org/")||
      typeof post.photoAttribution!=="string"||
      !post.mediaUrl?.startsWith("https://")||!post.caption||post.captionLength>450||
      [...post.caption].length!==post.captionLength||!post.topicKey)
   throw Error("INVALID_PREPARED_POST_OR_NETWORK");
  const key=post.hourKst+":"+post.network;
  if(slots.has(key)||topics.has(post.topicKey)||photos.has(post.photoSha256))
   throw Error("SLOT_TOPIC_OR_PHOTO_DUPLICATED_IN_RELEASE");
  slots.add(key);topics.add(post.topicKey);photos.add(post.photoSha256);
 }
 if(slots.size!==7)throw Error("INCOMPLETE_REQUIRED_SEVEN_SLOTS");
 return true;
}
export async function scheduleSeven({
 trustedRelease,claimStore,metricool,dryRun=true,publishEnabled=false,
 nowMs=Date.now(),brandId="7377653"
}){
 validateBatch(trustedRelease);
 if(!claimStore?.tryClaim||!claimStore?.markPosting||
    !claimStore?.markScheduled||!claimStore?.markUnknown||
    !metricool?.readSlot||!metricool?.submitOnce||!metricool?.verifyScheduled)
  throw Error("CLAIM_STORE_AND_METRICOOL_IMPLEMENTATION_REQUIRED");
 if(brandId!=="7377653")throw Error("UNEXPECTED_METRICOOL_BRAND");
 if(!Number.isFinite(nowMs))throw Error("INVALID_CLOCK");
 const report={state:"NO_POST_ATTEMPTED",dateKst:trustedRelease.dateKst,
  dryRun,results:[],postRequests:0,confirmedReservations:0,
  noAutomaticRetry:true};
 for(const post of trustedRelease.prepared){
  const key=post.dateKst+"|"+post.hourKst+"|"+post.network;
  const target=expectedUtcTime(post.dateKst,post.hourKst);
  if(nowMs>=target-30*60000){
   report.results.push({key,state:"LATE_SLOT_BLOCKED"});continue
  }
  let prior;
  try{prior=await metricool.readSlot(post)}catch{
   report.results.push({key,state:"PRE_POST_READBACK_UNAVAILABLE"});continue
  }
  // The adapter must return the COMPLETE state (PENDING, ERROR, DRAFT, POSTED).
  // A filtered "scheduled only" list is insufficient for safe idempotency.
  if(!prior||prior.complete!==true||!Array.isArray(prior.posts)){
   report.results.push({key,state:"INCOMPLETE_PROVIDER_QUEUE_READ"});continue
  }
  if(prior.posts.length>0){
   report.results.push({key,state:"EXISTING_POST_ANY_STATUS_SKIP"});continue
  }
  if(dryRun){
   report.results.push({key,state:"DRY_RUN_READY_NO_CLAIM"});continue
  }
  if(!publishEnabled){
   report.results.push({key,state:"PUBLISH_FLAG_DISABLED"});continue
  }
  let claim;
  try{
   claim=await claimStore.tryClaim({key,dateKst:post.dateKst,
    hourKst:post.hourKst,network:post.network,
    content:post.caption,mediaSha256:post.photoSha256,
    imagePhash:post.photoPhash,sourcePage:post.photoSourcePage,
    attribution:post.photoAttribution});
  }catch{
   report.results.push({key,state:"CLAIM_DB_UNAVAILABLE_NO_POST"});continue
  }
  if(claim?.created!==true||!claim?.claimToken){
   report.results.push({key,state:"SLOT_ALREADY_CLAIMED_NO_POST"});continue
  }
  try{await claimStore.markPosting({key,claimToken:claim.claimToken})}
  catch{
   report.results.push({key,state:"DURABLE_PRE_POST_STATE_FAILED_NO_POST"});continue
  }
  let providerResult;
  report.postRequests++;
  try{
   providerResult=await metricool.submitOnce({
    brandId,publicationDate:{dateTime:post.dateKst+"T"+post.hourKst+":00:00",
     timezone:"Asia/Seoul"},date:post.dateKst+"T"+post.hourKst+":00:00+09:00",
    network:post.network, text:post.caption, mediaUrl:post.mediaUrl,
    topicKey:post.topicKey,slotKey:key,
    autoPublish:true,draft:false
   });
  }catch{
   try{await claimStore.markUnknown({key,claimToken:claim.claimToken,reason:"POST_MAY_HAVE_SUCCEEDED"})}
   catch{/* leave claim as posting: never automatically resubmit */}
   report.results.push({key,state:"POST_RESPONSE_UNKNOWN_NEVER_RETRY"});continue
  }
  let after;
  try{after=await metricool.readSlot(post)}
  catch{
   try{await claimStore.markUnknown({key,claimToken:claim.claimToken,reason:"POST_READBACK_UNAVAILABLE"})}
   catch{}
   report.results.push({key,state:"READBACK_UNKNOWN_NEVER_RETRY"});continue
  }
  let verified=false;
  try{verified=after?.complete===true&&Array.isArray(after.posts)&&
      after.posts.length===1&&
      await metricool.verifyScheduled(post,after.posts[0],providerResult)}
  catch{verified=false}
  if(!verified){
   try{await claimStore.markUnknown({key,claimToken:claim.claimToken,reason:"WRONG_OR_MISSING_POST_IN_READBACK"})}
   catch{}
   report.results.push({key,state:"PENDING_NOT_CONFIRMED_NEVER_RETRY"});continue
  }
  try{await claimStore.markScheduled({key,claimToken:claim.claimToken,
    providerPostId:after.posts[0].id})}
  catch{
   report.results.push({key,state:"POST_EXISTS_DB_READBACK_FAILED_NO_RETRY"});continue
  }
  report.confirmedReservations++;
  report.results.push({key,state:"METRICOOL_PENDING_CONFIRMED_NOT_PUBLISHED",postId:after.posts[0].id});
 }
 report.state=report.results.every(x=>x.state==="METRICOOL_PENDING_CONFIRMED_NOT_PUBLISHED")?
  "SEVEN_RESERVATIONS_CONFIRMED_NOT_PUBLISHED":
  "PARTIAL_OR_BLOCKED_NO_BLIND_RETRIES";
 return report;
}
