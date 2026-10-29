import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {dirname} from "node:path";
const topics=JSON.parse(readFileSync("automation/magazine/draft-topic-briefs.json","utf8")).topics;
const original=readFileSync("app/lib/magazine.ts","utf8");
const bad=/<|>|https?:\/\/|www\.|수익.{0,5}보장|반드시.{0,6}성공|운명.{0,5}확정|치료.{0,5}효과|100%/i;
const norm=s=>s.trim().replace(/\s+/g," ");
const size=s=>[...s].length;
function text(s,min,max,name){
 assert(typeof s==="string" && size(norm(s))>=min && size(s)<=max,name+" length");
 assert(!bad.test(s) && !/[\u0000-\u0008\u000b-\u001f]/.test(s),name+" unsafe content");
 return norm(s);
}
function nextTopic(){
 return topics.find(t=>!original.includes('topicKey: "'+t.topicKey+'"') &&
 !original.includes('slug: "'+t.slug+'"'));
}
function dateKst(){
 const p=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(Date.now()+14*86400000)).map(x=>[x.type,x.value]));
 return p.year+"-"+p.month+"-"+p.day+"T09:00:00+09:00";
}
function check(t,obj,date){
 assert(t && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.slug),"Only curated topics");
 assert(Date.parse(date)>Date.now() && /^\d{4}-\d{2}-\d{2}T09:00:00 +09:00$/.test(date),"Future KST date");
 assert(obj && Array.isArray(obj.sections) && obj.sections.length>=4 && obj.sections.length<=6,"Section count");
 const seen=new Set(),prior=[];
 const sections=obj.sections.map((s,i)=>{
  const short=text(s.heading,3,90,"Heading "+i);
  const h=size(short)>=8?short:"생활 속에서 살펴보기: "+short;
  assert(size(h)<=100,"Heading too long");
  assert(!seen.has(h),"Repeat heading");seen.add(h);
  assert(Array.isArray(s.paragraphs) && s.paragraphs.length===2,"Exactly two paragraphs per section");
  const paragraphs=s.paragraphs.map((p,j)=>text(p,80,500,"Paragraph "+i+"."+j));
  for(const p of paragraphs){assert(!prior.includes(p),"Duplicate paragraph");prior.push(p);}
  return {heading:h,paragraphs};
 });
 assert(size(prior.join(" "))>=900 && size(prior.join(" "))<=5000,"Body length");
 const a={slug:t.slug,title:t.title,description:text(obj.description,48,180,"Description"),
  category:t.category,publishedAt:date,updatedAt:date,cover:"/magazine/"+t.slug+".svg",
  coverAlt:t.title+" 주제를 표현한 운보다 자체 제작 도형 일러스트",
  topicKey:t.topicKey,originalArtwork:true,approvedForPublication:false,author:"운보다",
  lead:text(obj.lead,90,400,"Lead"),sections,keyPoint:text(obj.keyPoint,35,200,"Takeaway"),
  relatedHref:t.relatedHref,relatedLabel:t.relatedLabel};
 return a;
}
function svg(a,motif){
 const shapes={
  "four-pillars":'<rect x="150" y="315" width="135" height="175"/><rect x="320" y="315" width="135" height="175"/><rect x="490" y="315" width="135" height="175"/><rect x="660" y="315" width="135" height="175"/>',
  "cycles":'<circle cx="490" cy="396" r="112"/><circle cx="490" cy="396" r="63"/><path d="M605 396h165l-36-39m36 39-36 39"/>',
  "calendar":'<rect x="245" y="286" width="510" height="256"/><path d="M245 348h510M340 280v-38M650 280v-38M350 416h88m58 0h88m-234 60h88"/>',
  "conversation":'<path d="M180 330h355v150H300l-60 48v-48h-60z"/><path d="M570 369h257v125h-60l-45 41v-41H570z"/>',
  "family":'<circle cx="355" cy="356" r="49"/><circle cx="561" cy="356" r="49"/><path d="M265 520q25-105 90-105t90 105m30 0q25-105 90-105t90 105"/>',
  "work":'<rect x="254" y="291" width="500" height="257"/><path d="M254 359h500M342 413h130m62 0h129M342 469h200"/>',
  "budget":'<rect x="245" y="286" width="374" height="257"/><path d="M300 353h245m-245 74h245m-245 62h162"/><circle cx="731" cy="425" r="74"/>'
 };
 const palette=["#8ac5ff","#a0e2b3","#f8c88e","#cbb4fc"];
 const col=palette[[...a.slug].reduce((n,ch)=>n+ch.charCodeAt(0),0)%palette.length];
 const escape=x=>x.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-labelledby="t d"><title id="t">'+escape(a.title)+'</title><desc id="d">'+escape(a.coverAlt)+'</desc><rect width="1200" height="630" fill="#152343"/><text x="80" y="90" fill="#c5caee" font-size="27" font-family="sans-serif">UNBODA MAGAZINE</text><text x="80" y="177" fill="white" font-size="38" font-weight="700" font-family="sans-serif">'+escape(a.title)+'</text><g fill="none" stroke="'+col+'" stroke-width="16" stroke-linecap="round" stroke-linejoin="round">'+(shapes[motif]||shapes.calendar)+'</g><text x="80" y="592" fill="#b9d1dd" font-size="22" font-family="sans-serif">운보다 자체 제작 · 전통 명리 문화 참고</text></svg>\n';
}
function apply(a,art){
 assert(a.approvedForPublication===false,"Generated drafts can never be approved");
 assert(topics.some(t=>t.slug===a.slug && t.topicKey===a.topicKey),"Unknown topic");
 assert(!original.includes('slug: "'+a.slug+'"'),"Already exists");
 assert(art.includes('viewBox="0 0 1200 630"') && art.includes(a.title),"Artwork mismatch");
 assert(!/<script|<foreignObject|onload=|onerror=|href\s*=|https?:\/\//i.test(art),"Unsafe artwork");
 const marker="];\n\nconst SLUG";
 assert(original.split(marker).length===2,"Unexpected registry shape");
 const keys=["slug","title","description","category","publishedAt","updatedAt","cover","coverAlt","topicKey","originalArtwork","approvedForPublication","author","lead","sections","keyPoint","relatedHref","relatedLabel"];
 const obj="  {\n"+keys.map(k=>"    "+k+": "+JSON.stringify(a[k])+",").join("\n")+"\n  },\n";
 const dest="public"+a.cover;
 assert(!existsSync(dest),"Art already exists");
 mkdirSync(dirname(dest),{recursive:true});
 writeFileSync(dest,art);writeFileSync("app/lib/magazine.ts",original.replace(marker,obj+marker));
 console.log("MAGAZINE_DRAFT_APPLIED_UNPUBLISHED",a.slug);
}
function test(){
 assert(topics.length>=8 && topics.every(t=>/^[a-z0-9-]+$/.test(t.slug)));
 assert.equal(new Set(topics.map(t=>t.slug)).size,topics.length);
 const paragraph=i=>"생활에서 확인한 실제 기록과 서로 다른 선택을 비교하면서 다룰 수 있는 질문을 적어 봅니다. 전통 명리에서 쓰는 용어를 미래의 확정적인 사실로 해석하기보다 관계와 상황을 함께 살피는 것이 중요합니다. 이번에는 "+i+"번째 장면을 점검합니다.";
 const o={description:"사주의 네 기둥을 간단한 생활 질문으로 바꾸어 보며 확인된 기록과 문화적 해석의 차이를 살펴보는 소개 글입니다.",
 lead:paragraph(20),keyPoint:"사주 정보를 활용할 때는 출생 기록과 실제 생활에서 확인되는 사실을 함께 살펴보는 것이 도움이 됩니다.",
 sections:Array.from({length:5},(_,i)=>({heading:"확인할 수 있는 생활 질문 "+i,paragraphs:[paragraph(i*2),paragraph(i*2+1)]}))};
 const d=check(topics[0],o,"2028-12-02T09:00:00+09:00");
 assert.equal(d.approvedForPublication,false);
 assert(svg(d,topics[0].motif).includes('viewBox="0 0 1200 630"'));
 assert.throws(()=>check(topics[0],{...o,lead:"<script>"},"2028-12-02T09:00:00+09:00"));
 console.log("MAGAZINE_LOCAL_DRAFT_SELF_TEST_PASS");
}
async function generate(){
 const topic=nextTopic();if(!topic)throw Error("NO_NEW_TOPIC: add an original fact-checked editorial brief first");
 const instructions="각 heading(소제목)은 공백 포함 최소 12글자 이상의 설명형 제목이어야 합니다. 문단당 최소 100글자, 전체 1000글자 이상이어야 합니다. "\+
 "당신은 운보다의 한국어 정보글 편집자입니다. 외부 검색 없이 아래 검증된 주제 힌트만 바탕으로 문화적 사주 해석과 일상적 선택을 구분하는 독창적 설명을 쓰세요. 단정적 미래 예언, 가짜 전문가 호칭, 의학/투자 효과, HTML/URL/인용 없는 사실, 반복, 얕은 글 금지. 반드시 JSON 객체만 작성: description(50-120자),lead(100-250자),sections(소제목 heading과 서로 다른 한국어 문단 paragraphs 2개로 구성된 5개 섹션, 문단당 120-220자),keyPoint(40-120자).";
 const payload={model:"unboda-editorial",temperature:0.55,max_tokens:3800,stream:false,response_format:{type:"json_object"},messages:[
  {role:"system",content:instructions},
  {role:"user",content:"/no_think\n제목: "+topic.title+"\n사실 참고 메모: "+topic.factNotes+"\n상세하고 서로 중복되지 않는 각 2문단의 5개 섹션을 작성하되 원문 그대로 복사하지 마세요."}
 ]};
 let last;
 for(let trial=0;trial<2;trial++){
  if (trial>0 && last) payload.messages.push({role:"user",content:"이전 원고는 품질 검증에서 실패했습니다: "+String(last.message).slice(0,120)+". 모든 소제목을 12글자 이상, 모든 설명 문단을 120글자 이상으로 길게 다시 작성하고 각 문단에 서로 다른 예시를 포함하세요. JSON 객체만 제출하세요."});
  try{
   const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),240000);
   let response;try{response=await fetch("http://127.0.0.1:8080/v1/chat/completions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),signal:ctl.signal});}finally{clearTimeout(timer);}
   assert(response.ok,"Local model failed "+response.status);
   const data=await response.json();
   const obj=JSON.parse(String(data.choices?.[0]?.message?.content||"").trim());
   const article=check(topic,obj,dateKst());
   mkdirSync(".magazine-draft",{recursive:true});
   writeFileSync(".magazine-draft/article.json",JSON.stringify(article,null,2)+"\n");
   writeFileSync(".magazine-draft/cover.svg",svg(article,topic.motif));
   console.log("MAGAZINE_LOCAL_GENERATION_QA_PASS",article.slug);
   return;
  }catch(e){last=e;console.error("Draft rejected",trial+1,String(e).slice(0,220));}
 }
 throw last;
}
const arg=process.argv[2];
if(arg==="--self-test")test();
else if(arg==="--preflight")console.log("MAGAZINE_LOCAL_DRAFT_NEXT",nextTopic()?.slug??"NO_NEW_TOPIC");
else if(arg==="--generate")await generate();
else if(arg==="--apply"){
 const a=JSON.parse(readFileSync(".magazine-draft/article.json","utf8"));
 const topic=topics.find(t=>t.slug===a.slug && t.topicKey===a.topicKey);
 assert(topic,"Unknown topic");
 const verified=check(topic,a,a.publishedAt);
 assert.equal(JSON.stringify(verified),JSON.stringify(a),"Generated artifact metadata changed");
 apply(verified,readFileSync(".magazine-draft/cover.svg","utf8"));
}else throw Error("Usage --self-test|--preflight|--generate|--apply");
