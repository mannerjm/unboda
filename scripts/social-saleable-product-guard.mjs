#!/usr/bin/env node
// UNBODA: saleable-first editorial gate. No external API or paid dependency.
// Run from the repository root. JSON is a pinned subset; its launch status is
// verified against the current production product registry every CI run.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const read=p=>readFileSync(root+'/'+p,'utf8');
const catalog=JSON.parse(read('automation/social/saleable-product-catalog.json'));
export const PRODUCTS=new Map(catalog.products.map(x=>[x.id,x]));
const deny=(why)=>({ok:false,reason:why});
const required=['productId','productTitle','productCategory','productType',
 'landingPath','contentGoal','productProblem','productValue','productCta'];
export function inspectProductContent(x,kind='lifestyle'){
 if(!x||!['lifestyle','video'].includes(kind))return deny('INVALID_SOURCE');
 for(const f of required)if(typeof x[f]!=='string'||!x[f].trim())
  return deny('PRODUCT_FIELD_MISSING:'+f);
 const p=PRODUCTS.get(x.productId);
 if(!p)return deny('PRODUCT_NOT_IN_LAUNCH_SALEABLE_CATALOG');
 if(x.productTitle!==p.title||x.productCategory!==p.category||
   x.productType!==p.productType||x.landingPath!==p.landingPath)
  return deny('PRODUCT_ID_TITLE_CATEGORY_OR_ROUTE_MISMATCH');
 if(x.productValue!==p.analysisValue)return deny('INVENTED_ANALYSIS_SCOPE');
 if(x.contentGoal!=='premium-conversion'&&x.contentGoal!=='compatibility-conversion')
  return deny('MISSING_SALEABLE_CONVERSION_GOAL');
 if((p.productType==='compatibility')!==(x.contentGoal==='compatibility-conversion'))
  return deny('PRODUCT_CONVERSION_TYPE_MISMATCH');
 if(!x.productCta.includes('무료 사주')||!x.productCta.includes(p.title)||
    !x.productCta.includes(p.landingPath))
  return deny('CTA_MUST_LINK_FREE_SAJU_AND_EXACT_SALEABLE_PRODUCT');
 if(x.productProblem.length<12||x.productProblem.length>200||
    !p.signals.some(w=>x.productProblem.includes(w)))
  return deny('PRODUCT_PROBLEM_NOT_ABOUT_SELECTED_ANALYSIS');
 const editorial=kind==='video'?
  [x.situation,x.hook,x.theme,...(x.narrationDraft||[])].join(' '):
  [x.title,x.lifeSituation,x.advice].join(' ');
 if(!p.signals.some(w=>editorial.includes(w)))
  return deny('GENERIC_LIFESTYLE_CONTENT_UNRELATED_TO_PRODUCT');
 if(kind==='video'){
  const accept={money:['money'],career:['career'],business:['career'],
   compatibility:['compatibility'],relationship:['compatibility'],
   social:['compatibility'],health:['self-understanding'],
   growth:['self-understanding']};
  if(!(accept[p.category]||[]).includes(x.sajuCategory))
    return deny('VIDEO_VISUAL_CATEGORY_NOT_MATCHING_SALE_PRODUCT');
  if(!Array.isArray(x.narrationDraft)||x.narrationDraft.length!==4||
     !x.narrationDraft[1].match(/사주|재물운|궁합|직업/))
    return deny('NOT_A_SAJU_VIDEO');
  if(!x.narrationDraft[3].includes('무료 사주 조회')||
     !(x.narrationDraft[3].includes(p.title)||x.scenes?.[3]?.subline?.includes(p.title)))
    return deny('VIDEO_FINAL_CTA_HAS_NO_SPECIFIC_PAID_PRODUCT');
 }else if(!/^\d{2}$/.test(x.hourKst||''))
  return deny('INVALID_LIFESTYLE_SLOT');
 return {ok:true,productId:p.id,productTitle:p.title};
}
export function inspectProductCatalogContract(){
 assert.equal(catalog.schemaVersion,1);
 assert.equal(catalog.freeSajuPath,'/guest-saju');
 assert.equal(PRODUCTS.size,catalog.products.length,'duplicate SKU');
 const launch=read('app/lib/paidAnalysisTopicConfig.ts');
 const start=launch.indexOf('const LAUNCH_TOPIC_CONFIGS:');
 const end=launch.indexOf('\n];',start);
 assert(start>=0&&end>start,'launch source missing');
 const ids=new Set([...launch.slice(start,end).matchAll(/productId: "([^"]+)"/g)].map(m=>m[1]));
 const registry=read('app/lib/analysisTopics.ts');
 const specials=read('app/lib/specialAnalysisProducts.ts');
 for(const p of PRODUCTS.values()){
  assert(/^https:\/\/unboda\.kr$/.test(catalog.origin));
  assert(p.signals.length>=3,'weak content topic guard:'+p.id);
  if(p.productType==='premium'){
   assert(ids.has(p.id),'NOT_FOR_SALE:'+p.id);
   assert(registry.includes('id: "'+p.id+'"'),'PRODUCT_NOT_IN_ANALYSIS_TOPICS:'+p.id);
   assert(registry.includes('title: "'+p.title+'"'),'DRIFTED_PRODUCT_TITLE:'+p.id);
   assert.equal(p.landingPath,'/paid-analysis/'+p.id);
  }else{
   assert.equal(p.productType,'compatibility');
   assert(specials.includes('id: '+p.id.toUpperCase().replaceAll('-','_')+'_PRODUCT_ID') ||
     specials.includes('"' + p.id + '"'),'SPECIAL_PRODUCT_MISSING:'+p.id);
   assert(specials.includes('title: "'+p.title+'"'),'SPECIAL_TITLE_DRIFT:'+p.id);
   assert(existsSync(root+'/app'+p.landingPath+'/page.tsx'),
     'SPECIAL_LANDING_PAGE_MISSING:'+p.landingPath);
  }
  assert(p.analysisValue.length>=12,'MISSING_REAL_PRODUCT_VALUE:'+p.id);
 }
 return {ok:true,saleableProducts:PRODUCTS.size};
}
export function inspectFile(path,kind){
 const j=JSON.parse(read(path));
 const items=kind==='video'?[j]:j.stories;
 if(!Array.isArray(items)||!items.length)throw Error('SOURCE_STORIES_MISSING');
 const seen=new Set();
 for(const item of items){
  const v=inspectProductContent(item,kind);
  if(!v.ok)throw Error(kind.toUpperCase()+'_SALE_PRODUCT_GATE:'+path+':'+v.reason);
  if(kind==='lifestyle'){
   if(seen.has(item.productId+'|'+item.topicKey))throw Error('DUPLICATE_PRODUCT_CONTENT');
   seen.add(item.productId+'|'+item.topicKey);
  }
 }
 return {ok:true,kind,count:items.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const contract=inspectProductCatalogContract();
  const flag=process.argv[2];
  if(flag==='--video'){
   const files=process.argv.slice(3);
   assert(files.length===4,'exact 4 video source paths');
   const ids=new Set();
   for(const path of files){let x=inspectFile(path,'video');const j=JSON.parse(read(path));ids.add(j.productId);}
   assert(ids.size===4,'four videos must map to different actual saleable products');
  }else if(flag==='--lifestyle'){
   const paths=process.argv.slice(3);
   assert(paths.length>=1,'source needed');
   for(const path of paths){const x=inspectFile(path,'lifestyle');assert(x.count===7,'exactly 7 lifestyle stories');}
  }else assert(!flag,'unknown mode: '+flag);
  console.log('UNBODA_SALEABLE_PRODUCT_GATE_PASSED '+JSON.stringify(contract));
 }catch(e){console.error('UNBODA_SALEABLE_PRODUCT_GATE_BLOCKED',String(e));process.exitCode=1;}
}
