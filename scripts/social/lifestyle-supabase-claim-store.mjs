#!/usr/bin/env node
/**
 * UNBODA isolated server-only Supabase/PostgREST idempotency adapter.
 * Uses the staging schema installed in xdiitqyysmhicjcytckm.
 * Service-role credentials MUST be injected server-side, never in a browser.
 *
 * No DDL, no social API calls, no deletion; the returned store is for the
 * one-shot lifestyle scheduler after complete real-photo safety approval.
 */
import {createHash} from "node:crypto";
const STAGING_REF="xdiitqyysmhicjcytckm";
const PROD_REFS=new Set(["hbwzsyhacwtyaktoznrz","eiyvdmorqclirvidihlm"]);
function refOf(url){
 const u=new URL(url);
 if(u.protocol!=="https:"||!u.hostname.endsWith(".supabase.co"))
  throw Error("UNTRUSTED_SUPABASE_ORIGIN");
 return u.hostname.split(".")[0];
}
const KST_SLOT=/^(\d{4}-\d{2}-\d{2})\|(01|04|10|13|16|19|22)\|(facebook|instagram|threads)$/;
export function createOneShotSupabaseClaimStore({
 projectUrl,serviceKey,fetcher=fetch,allowProduction=false,productionSchemaVerified=false
}={}){
 const ref=refOf(projectUrl);
 if(ref!==STAGING_REF && !(allowProduction===true&&productionSchemaVerified===true&&PROD_REFS.has(ref)))
  throw Error("PRODUCTION_SOCIAL_CLAIM_CONNECTION_DISABLED");
 if(typeof serviceKey!=="string"||serviceKey.length<20)
  throw Error("SERVER_SIDE_SERVICE_ROLE_KEY_REQUIRED");
 if(typeof fetcher!=="function")throw Error("FETCHER_REQUIRED");
 async function request(table,method,qs,body,prefer){
  const url=new URL("/rest/v1/"+table,projectUrl);
  for(const [k,v] of Object.entries(qs??{}))url.searchParams.set(k,v);
  const headers={"apikey":serviceKey,"Authorization":"Bearer "+serviceKey,
   "Content-Type":"application/json","Accept":"application/json"};
  if(prefer)headers.Prefer=prefer;
  const response=await fetcher(url.toString(),{
   method,headers,body:body===undefined?undefined:JSON.stringify(body)
  });
  if(!response||!response.ok)throw Error("STAGING_CLAIM_STORE_HTTP_ERROR");
  const result=await response.json();
  if(!Array.isArray(result))throw Error("STAGING_CLAIM_STORE_MALFORMED");
  return result;
 }
 function check(o){
  if(!KST_SLOT.test(o?.key??"")||o.key!==
    o.dateKst+"|"+o.hourKst+"|"+o.network)
   throw Error("INVALID_KST_UNIQUE_CLAIM_KEY");
  if(!/^[a-f0-9]{64}$/.test(o.mediaSha256??"")||
     !/^[a-f0-9]{16}$/.test(o.imagePhash??"")||
     !o.sourcePage?.startsWith("https://commons.wikimedia.org/")||
     typeof o.attribution!=="string"||typeof o.content!=="string")
   throw Error("UNVERIFIED_MEDIA_DIGEST_SOURCE_OR_CAPTION");
 }
 const slotParams=({dateKst,hourKst,network},extra={})=>({
   slot_date:"eq."+dateKst,slot_hour:"eq."+Number(hourKst),
   network:"eq."+network,...extra,select:"claim_token"
 });
 return {
  async tryClaim(o){
   check(o);
   const contentHash=createHash("sha256").update(o.content).digest("hex");
   const [claim]=await request("unboda_social_lifestyle_claims","POST",
    {on_conflict:"slot_date,slot_hour,network",select:"claim_token"},
    {slot_date:o.dateKst,slot_hour:Number(o.hourKst),
     network:o.network,content_sha256:contentHash,media_sha256:o.mediaSha256},
    "resolution=ignore-duplicates,return=representation");
   if(!claim?.claim_token)return {created:false};
   // This is conservative: already-reserved media also blocks the new slot.
   // A failed ledger reservation intentionally does not release the unique
   // claim. Retrying without a full provider audit would risk duplicate posts.
   const [usage]=await request("unboda_social_lifestyle_media_usage","POST",
    {on_conflict:"media_sha256",select:"media_sha256"},
    {media_sha256:o.mediaSha256,image_phash:o.imagePhash,
     slot_date:o.dateKst,slot_hour:Number(o.hourKst),network:o.network,
     attribution:o.attribution,source_page:o.sourcePage},
    "resolution=ignore-duplicates,return=representation");
   if(!usage?.media_sha256)throw Error("MEDIA_ALREADY_RESERVED_NEVER_REUSE");
   return {created:true,claimToken:claim.claim_token};
  },
  async markPosting({key,claimToken}){
   const p=parts(key,claimToken);
   const rows=await request("unboda_social_lifestyle_claims","PATCH",
    slotParams(p,{claim_token:"eq."+claimToken,state:"eq.claimed"}),
    {state:"posting",attempted_at:new Date().toISOString(),
     updated_at:new Date().toISOString()},"return=representation");
   if(rows.length!==1)throw Error("POSTING_TRANSITION_NOT_ATOMIC");
  },
  async markScheduled({key,claimToken,providerPostId}){
   const p=parts(key,claimToken);
   if(!Number.isSafeInteger(Number(providerPostId))||Number(providerPostId)<=0)
    throw Error("METRICOOL_PROVIDER_ID_REQUIRED");
   const rows=await request("unboda_social_lifestyle_claims","PATCH",
    slotParams(p,{claim_token:"eq."+claimToken,state:"eq.posting"}),
    {state:"scheduled",metricool_post_id:Number(providerPostId),
     last_verified_at:new Date().toISOString(),updated_at:new Date().toISOString()},
    "return=representation");
   if(rows.length!==1)throw Error("SCHEDULED_TRANSITION_NOT_ATOMIC");
  },
  async markUnknown({key,claimToken}){
   const p=parts(key,claimToken);
   const rows=await request("unboda_social_lifestyle_claims","PATCH",
    slotParams(p,{claim_token:"eq."+claimToken,state:"eq.posting"}),
    {state:"error_unknown",last_verified_at:new Date().toISOString(),
     updated_at:new Date().toISOString()},"return=representation");
   if(rows.length!==1)throw Error("UNKNOWN_TRANSITION_NOT_ATOMIC");
  }
 };
}
function parts(key,claimToken){
 const m=String(key??"").match(KST_SLOT);
 if(!m||typeof claimToken!=="string"||
    !/^[a-f0-9-]{20,60}$/i.test(claimToken))
  throw Error("UNVERIFIED_CLAIM_TOKEN_OR_SLOT");
 return {dateKst:m[1],hourKst:m[2],network:m[3]};
}
