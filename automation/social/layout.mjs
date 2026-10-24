// Mandatory production design gate for Korean 9:16 short video.
// This validator is supplementary to visual inspection and independent audio QA.
// Do not auto-approve a clip just because its boxes pass.
export const REEL_LAYOUT=Object.freeze({
 width:1080,height:1920,
 safe:{left:104,top:220,right:976,bottom:1515},
 slots:Object.freeze({
  brand:{yMin:230,yMax:321},
  kicker:{yMin:334,yMax:424},
  headline:{yMin:465,yMax:680},
  explanation:{yMin:700,yMax:774},
  callToAction:{yMin:1260,yMax:1445},
  progress:{yMin:1450,yMax:1485}
 })
});
export const REEL_SCENES=Object.freeze([
 {index:1,headline:["띠만 알면","사주도 알 수 있을까?"],explanation:"12띠와 사주의 차이"},
 {index:2,headline:["띠는 태어난 해의","동물 상징이에요"],explanation:"전통문화에서 이어져 온 분류"},
 {index:3,headline:["사주는 네 기둥을","함께 살펴봐요"],explanation:"태어난 해 · 달 · 날 · 시간"},
 {index:4,headline:["사주 해석은","참고로 살펴보세요"],explanation:"미래를 확정하는 예언이 아닙니다",
  callToAction:"운보다 무료 사주",site:"unboda.kr"}
]);
export function checkReelTextBoxes({boxes,width=1080,height=1920}={}){
 const reasons=[];
 const {safe}=REEL_LAYOUT;
 if(width!==1080||height!==1920)reasons.push("UNSUPPORTED_VIDEO_DIMENSIONS");
 if(!Array.isArray(boxes)||!boxes.length)return {ok:false,reasons:[...reasons,"TEXT_BOXES_NOT_VERIFIED"]};
 for(const b of boxes){
  if(!b||![b.x,b.y,b.width,b.height].every(Number.isFinite)||
     b.width<=0||b.height<=0||
     b.x<safe.left||b.y<safe.top||b.x+b.width>safe.right||
     b.y+b.height>safe.bottom)reasons.push("UNSAFE_TEXT_POSITION");
 }
 return {ok:reasons.length===0,reasons:[...new Set(reasons)],checked:boxes.length};
}
export function validateReelStory({scenes=REEL_SCENES,editorialApproved=false,
 visualReviewApproved=false,voiceoverReviewed=false,mediaRightsApproved=false}={}){
 const reasons=[];
 if(!Array.isArray(scenes)||scenes.length!==4)reasons.push("FOUR_SCENES_REQUIRED");
 for(const s of Array.isArray(scenes)?scenes:[]){
  if(!Array.isArray(s.headline)||s.headline.length>2||s.headline.length<1||
   s.headline.some(x=>typeof x!=="string"||x.length<3||x.length>25))
   reasons.push("HEADLINE_LAYOUT_INVALID");
  if(!s.explanation||s.explanation.length>40)reasons.push("EXPLANATION_TOO_LONG");
 }
 if(!editorialApproved)reasons.push("EDITORIAL_APPROVAL_PENDING");
 if(!visualReviewApproved)reasons.push("HUMAN_VISUAL_QA_PENDING");
 if(!voiceoverReviewed)reasons.push("VOICEOVER_NOT_REVIEWED");
 if(!mediaRightsApproved)reasons.push("MEDIA_RIGHTS_NOT_PROVEN");
 return {publishable:reasons.length===0,reasons:[...new Set(reasons)]};
}
