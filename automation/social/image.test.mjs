import test from "node:test";
import assert from "node:assert/strict";
import {makeEditorialSvg,writeEditorialSvg} from "./image.mjs";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
const sample={title:"뱀꿈은 정말 재물운을 뜻할까요?",
 summary:"전통적인 꿈의 상징과 현실의 차이를 쉽고 흥미롭게 살펴봅니다.",
 pillar:"dreams"};
test("1080x1350 branded educational vector art",()=>{
 const svg=makeEditorialSvg(sample);
 assert.ok(svg.startsWith("<svg"));
 assert.match(svg,/viewBox="0 0 1080 1350"/);
 assert.match(svg,/unboda.kr/);
 assert.match(svg,/뱀꿈/);
});
test("different topic creates a different pattern",()=>{
 const a=makeEditorialSvg(sample);
 const b=makeEditorialSvg({...sample,title:"용꿈은 특별하게 여기는 까닭"});
 assert.notEqual(a,b);
});
test("content is xml escaped against injected markup",()=>{
 const svg=makeEditorialSvg({...sample,kicker:"<script>alert('x')</script>"});
 assert.ok(svg.includes("&lt;script&gt;"));
 assert.ok(!svg.includes("<script>"));
});
test("unreviewed / overflowing text cannot create layout",()=>{
 assert.throws(()=>makeEditorialSvg({...sample,title:"xx"}),/TITLE_REQUIRED/);
 assert.throws(()=>makeEditorialSvg({...sample,title:"a ".repeat(55)}),/TEXT_TOO_LONG/);
});
test("written SVG has no external service dependencies",async()=>{
 const folder=await mkdtemp(join(tmpdir(),"social-vector-"));
 try{
  const file=join(folder,"card.svg");
  const result=await writeEditorialSvg({file,...sample});
  assert.equal(result.pngExportVerified,false);
  const text=await readFile(file,"utf8");
  assert.match(text,/운보다/);
 }finally{await rm(folder,{recursive:true,force:true});}
});
