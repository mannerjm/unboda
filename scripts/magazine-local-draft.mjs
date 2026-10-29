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
 assert(Date.parse(date)>Date.now() && /^\d{4}-\d{2}-\d{2}T09:00:00\+09:00$/.test(date),"Future KST date");
 assert(obj && Array.isArray(obj.sections) && obj.sections.length>=4 && obj.sections.length<=6,"Section count");
 const seen=new Set(),prior=[];
 const sections=obj.sections.map((s,i)=>{
  const short=text(s.heading,3,90,"Heading "+i);
  const h=size(short)>=8?short:"생활 속에서 살펴보기: "+short;
  assert(size(h)<=100,"Heading too long");
  assert(!seen.has(h),"Repeat heading");seen.add(h);
  assert(Array.isArray(s.paragraphs) && s.paragraphs.length>=1 && s.paragraphs.length<=4,"Paragraph list (1-4)");
  let groups;
  if(s.paragraphs.length===1){
    const sentences=String(s.paragraphs[0]).trim().split(/(?<=[.!?。])\s+/).filter(Boolean);
    const candidates=sentences.slice(1).map((_,k)=>[sentences.slice(0,k+1).join(" "),sentences.slice(k+1).join(" ")]);
    groups=candidates.find(parts=>parts.every(x=>size(x)>=80 && size(x)<=500));
    assert(groups,"Single paragraph cannot be split into two complete substantial passages");
  } else {
    const cut=Math.ceil(s.paragraphs.length/2);
    groups=[s.paragraphs.slice(0,cut).join(" "),s.paragraphs.slice(cut).join(" ")];
  }
  const paragraphs=groups.map((p,j)=>text(p,80,500,"Paragraph "+i+"."+j));
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
async function localGenerate(messages,schema,maxTokens){
 const payload={model:"unboda-editorial",temperature:0.45,max_tokens:maxTokens,
  stream:false,response_format:{type:"json_schema",schema},messages};
 const ctl=new AbortController(),timer=setTimeout(()=>180000);
 try{
  const response=await fetch("http://127.0.0.1:8080/v1/chat/completions",{
   method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify(payload),signal:ctl.signal
  });
  assert(response.ok,"Local model error HTTP "+response.status);
  const data=await response.json();
  const message=data.choices?.[0]?.message?.content;
  assert(typeof message==="string" && message.trim().length>2,"Model returned empty draft");
  return JSON.parse(message.trim());
 }finally{clearTimeout(timer);}
}
const sectionSchema={type:"object",properties:{
 heading:{type:"string"},paragraphs:{type:"array",items:{type:"string"},minItems:2,maxItems:2}
},required:["heading","paragraphs"],additionalProperties:false};
const outlines=[
 "핵심 개념의 정확한 뜻과 쓰이는 맥락",
 "일상에서 이해할 수 있는 구체적인 사례",
 "잘못 해석하기 쉬운 부분과 한계",
 "실제로 확인할 수 있는 정보와 질문",
 "판단을 서두르지 않고 활용하는 방법"
];
function checkOneSection(section,i){
 assert(section && typeof section==="object","Invalid section");
 // The editorial outline, not the model, owns the actual heading.
 assert(Array.isArray(section.paragraphs) && section.paragraphs.length>=1 && section.paragraphs.length<=4,
  "Section "+i+" needs 1-4 nonempty paragraphs");
 let parts=section.paragraphs.map(s=>text(s,75,750,"Input paragraph "+i));
 if(parts.length===1){
  const sentences=parts[0].split(/(?<=[.!?。])\s+/).filter(Boolean);
  const candidates=sentences.slice(1).map((_,n)=>[
    sentences.slice(0,n+1).join(" "),sentences.slice(n+1).join(" ")
  ]);
  parts=candidates.find(p=>p.every(x=>size(x)>=100 && size(x)<=450))||[];
  assert(parts.length===2,"Long single paragraph cannot form two meaningful passages");
 }else if(parts.length>2){
  const midpoint=Math.ceil(parts.length/2);
  parts=[parts.slice(0,midpoint).join(" "),parts.slice(midpoint).join(" ")];
 }
 assert(parts.length===2,"Two substantial passages required");
 const paragraphs=parts.map((p,j)=>text(p,100,450,"Section "+i+" paragraph "+j));
 assert(paragraphs[0]!==paragraphs[1],"Repeated passage");
 return {heading:outlines[i],paragraphs};
}
async function generate(){
 const topic=nextTopic();
 if(!topic)throw Error("NO_NEW_TOPIC: curate more fact-checked briefs; no infinite reuse");
 const sections=[];
 // Break work into six bounded, independently validated local calls. Never fabricate padding.
 for(let i=0;i<5;i++){
  let accepted=false,lastError=null;
  for(let trial=0;trial<3 && !accepted;trial++){
   const guidance="전통 사주명리의 문화적 개념과 확인 가능한 생활 사실을 분리합니다. 근거 없는 상세 사실, 투자/의학/관계 결과 확정, 다른 사람의 원문 복사, HTML과 링크를 피합니다. "+
    "사주 해석의 한계를 설명하고 구체적 일상 질문과 실행 가능한 행동을 넣습니다. "+
    "JSON 객체의 heading에는 12글자 이상의 구체적인 소제목을, paragraphs에는 서로 다른 125~200자의 완전한 한국어 문단을 정확히 2개 작성하세요.";
   const user="제목: "+topic.title+"\n편집 기준: "+topic.factNotes+
    "\n이번 절의 관점: "+outlines[i]+
    "\n이미 앞 절에서 다룬 주제: "+sections.map(s=>s.heading).join(" / ")+
    "\n공백 포함 두 문단 각각 120글자 이상, 복사나 유사 반복 없이 작성하세요. JSON 객체만 반환하세요."+
    (lastError?"\n이전 결과 반려 사유: "+lastError.slice(0,100):"");
   try{
    const obj=await localGenerate([{role:"system",content:guidance},
      {role:"user",content:"/no_think\n"+user}],sectionSchema,1100);
    const section=checkOneSection(obj,i);

    assert(!sections.some(s=>s.paragraphs.some(p=>section.paragraphs.includes(p))),
      "Reused section text");
    sections.push(section);accepted=true;
    console.log("MAGAZINE_LOCAL_SECTION_QA_PASS",i+1,"of",5);
   }catch(e){lastError=String(e.message||e);console.error("Section rejected",i+1,trial+1,lastError.slice(0,150));}
  }
  if(!accepted)throw Error("SECTION_QUALITY_FAIL_"+(i+1)+": "+lastError);
 }
 // SEO intro and article metadata are curated, not invented by the small local model.
 const intro={
   description:text(topic.title+" "+topic.factNotes,48,180,"Curated description"),
   lead:text(topic.title+" "+topic.factNotes+
     " 이 글에서는 전통적인 해석을 생활 속 질문과 연결하되 확인 가능한 사실을 먼저 살펴보는 방법을 정리합니다.",
     90,400,"Curated lead"),
   keyPoint:text(topic.factNotes+
     " 중요한 선택은 실제로 확인한 정보와 상황을 함께 검토하세요.",35,200,"Curated keyPoint")
 };
 const article=check(topic,{...intro,sections},dateKst());
 mkdirSync(".magazine-draft",{recursive:true});
 writeFileSync(".magazine-draft/article.json",JSON.stringify(article,null,2)+"\n");
 writeFileSync(".magazine-draft/cover.svg",svg(article,topic.motif));
 console.log("MAGAZINE_LOCAL_GENERATION_QA_PASS",article.slug,"UNAPPROVED");
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
