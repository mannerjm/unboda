import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { getAllMagazineReviewEntries, getPublishedMagazineArticles } from "../app/lib/magazine";

// Read-only editorial inventory; never creates/publishes content or calls paid APIs.
const DAY = 86400000;
const now = new Date();
const all = getAllMagazineReviewEntries();
function check(at: Date) {
  assert(Number.isFinite(at.getTime()), "Invalid clock");
  assert(all.length >= 3 && all.length <= 1000);
  assert.equal(new Set(all.map(a=>a.slug)).size,all.length,"Duplicate slugs");
  assert.equal(new Set(all.map(a=>a.topicKey)).size,all.length,"Duplicate topics");
  const published=getPublishedMagazineArticles(at);
  const publishedSlugs=new Set(published.map(a=>a.slug));
  const due=all.filter(a=>a.approvedForPublication && Date.parse(a.publishedAt)<=at.getTime());
  assert(due.every(a=>publishedSlugs.has(a.slug)),"Approved due article did not pass public gate");
  assert(published.every(a=>Date.parse(a.publishedAt)<=at.getTime()),"Early publication");
  const future=all.filter(a=>a.approvedForPublication && a.originalArtwork && Date.parse(a.publishedAt)>at.getTime())
    .sort((a,b)=>Date.parse(a.publishedAt)-Date.parse(b.publishedAt));
  const upcoming=future.filter(a=>Date.parse(a.publishedAt)<=at.getTime()+21*DAY);
  return {reviewed:all.length,published:published.length,futureApproved:future.length,
    upcoming21Days:upcoming.length,queueLow:upcoming.length<2,next:future[0]?.publishedAt??null};
}
if(process.argv.includes("--self-test")){
  assert(!getPublishedMagazineArticles(new Date("2026-10-29T19:00:00+09:00")).some(a=>a.slug==="money-fortune-budget-review"));
  assert(getPublishedMagazineArticles(new Date("2026-10-31T10:00:00+09:00")).some(a=>a.slug==="money-fortune-budget-review"));
  assert(check(new Date("2026-10-29T19:00:00+09:00")).reviewed>=3);
  console.log("MAGAZINE_QUEUE_SELF_TEST_PASS");
}else{
  const result=check(now);
  console.log("MAGAZINE_EDITORIAL_QUEUE_STATUS",JSON.stringify(result));
  if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,
    "queue_low="+String(result.queueLow)+"\n"+"upcoming="+result.upcoming21Days+"\n");
}