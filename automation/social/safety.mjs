import crypto from "node:crypto";
const unsafe=[/100\s*%|무조건\s*성공|반드시\s*대박|수익\s*보장|완치\s*보장/i,/지금\s*구매\s*가능|정식\s*판매\s*시작/i];
const tokenize=s=>new Set(String(s??"").toLowerCase().match(/[가-힣a-z0-9]{2,}/g)??[]);
export function similarity(a,b){const x=tokenize(a),y=tokenize(b);if(!x.size&&!y.size)return 1;const n=[...x].filter(k=>y.has(k)).length;return n/(x.size+y.size-n||1);}
export function fingerprint(p){return crypto.createHash("sha256").update([p.title,p.script,p.caption].join("|").replace(/\s/g,"")).digest("hex");}
export function checkContent(post,history=[]){
 const problems=[];const combined=[post.title,post.script,post.caption].join("\n");
 if(!post.title||!post.script||!post.caption||combined.length<100)problems.push("INCOMPLETE_CONTENT");
 if(!post.educationalValue||post.educationalValue.length<20)problems.push("LOW_EDITORIAL_VALUE");
 if(unsafe.some(r=>r.test(combined)))problems.push("MISLEADING_CLAIM");
 if(!/참고용|참고 정보/.test(combined))problems.push("MISSING_SAJU_DISCLAIMER");
 if(post.media?.some(m=>!m.ownedOrLicensed||!m.licenseProof))problems.push("LICENSE_NOT_PROVEN");
 if(post.video&&!post.isAiGeneratedDeclared)problems.push("AI_LABEL_MISSING");
 if(post.video&&(post.video.width/post.video.height>0.7||post.video.durationSeconds>60))problems.push("BAD_VERTICAL_VIDEO");
 if(history.some(p=>fingerprint(p)===fingerprint(post)))problems.push("EXACT_DUPLICATE");
 if(history.some(p=>similarity(p.script,post.script)>0.62))problems.push("REPETITIVE_CONTENT");
 if(post.creatorReviewStatus!=="approved")problems.push("EDITOR_REVIEW_REQUIRED");
 return {ok:problems.length===0,problems,hash:fingerprint(post)};
}
