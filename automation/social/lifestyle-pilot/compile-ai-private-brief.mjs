// Transform a validated AI storyboard into EXACT render.py episode format.
// This is a zero-publish staging compiler; it does not authorize voice rights,
// AI model spend, media generation, external URLs or commercial distribution.
import {reviewLifestyleVideoScript} from '../lifestyle-video-planner.mjs';
const fail=(reason)=>Object.freeze({state:'BLOCKED',reason,
  publicationAllowed:false,paidModelCallAllowed:false});
const length=x=>Array.from(String(x??'').replace(/\s+/g,'')).length;
export function compileAiPrivateBrief(story,{slotKst,verifiedHistory=false}={}){
 if(!story||typeof story!=='object'||Array.isArray(story))
  return fail('AI_STORYBOARD_REQUIRED');
 if(!/^\d{4}-\d\d-\d\d (00|08|12|20):00$/.test(slotKst??''))
  return fail('FIXED_KST_SLOT_REQUIRED');
 if(verifiedHistory!==true)return fail('SOURCE_90_DAY_VERIFICATION_REQUIRED');
 if(!/^[a-z0-9][a-z0-9:_-]{7,99}$/.test(story.topicKey??'')||
    typeof story.hook!=='string'||story.hook.length<12||story.hook.length>90||
    typeof story.situation!=='string'||story.situation.length<7||
    story.situation.length>150||
    typeof story.thumbnailTitle!=='string'||story.thumbnailTitle.length<5||
    story.thumbnailTitle.length>26)
   return fail('INVALID_AI_STORYBOARD_METADATA');
 const narration=story.narrationDraft,visuals=story.visualConcepts,scenes=story.scenes;
 if(!Array.isArray(narration)||narration.length!==4||
    narration.some(t=>typeof t!=='string'||t.length<15||t.length>100)||
    !narration[0].startsWith(story.situation)||
    !narration[0].includes(story.hook)||
    !Array.isArray(visuals)||visuals.length!==4||
    visuals.some(t=>typeof t!=='string'||t.length<12||t.length>160)||
    !Array.isArray(scenes)||scenes.length!==4)
   return fail('FOUR_ALIGNED_KOREAN_SCENES_REQUIRED');
 const quality=reviewLifestyleVideoScript(story);
 if(!quality.ok)return fail('KOREAN_EDITORIAL_FIRST_PASS_FAILED');
 for(const s of scenes){
  if(!s||typeof s!=='object'||!Array.isArray(s.headline)||
     s.headline.length!==2||s.headline.some(x=>typeof x!=='string'||
       length(x)<2||length(x)>10)||
     typeof s.subline!=='string'||length(s.subline)<4||
     length(s.subline)>24||
     !['clock','message','notes','rest'].includes(s.illustration))
   return fail('RENDER_SAFE_TWO_LINE_HEADLINE_REQUIRED');
 }
 const brief={
  schemaVersion:1,
  id:'unboda-ai-private-'+story.topicKey,
  topicKey:story.topicKey,
  situation:story.situation,hook:story.hook,theme:'AI 생성 생활형 초안',
  thumbnailTitle:story.thumbnailTitle,
  narrationDraft:[...narration],visualConcepts:[...visuals],
  scenes:scenes.map(s=>({headline:[...s.headline],subline:s.subline,
    illustration:s.illustration})),
  licenseReviewRequired:true,
  voiceHumanReviewRequired:true,
  automatedPublicationAllowed:false,
  source:'structured-model-draft-unapproved'
 };
 return Object.freeze({state:'PRIVATE_RENDER_BRIEF_ONLY',
  brief,slotKst,publicationAllowed:false,paidModelCallAllowed:false,
  humanVoiceReviewRequired:true,mediaRightsApprovalRequired:true,
  verifiedHistoryProvided:true,mediaGenerated:false});
}
