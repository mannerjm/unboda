// Validates four DIFFERENT KST video candidates and stays review-only.
// Static episode fixtures are an integration capacity test, NOT an AI generator.
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {contentSimilarity} from '../lifestyle-autogenerator.mjs';
import {FOUR_KST_TIMES,reviewLifestyleVideoScript} from '../lifestyle-video-planner.mjs';
const HERE=dirname(fileURLToPath(import.meta.url));
const manifestFile=join(HERE,'four-daily-private-manifest.json');
const fail=(reason)=>({state:'BLOCKED',reason,published:false,mediaReady:false});
export function inspectPrivateFourSlotManifest(manifest,readBrief){
 if(manifest?.schemaVersion!==1||manifest?.mode!=='PRIVATE_REVIEW_ONLY'||
  manifest?.noAutomaticPublishing!==true||manifest?.paidProviderCallsAllowed!==false||
  manifest?.mediaRightsReviewed!==false||manifest?.verified90DayPublicHistory!==false||
  manifest?.scheduledProductionActivation!==false)
  return fail('PRIVATE_PUBLICATION_COST_AND_RIGHTS_LOCK_REQUIRED');
 if(!Array.isArray(manifest.slots)||manifest.slots.length!==4||
  typeof readBrief!=='function')return fail('FOUR_PRIVATE_KST_SLOTS_REQUIRED');
 const keys=new Set(),topicKeys=new Set(),firstFrameArts=new Set(),openings=[],scenes=[],list=[];
 for(const row of manifest.slots){
  if(!row||!FOUR_KST_TIMES.includes(row.kst)||keys.has(row.kst)||
   typeof row.brief!=='string'||!/^episodes\/[a-z0-9-]+\.json$/.test(row.brief))
   return fail('INVALID_KST_SLOT_OR_BRIEF_PATH');
  keys.add(row.kst);
  let brief;
  try{brief=readBrief(row.brief)}catch{return fail('EPISODE_READ_FAILED')}
  if(brief?.schemaVersion!==1||brief.automatedPublicationAllowed!==false||
   brief.licenseReviewRequired!==true||brief.voiceHumanReviewRequired!==true||
   !/^[a-z0-9][a-z0-9:_-]{7,99}$/.test(brief?.topicKey??'')||
   topicKeys.has(brief.topicKey))
   return fail('EPISODE_RIGHTS_OR_TOPIC_NOT_UNIQUE');
  topicKeys.add(brief.topicKey);
  if(!Array.isArray(brief.narrationDraft)||brief.narrationDraft.length!==4||
   !Array.isArray(brief.scenes)||brief.scenes.length!==4||
   !Array.isArray(brief.visualConcepts)||brief.visualConcepts.length!==4||
   brief.scenes.some(s=>!Array.isArray(s.headline)||s.headline.length!==2))
   return fail('FOUR_DIFFERENT_MEDIA_SCENES_REQUIRED');
  // Shorts/Reels cover art may not reuse the exact same hero illustration
  // in a four-video daily review batch, or followers see four identical tiles.
  const firstArt=brief.scenes[0]?.illustration;
  if(!['clock','message','notes','rest'].includes(firstArt)||
     firstFrameArts.has(firstArt))
   return fail('DUPLICATE_OR_MISSING_VIDEO_FIRST_FRAME_ART');
  firstFrameArts.add(firstArt);
  const editorial=reviewLifestyleVideoScript(brief);
  if(!editorial.ok||!brief.narrationDraft[0].startsWith(brief.situation))
   return fail('EDITORIAL_QUALITY_OR_OPENING_INVALID');
  if(openings.some(x=>contentSimilarity(x,brief.narrationDraft[0])>=.74)||
   scenes.some(x=>contentSimilarity(x,brief.narrationDraft.slice(0,3).join(' '))>=.70))
   return fail('FOUR_VIDEOS_TOO_SIMILAR');
  openings.push(brief.narrationDraft[0]);
  scenes.push(brief.narrationDraft.slice(0,3).join(' '));
  list.push({kst:row.kst,topicKey:brief.topicKey,brief:row.brief,
   sceneCount:4,voiceHumanReviewed:false,rightsReviewed:false,
   published:false});
 }
 if(FOUR_KST_TIMES.some(s=>!keys.has(s)))return fail('MISSING_KST_SLOT');
 return Object.freeze({state:'FOUR_EPISODE_PRIVATE_REVIEW_PLAN',
  count:4,slots:list,paidProviderCallsAllowed:false,
  generateUniqueLiveAIContent:false,
  mediaReady:false,published:false,publicationAllowed:false,
  verified90DayPublicHistory:false,notARecurringDeployment:true});
}
export function inspectRepoPreviewBatch(){
 let m;
 try{m=JSON.parse(readFileSync(manifestFile,'utf8'))}
 catch{return fail('MANIFEST_UNREADABLE')}
 return inspectPrivateFourSlotManifest(m,p=>JSON.parse(readFileSync(join(HERE,p),'utf8')));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const status=inspectRepoPreviewBatch();
 console.log(JSON.stringify(status));
 if(status.state!=='FOUR_EPISODE_PRIVATE_REVIEW_PLAN')process.exitCode=1;
}
