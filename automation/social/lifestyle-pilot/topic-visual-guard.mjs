// Enforce specific visible subject objects, not just four background palettes.
import {readFileSync} from 'node:fs';
const POLICY=JSON.parse(readFileSync(new URL('./topic-visual-policy.json',import.meta.url),'utf8'));
const deny=reason=>Object.freeze({ok:false,reason,topicVisualVerified:false});
const match=(s,terms)=>terms.some(term=>String(s??'').includes(term));
const graphicKeys=new Set(['checklist','journal','people','moon','presentation','signpost','interview','map','phone','calendar','receipt','savings','shopping']);
export function inspectTopicVisualEpisode(brief){
 if(!brief||typeof brief!=='object')return deny('TOPIC_VISUAL_BRIEF_REQUIRED');
 const key=brief.visualMotif,entry=POLICY.motifs?.[key];
 if(!entry||!graphicKeys.has(entry.graphic))return deny('SPECIFIC_RENDERABLE_VISUAL_MOTIF_REQUIRED');
 if(brief.sajuCategory!==entry.category)return deny('VISUAL_MOTIF_CATEGORY_MISMATCH');
 if(!match(brief.situation,entry.situationTerms))
  return deny('STORY_SITUATION_AND_VISUAL_MOTIF_MISMATCH');
 if(!Array.isArray(brief.visualConcepts)||brief.visualConcepts.length!==4||
    !match(brief.visualConcepts.join(' '),entry.visualTerms))
  return deny('STORYBOARD_HAS_NO_MATCHING_VISIBLE_SCENE_OBJECTS');
 if(!Array.isArray(brief.scenes)||brief.scenes.length!==4||
    !match(brief.scenes[0]?.headline?.join(' '),entry.situationTerms))
  return deny('FIRST_FRAME_HOOK_NOT_MATCHED_TO_VISIBLE_MOTIF');
 return Object.freeze({ok:true,topicVisualVerified:true,visualMotif:key,
  expectedGraphic:entry.graphic,visibleSubjectObject:entry.label});
}
export function inspectTopicImagePost(post){
 if(!post||typeof post!=='object')return deny('PHOTO_POST_AND_VISIBLE_IMAGE_EVIDENCE_REQUIRED');
 const entry=POLICY.motifs?.[post.visualMotif];
 if(!entry||post.sajuCategory!==entry.category)
  return deny('PHOTO_TOPIC_MOTIF_CATEGORY_MISMATCH');
 if(!match(post.lifeSituation,entry.situationTerms)||
    !match(post.text,entry.situationTerms))
  return deny('PHOTO_POST_TEXT_AND_TOPIC_MISMATCH');
 // imageVisibleObjects must be transcribed from the actual inspected image,
 // never just fabricated from the prompt or filename.
 if(post.imageVisuallyInspected!==true||
    !Array.isArray(post.imageVisibleObjects)||!post.imageVisibleObjects.length||
    !post.imageVisibleObjects.every(x=>typeof x==='string'&&x.length>=2))
  return deny('ACTUAL_PHOTO_VISUAL_INSPECTION_MISSING');
 if(!match(post.imageVisibleObjects.join(' '),entry.visualTerms))
  return deny('PHOTO_VISIBLE_OBJECTS_DO_NOT_MATCH_TOPIC');
 if(!post.imageRightsReviewed||!/^https:\/\/[^\s]+\.(?:jpg|jpeg|png|webp)(?:\?.*)?$/i.test(post.imageUrl??''))
  return deny('PHOTO_MEDIA_URL_OR_COMMERCIAL_RIGHTS_MISSING');
 if(post.duplicateImage===true||post.brokenKoreanText===true||post.visualOverlap===true)
  return deny('PHOTO_VISUAL_OR_ORIGINALITY_QA_FAILED');
 return Object.freeze({ok:true,topicVisualVerified:true,visualMotif:post.visualMotif,
  visibleSubjectObject:entry.label,publicationApprovedByThisCheck:false});
}
export {POLICY as topicVisualPolicy};
