import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectProductCatalogContract,inspectProductContent,PRODUCTS} from './social-saleable-product-guard.mjs';

const catalog=JSON.parse(readFileSync('automation/social/saleable-product-catalog.json','utf8'));
const p=PRODUCTS.get('health-sleep-rhythm');
const sample=()=>({
 productId:p.id,productTitle:p.title,productCategory:p.category,
 productType:p.productType,landingPath:p.landingPath,
 contentGoal:'premium-conversion',
 productProblem:'잠들기 전 수면 습관과 회복 리듬을 살펴보는 고민',
 productValue:p.analysisValue,
 productCta:'운보다 무료 사주 https://unboda.kr/guest-saju → '+p.title+' https://unboda.kr'+p.landingPath,
 hourKst:'01',title:'잠들기 전 수면 리듬이 흐트러지는 밤',
 lifeSituation:'수면 습관을 점검하고 침실의 휴식 환경을 살피는 밤',
 advice:'잠들기 전 수면 환경을 정리하고 다음날 나의 회복을 관찰해 보세요.'
});
test('verified 16 launch topics + 3 special compatibility products',()=>{
 assert.deepEqual(inspectProductCatalogContract(),{ok:true,saleableProducts:19});
});
test('real saleable product and product-specific lifestyle CTA passes',()=>{
 assert.equal(inspectProductContent(sample()).ok,true);
});
test('missing product id is rejected',()=>{
 let x=sample();delete x.productId;
 assert.equal(inspectProductContent(x).reason,'PRODUCT_FIELD_MISSING:productId');
});
test('non-saleable taxonomy-only entry blocked',()=>{
 let x=sample();x.productId='career-organization-fit';
 assert.equal(inspectProductContent(x).reason,'PRODUCT_NOT_IN_LAUNCH_SALEABLE_CATALOG');
});
test('wrong title and invented analysis scope rejected',()=>{
 let x=sample();x.productTitle='가짜 상품';assert.match(inspectProductContent(x).reason,/PRODUCT_ID_TITLE/);
 x=sample();x.productValue='돈을 반드시 벌게 됩니다';
 assert.equal(inspectProductContent(x).reason,'INVENTED_ANALYSIS_SCOPE');
});
test('CTA without exact paid product is rejected',()=>{
 let x=sample();x.productCta='운보다 무료 사주 보기';
 assert.equal(inspectProductContent(x).reason,'CTA_MUST_LINK_FREE_SAJU_AND_EXACT_SALEABLE_PRODUCT');
});
test('general non-product lifestyle copy is rejected',()=>{
 let x=sample();x.title='주말에 책상 정리해요';x.advice='책상 물건을 정돈합니다';x.lifeSituation='책상을 정리하는 하루';
 assert.equal(inspectProductContent(x).reason,'GENERIC_LIFESTYLE_CONTENT_UNRELATED_TO_PRODUCT');
});
test('video requires product context and product-specific ending',()=>{
 let x=sample();Object.assign(x,{sajuCategory:'self-understanding',situation:'밤에 잠들기 어려운 순간',hook:'밤에 잠들기 어려운 순간. 왜 그럴까요?',narrationDraft:['밤에 잠들기 어려운 순간. 왜 그럴까요?','사주는 수면 리듬을 돌아보는 참고예요.','잠들기 전 휴대폰 사용을 줄이고 기록해 보세요.','운보다 무료 사주 조회 후 수면 리듬 점검 분석을 살펴보세요.'],scenes:[{},{},{},{subline:'운보다 무료 사주 · 수면 리듬 점검 분석'}]});
 assert.equal(inspectProductContent(x,'video').ok,true);
 x.scenes[3].subline='운보다 무료 사주';x.narrationDraft[3]='운보다 무료 사주 조회를 살펴보세요.';
 assert.equal(inspectProductContent(x,'video').reason,'VIDEO_FINAL_CTA_HAS_NO_SPECIFIC_PAID_PRODUCT');
});
