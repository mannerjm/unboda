// UNBODA: a general life-tip video is NOT a saju-platform video.
// Editorial/visual hard gate; never grants publication rights.
const SAJU=/(?:사주|궁합|재물운|직업운|운세|타고난\s*성향|기질)/;
const UNBODA=/운보다/;
const MAX_WORDS=100;
const ALLOWED_STYLES=Object.freeze({
 'midnight-indigo':'self-understanding',
 'commute-sunrise':'career',
 'relationship-coral':'compatibility',
 'finance-emerald':'money'
});
const DENY=(reason)=>Object.freeze({ok:false,reason,brandReady:false});
export function inspectSajuBrandEpisode(b){
 if(!b||b.schemaVersion!==1||b.automatedPublicationAllowed!==false)
  return DENY('PRIVATE_EPISODE_SCHEMA_REQUIRED');
 if(!Object.hasOwn(ALLOWED_STYLES,b.visualStyle))
  return DENY('FOUR_DISTINCT_BRAND_VISUAL_STYLES_REQUIRED');
 if(b.sajuCategory!==ALLOWED_STYLES[b.visualStyle])
  return DENY('SAJU_CATEGORY_AND_VISUAL_STYLE_MISMATCH');
 if(!/^[a-z0-9][a-z0-9:_-]{7,99}$/.test(b.topicKey??'')||
    !Array.isArray(b.narrationDraft)||b.narrationDraft.length!==4)
  return DENY('FOUR_ORIGINAL_KOREAN_VOICES_REQUIRED');
 const [hook,explain,practical,cta]=b.narrationDraft;
 if(![hook,explain,practical,cta].every(x=>typeof x==='string'&&x.length>=15&&x.length<=MAX_WORDS))
  return DENY('FOUR_READABLE_KOREAN_VOICES_REQUIRED');
 if(!hook.startsWith(b.situation)||!hook.includes('까'))
  return DENY('FIRST_TWO_SECONDS_REAL_LIFE_HOOK_REQUIRED');
 if(!SAJU.test(explain)||SAJU.test(hook))
  return DENY('SAJU_INTERPRETATION_AFTER_REAL_LIFE_HOOK_REQUIRED');
 if(practical.replace(/\s/g,'').length<28)
  return DENY('PRACTICAL_KOREAN_VOICE_TOO_SHORT_CAUSES_LONG_GAP');
 if(!/(?:생각|살펴|기록|적어|점검|대화|확인|돌아보|말해|구분|비교)/.test(practical))
  return DENY('PRACTICAL_LIFE_REFLECTION_REQUIRED');
 if(!UNBODA.test(cta)||!SAJU.test(cta)||
    !/(?:무료\s*사주|무료\s*조회|무료\s*분석)/.test(cta))
  return DENY('UNBODA_FREE_SAJU_CTA_REQUIRED');
 if(!/^https:\/\/unboda\.kr\/?$/.test(b.destination??''))
  return DENY('ACTUAL_UNBODA_DOMAIN_REQUIRED');
 const all=[hook,explain,practical,cta].join(' ');
 if(/(?:100%|무조건|확정|반드시\s*성공|절대\s*헤어|당첨\s*보장)/.test(all))
  return DENY('FATE_CERTAINTY_CLAIM_BLOCKED');
 if(!Array.isArray(b.scenes)||b.scenes.length!==4||
    !Array.isArray(b.visualConcepts)||b.visualConcepts.length!==4)
  return DENY('FOUR_VISUALLY_DISTINCT_SCENES_REQUIRED');
 if(b.scenes.some(s=>!s||!Array.isArray(s.headline)||s.headline.length!==2||
   typeof s.subline!=='string'||!s.illustration||
   !['clock','message','notes','rest'].includes(s.illustration)))
  return DENY('TWO_LINE_KOREAN_SCENE_NOT_RENDERABLE');
 if(!b.scenes[3].subline.includes('운보다')||
    !b.scenes[3].headline.join(' ').includes('사주'))
  return DENY('VISUAL_UNBODA_SAJU_FINAL_CARD_REQUIRED');
 if(new Set(b.scenes.map(s=>s.illustration)).size<3)
  return DENY('NOT_ENOUGH_SCENE_MOTION_VARIATION');
 if(!b.visualConcepts.every(x=>typeof x==='string'&&x.length>=15&&x.length<150))
  return DENY('ORIGINAL_SITUATIONAL_VISUAL_CONCEPT_REQUIRED');
 if(!b.licenseReviewRequired||!b.voiceHumanReviewRequired)
  return DENY('HUMAN_RIGHTS_REVIEW_REQUIRED');
 return Object.freeze({ok:true,brandReady:true,style:b.visualStyle,
  sajuCategory:b.sajuCategory,publicationAllowed:false});
}
export function inspectFourSajuBrandEpisodes(episodes){
 if(!Array.isArray(episodes)||episodes.length!==4)
  return DENY('EXACT_FOUR_ORIGINAL_SAJU_EPISODES_REQUIRED');
 for(const episode of episodes){
  const result=inspectSajuBrandEpisode(episode);
  if(!result.ok)return result;
 }
 if(new Set(episodes.map(b=>b.visualStyle)).size!==4||
    new Set(episodes.map(b=>b.sajuCategory)).size!==4||
    new Set(episodes.map(b=>b.narrationDraft[0])).size!==4||
    new Set(episodes.map(b=>b.scenes[0].illustration)).size!==4)
   return DENY('FOUR_VIDEOS_LOOK_AND_FEEL_TOO_SIMILAR');
 return Object.freeze({ok:true,brandReady:true,distinctVisualStyles:4,
  distinctSajuCategories:4,publicationAllowed:false});
}
