import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectTopicVisualEpisode,inspectTopicImagePost,topicVisualPolicy} from './topic-visual-guard.mjs';

const files=['003-midnight','004-commute','005-friendship','002-afterwork'];
const briefs=files.map(n=>JSON.parse(readFileSync(new URL('./episodes/'+n+'.json',import.meta.url))));
test('all 4 first-frame scenes must have concrete corresponding drawn objects',()=>{
 assert.ok(Object.keys(topicVisualPolicy.motifs).length>=12);
 for(const b of briefs){
  const q=inspectTopicVisualEpisode(b);
  assert.equal(q.ok,true,q.reason);
  assert.ok(q.expectedGraphic);
 }
 assert.equal(new Set(briefs.map(b=>b.visualMotif)).size,4);
});
test('identical generic sky is rejected despite attractive design',()=>{
 const x={...briefs[3],visualConcepts:Array(4).fill('우주에서 별이 반짝이는 무관한 감성 장면')};
 assert.equal(inspectTopicVisualEpisode(x).reason,'STORYBOARD_HAS_NO_MATCHING_VISIBLE_SCENE_OBJECTS');
});
test('a meeting graphic cannot be used for a spending script',()=>{
 const b={...briefs[3],visualMotif:'meeting-presentation'};
 assert.equal(inspectTopicVisualEpisode(b).reason,'VISUAL_MOTIF_CATEGORY_MISMATCH');
});
test('post image actual observed scene objects must match article topic',()=>{
 const base={visualMotif:'subscription-billing',sajuCategory:'money',
   lifeSituation:'자동이체 알림을 확인한 저녁',
   text:'자동이체 알림을 보고 이번 주 구독 결제를 점검해 보세요.',
   imageVisuallyInspected:true,imageVisibleObjects:['휴대폰 결제 알림','구독 목록'],
   imageRightsReviewed:true,
   imageUrl:'https://static.metricool.com/planner/photo.jpeg',
   duplicateImage:false,brokenKoreanText:false,visualOverlap:false};
 const pass=inspectTopicImagePost(base);
 assert.equal(pass.ok,true,pass.reason);
 assert.equal(pass.publicationApprovedByThisCheck,false);
 const out=inspectTopicImagePost({...base,imageVisibleObjects:['밤하늘과 별이 있는 풍경']});
 assert.equal(out.reason,'PHOTO_VISIBLE_OBJECTS_DO_NOT_MATCH_TOPIC');
 assert.equal(inspectTopicImagePost({...base,imageVisuallyInspected:false}).ok,false);
 assert.equal(inspectTopicImagePost({...base,imageRightsReviewed:false}).ok,false);
 assert.equal(inspectTopicImagePost({...base,duplicateImage:true}).ok,false);
});
