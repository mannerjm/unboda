// Original educational image-card design engine (vector master).
// It creates a usable local SVG asset without third-party image subscriptions.
// IMPORTANT: same-template images alone do not satisfy premium cinematic video
// standards or original-photography requirements. PNG export must be verified.
import {createHash} from "node:crypto";
import {writeFile,mkdir} from "node:fs/promises";
import {dirname} from "node:path";
const PALETTES=Object.freeze({
 zodiac:["#111A37","#DDBD7D"],"four-pillars":["#0E2330","#83C5BE"],
 dreams:["#1C1840","#C1A4EE"],compatibility:["#302038","#EFB1A7"],
 seasons:["#172D31","#F4D38E"],myths:["#211C31","#9CBEF1"],
 habits:["#142C29","#D9C28F"]
});
function safe(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
 .replace(/"/g,"&quot;").replace(/'/g,"&apos;");}
function lines(text,max=14,maxLines=3){
 const units=String(text).trim().split(/\s+/);
 const rows=[];let line="";
 for(const unit of units){
  if(line.length+unit.length+(line?1:0)>max&&line){rows.push(line);line="";}
  line+=(line?" ":"")+unit;
 }
 if(line)rows.push(line);
 if(rows.length>maxLines)throw Error("TEXT_TOO_LONG_FOR_CARD");
 return rows;
}
function starsFor(title){
 const b=createHash("sha256").update(title).digest();
 return Array.from({length:18},(_,i)=>{
  const x=60+(b[(i*2)%32]/255)*960,y=85+(b[(i*2+1)%32]/255)*1130;
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i%3===0?2.2:1.1}" fill="#FFFFFF" opacity="${i%3===0?0.45:0.2}"/>`;
 }).join("");
}
export function makeEditorialSvg({title,summary,pillar="four-pillars",kicker="오늘의 사주 이야기"}){
 if(typeof title!=="string"||title.trim().length<5)throw Error("CARD_TITLE_REQUIRED");
 if(typeof summary!=="string"||summary.trim().length<12)throw Error("CARD_SUMMARY_REQUIRED");
 const p=PALETTES[pillar];
 if(!p)throw Error("UNKNOWN_EDITORIAL_PILLAR");
 const heads=lines(title,14,3),subs=lines(summary,22,4);
 const headSvg=heads.map((t,i)=>`<text x="88" y="${480+i*92}" font-size="72" font-weight="800" fill="#FAF6EE">${safe(t)}</text>`).join("");
 const summarySvg=subs.map((t,i)=>`<text x="90" y="${850+i*56}" font-size="37" font-weight="400" fill="#E3E5E7">${safe(t)}</text>`).join("");
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
 <defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p[0]}"/><stop offset="1" stop-color="#070D1D"/></linearGradient>
  <radialGradient id="halo"><stop stop-color="${p[1]}" stop-opacity=".25"/><stop offset="1" stop-color="${p[1]}" stop-opacity="0"/></radialGradient>
 </defs>
 <rect width="1080" height="1350" fill="url(#bg)"/>
 <circle cx="900" cy="280" r="440" fill="url(#halo)"/>
 <g fill="none" stroke="${p[1]}" stroke-width="2" opacity=".62">
  <circle cx="916" cy="260" r="215"/><circle cx="916" cy="260" r="185"/>
  <path d="M916 28V492 M682 260H1150 M754 98L1078 422 M1078 98L754 422"/>
  <path d="M76 106H225 M76 1170H1004"/>
 </g>
 ${starsFor(title)}
 <g font-family="Noto Sans CJK KR, NanumSquare, sans-serif">
  <text x="88" y="176" fill="${p[1]}" font-size="31" letter-spacing="3">UNBODA · SAJU JOURNAL</text>
  <rect x="88" y="282" width="14" height="72" rx="7" fill="${p[1]}"/>
  <text x="129" y="329" fill="${p[1]}" font-size="36" font-weight="700">${safe(kicker)}</text>
  ${headSvg}
  <rect x="89" y="694" width="78" height="5" fill="${p[1]}"/>
  ${summarySvg}
  <text x="88" y="1236" fill="${p[1]}" font-size="35" font-weight="700">운보다</text>
  <text x="970" y="1236" text-anchor="end" fill="#BDC1CF" font-size="29">unboda.kr</text>
 </g>
 </svg>`;
}
export async function writeEditorialSvg({file,...args}){
 if(typeof file!=="string"||!file.toLowerCase().endsWith(".svg"))throw Error("SVG_PATH_REQUIRED");
 const svg=makeEditorialSvg(args);
 await mkdir(dirname(file),{recursive:true});
 await writeFile(file,svg,"utf8");
 return {file,mediaType:"image/svg+xml",width:1080,height:1350,
  originalDesign:true,pngExportVerified:false};
}
