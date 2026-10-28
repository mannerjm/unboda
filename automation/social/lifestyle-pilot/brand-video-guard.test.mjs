import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectSajuBrandEpisode,inspectFourSajuBrandEpisodes}
 from './brand-video-guard.mjs';
const names=['003-midnight','004-commute','005-friendship','002-afterwork'];
const briefs=names.map(n=>JSON.parse(readFileSync(
 new URL('./episodes/'+n+'.json',import.meta.url),'utf8')));
test('four different SAJU themes with full unboda free-saju funnel are real private drafts',()=>{
 const r=inspectFourSajuBrandEpisodes(briefs);
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.distinctVisualStyles,4);
 assert.equal(r.distinctSajuCategories,4);
 assert.equal(r.publicationAllowed,false);
});
test('generic mobile-phone, bus, lunch, dishwashing life-tips are blocked',()=>{
 const old={...briefs[0],narrationDraft:[
  '자기 전 휴대폰을 계속 넘기는 밤. 언제 내려놓을까요?',
  '스마트폰을 조금 멀리 두어 보세요.',
  '알림을 끄고 눈을 감아 보세요.',
  '오늘은 이렇게 잠들어 보세요.'
 ]};
 assert.equal(inspectSajuBrandEpisode(old).ok,false);
});
test('saju without explicit unboda free entry is a video dead end',()=>{
 const b={...briefs[1],narrationDraft:[...briefs[1].narrationDraft.slice(0,3),
  '일을 하고 싶을 때 사주를 떠올려 보세요.']};
 assert.equal(inspectSajuBrandEpisode(b).reason,'UNBODA_FREE_SAJU_CTA_REQUIRED');
});
test('saju as the first-frame jargon instead of real problem is rejected',()=>{
 const b={...briefs[2],narrationDraft:[
  '사주 궁합부터 확인해야 하는 점심. 왜 연락이 다를까요?',
  ...briefs[2].narrationDraft.slice(1)]};
 assert.equal(inspectSajuBrandEpisode(b).ok,false);
});
test('fate certainty and money guarantees cannot be scheduled',()=>{
 const b={...briefs[3],narrationDraft:[
  ...briefs[3].narrationDraft.slice(0,1),
  '사주 재물운이 100% 맞으니 모두 부자가 됩니다.',
  ...briefs[3].narrationDraft.slice(2)]};
 assert.equal(inspectSajuBrandEpisode(b).reason,'FATE_CERTAINTY_CLAIM_BLOCKED');
});
test('same palette/hero reused across four videos is not accepted',()=>{
 const duplicate=briefs.map((b,i)=>({...b,visualStyle:'commute-sunrise',
  sajuCategory:'career',scenes:b.scenes.map((s,j)=>j===0?{...s,illustration:'clock'}:s)}));
 assert.equal(inspectFourSajuBrandEpisodes(duplicate).ok,false);
});
test('unboda domain cannot be swapped for a lookalike redirect',()=>{
 const b={...briefs[0],destination:'https://unboda.kr.attacker.invalid'};
 assert.equal(inspectSajuBrandEpisode(b).ok,false);
});
