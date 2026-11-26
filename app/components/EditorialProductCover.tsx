"use client";

import Image from "next/image";
import { useState } from "react";
import { getEditorialProductCover } from "@/app/lib/editorialProductCover";

const GENERATED_COVER_IDS: ReadonlySet<string> = new Set(["study-learning-strategy","study-exam-preparation","study-focus-routine","study-credential-decision","business-startup-readiness","business-expansion-control","business-client-relationship","business-team-management"]);

/** The eight approved originals are 1100 × 619. Use their exact ratio rather than stretching or letterboxing. */
export function hasGeneratedProductCover(productId:string):boolean { return GENERATED_COVER_IDS.has(productId); }
const GENERATED_COVER_RATIO = "1100 / 619";

const PALETTES: Record<string, {dark:string;accent:string;light:string}> = {
  career:{dark:"#14263d",accent:"#d9bb82",light:"#f5e7c8"},
  business:{dark:"#17382e",accent:"#c6b478",light:"#f7e8b6"},
  growth:{dark:"#28385d",accent:"#d8b976",light:"#fff0cc"},
  health:{dark:"#234b46",accent:"#b8e2cc",light:"#edf9ed"},
  social:{dark:"#403052",accent:"#c7a9e4",light:"#f6e8ff"},
  relationship:{dark:"#51273b",accent:"#e5a7b1",light:"#ffe6dc"},
  period:{dark:"#29264e",accent:"#d8bc82",light:"#f9e8ba"},
  compatibility:{dark:"#49273b",accent:"#d8ae8e",light:"#ffe7d2"},
};

/** A single responsive storefront composition, reused in list and detail.
 * Typography is real HTML, not baked into small source photos. */
export default function EditorialProductCover({productId,priority=false}:{productId:string;priority?:boolean}) {
  const cover=getEditorialProductCover(productId);
  const [failedSrc,setFailedSrc]=useState<string|null>(null);
  if(!cover) return null;
  const palette=PALETTES[cover.category]??PALETTES.period;
  const generatedSrc=hasGeneratedProductCover(productId) ? `/images/generated-covers/${productId}.webp` : null;
  // New artwork contains the complete typography. Never crop or overlay it.
  if(generatedSrc && failedSrc!==generatedSrc) return (
    <div data-generated-cover={productId} className="relative w-full overflow-hidden rounded-[inherit]" style={{background:palette.dark,aspectRatio:GENERATED_COVER_RATIO}}>
      <Image src={generatedSrc} alt={cover.title+" · "+cover.hook} fill priority={priority} sizes={priority?"(max-width: 640px) 90vw, 390px":"(max-width: 640px) 42vw, (max-width: 1024px) 24vw, 250px"} className="object-contain object-center" onError={()=>setFailedSrc(generatedSrc)}/>
    </div>
  );
  return (
    <div data-editorial-cover={productId} aria-label={cover.title+" · "+cover.hook} className="relative isolate aspect-[4/3] w-full overflow-hidden rounded-[inherit] text-white" style={{background:palette.dark,containerType:"inline-size",...(generatedSrc ? {aspectRatio:GENERATED_COVER_RATIO} : {})}}>
      {failedSrc!==cover.photo.src ? <Image src={cover.photo.src} alt="" fill priority={priority} sizes={priority?"(max-width: 640px) 90vw, 390px":"(max-width: 640px) 42vw, (max-width: 1024px) 24vw, 250px"} className="object-cover object-center" onError={()=>setFailedSrc(cover.photo.src)}/> : null}
      <div aria-hidden="true" className="absolute inset-0" style={{background:`linear-gradient(0deg,${palette.dark} 1%,${palette.dark}ed 17%,${palette.dark}82 49%,${palette.dark}10 78%),linear-gradient(120deg,${palette.dark}aa,transparent 58%)`}}/>
      <svg aria-hidden="true" viewBox="0 0 160 160" className="pointer-events-none absolute -right-[15%] -top-[22%] w-[68%]" style={{color:palette.accent,opacity:.38}} fill="none" stroke="currentColor" strokeWidth=".8"><circle cx="80" cy="80" r="65"/><circle cx="80" cy="80" r="56"/><circle cx="80" cy="80" r="43" strokeDasharray="1 4"/><path d="M80 15V145M15 80H145M34 34L126 126M126 34L34 126"/><path d="M80 27L84 75L132 80L84 84L80 132L76 84L28 80L76 76Z"/></svg>
      <div aria-hidden="true" className="pointer-events-none absolute inset-[3%] rounded-[9px] border" style={{borderColor:palette.accent+"66"}}/>
      <div className="absolute inset-x-[6%] top-[7%] flex items-center justify-between gap-1">
        <span className="rounded-full border bg-black/45 px-[5%] py-[1%] font-bold" style={{fontSize:"clamp(8px,4.9cqw,18px)",borderColor:palette.accent,color:palette.light}}>{cover.label}</span>
        <span className="font-bold tracking-tight text-white/90" style={{fontSize:"clamp(7px,4.4cqw,16px)"}}>운보다</span>
      </div>
      <div className="absolute inset-x-[7%] bottom-[7%]">
        <span aria-hidden="true" className="mb-[2%] block h-px w-[23%]" style={{background:palette.accent}}/>
        <p className="break-keep font-black leading-[1.14] tracking-[-0.055em]" style={{fontSize:cover.title.length>11?"clamp(12px,8.4cqw,36px)":"clamp(13px,10.1cqw,40px)",color:palette.light,textShadow:"0 2px 5px #0009"}}>{cover.title}</p>
        <p className="mt-[3%] break-keep font-bold leading-tight text-white" style={{fontSize:"clamp(8px,5.7cqw,22px)",textShadow:"0 1px 4px #000"}}>{cover.hook}</p>
      </div>
    </div>
  );
}
