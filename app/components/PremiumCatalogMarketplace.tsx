"use client";

import { useEffect, useId, useState } from "react";
import type { PremiumCatalogCategoryGroup } from "@/app/lib/premiumCatalog";
import type { PremiumProductDefinition } from "@/app/lib/premiumProductRegistry";
import type { PremiumAnalysisProductState } from "@/app/lib/premiumAnalysisNavigation";
import { getPaidAnalysisTopicConfig } from "@/app/lib/paidAnalysisTopicConfig";
import { getReadablePaidQuestion } from "@/app/lib/premiumQuestionDisplay";
import { getProductPricing } from "@/app/lib/productPricing";
import PremiumProductDetail from "@/app/components/PremiumProductDetail";

type Mode = "topic" | "period";
type Props = {
  topicGroups: readonly PremiumCatalogCategoryGroup[];
  periodProducts: readonly PremiumProductDefinition[];
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  selectedCategory: string | null;
  onSelectCategory: (category: string) => void;
  selectedProductId: string | null;
  onSelectProduct: (productId: string | null) => void;
  profileId?: string;
  stateByProductId: ReadonlyMap<string, PremiumAnalysisProductState>;
  savedProductIds: ReadonlySet<string>;
  recommendedIdSet: ReadonlySet<string>;
};

const COLORS: Record<string, {start:string;end:string;dark:string;light:string}> = {
  money: {start:"#fff8e7", end:"#dfceff",dark:"#9d7128",light:"#f7dd91"},
  career: {start:"#f2f4ff",end:"#d9c8ff",dark:"#6656b1",light:"#f3d3a1"},
  business: {start:"#fff5f0",end:"#ddccff",dark:"#9e654f",light:"#f4cf95"},
  growth: {start:"#f4fff9",end:"#dacfff",dark:"#458779",light:"#d6edab"},
  health: {start:"#f0fff9",end:"#d8d2ff",dark:"#3c877e",light:"#bde8c6"},
  social: {start:"#fff5fa",end:"#dcd2ff",dark:"#a06a91",light:"#f3c7da"},
  relationship: {start:"#fff5fb",end:"#e1c9ff",dark:"#ae6196",light:"#f4c0d4"},
  period: {start:"#fbf7ff",end:"#e5d6ff",dark:"#795bb6",light:"#f6d9a2"},
};
const STATUS: Record<PremiumAnalysisProductState,string> = {
  not_purchased:"",
  none:"구매 완료",
  generating:"분석 중",
  completed:"리포트 완료",
  failed:"생성 재시도",
};
function money(productId:string) {
  return getProductPricing(productId).amount.toLocaleString("ko-KR") + "원";
}
function stableIndex(value:string) {
  let h=7;
  for(const ch of value) h=(h*31+ch.charCodeAt(0))>>>0;
  return h%4;
}

/** Self-contained first-party SVG artwork, never third-party image tracking or copyrighted marketplace thumbnails. */
function CatalogArt({category,seed,wide=false}:{category:string;seed:string;wide?:boolean}) {
  const id=useId().replace(/:/g,"");
  const c=COLORS[category]??COLORS.period;
  const v=stableIndex(seed);
  const shift=[0,12,-12,20][v];
  const fill="url(#fill-"+id+")";
  const shine="url(#shine-"+id+")";
  return (
    <svg viewBox="0 0 480 270" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="h-full w-full">
      <defs>
        <linearGradient id={"fill-"+id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c.start}/><stop offset="100%" stopColor={c.end}/>
        </linearGradient>
        <linearGradient id={"shine-"+id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff9df"/><stop offset="55%" stopColor="#f8d58a"/><stop offset="100%" stopColor="#bd8f47"/>
        </linearGradient>
        <radialGradient id={"glow-"+id}><stop offset="0%" stopColor="#fff" stopOpacity=".92"/><stop offset="100%" stopColor="#fff" stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="480" height="270" fill={fill}/>
      <circle cx={wide?362:350} cy="44" r="118" fill={"url(#glow-"+id+")"}/>
      <path d="M-30 227C93 138 171 252 273 178S421 113 508 149V280H-30Z" fill="#fff" opacity=".4"/>
      <path d="M-30 250C96 171 189 270 308 188S437 164 508 191V290H-30Z" fill="#fff" opacity=".23"/>
      <path d="M42 104C138 3 309 6 416 88" stroke="#f8d991" strokeWidth="3.5" opacity=".8" fill="none"/>
      <path d="M53 103C159 8 311 13 409 91" stroke="#fff" strokeWidth="1" opacity=".9" fill="none"/>
      <g opacity=".84" fill="#fff5ce">
        <path d={"M"+(66+shift)+" 52l5 11 11 5-11 5-5 11-5-11-11-5 11-5Z"}/>
        <path d="M415 160l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>
        <circle cx="405" cy="43" r="3"/><circle cx="124" cy="28" r="2"/>
      </g>
      <g transform={"translate("+shift+" 0)"} strokeLinecap="round" strokeLinejoin="round">
        {category==="money" ? (
          <g>
            <ellipse cx="249" cy="208" rx="121" ry="19" fill="#84599e" opacity=".13"/>
            {[0,1,2,3].map((i)=><g key={i}>
              <rect x={157+i*45} y={174-i*24} width="34" height={38+i*24} rx="9" fill={shine} stroke="#e6b95d" strokeWidth="2"/>
              {[0,1,2].map(j=><path key={j} d={"M"+(159+i*45)+" "+(189-i*20+j*9)+"h30"} stroke="#fff7db" strokeWidth="2" opacity=".8"/>)}
              <ellipse cx={174+i*45} cy={174-i*24} rx="17" ry="7" fill="#fff3bd" stroke="#ce9a48" strokeWidth="2"/>
            </g>)}
            <circle cx="275" cy="202" r="31" fill={shine} stroke="#c9964e" strokeWidth="3"/>
            <circle cx="275" cy="202" r="19" fill="none" stroke="#fff9df" strokeWidth="3"/>
            <path d="M267 202h16m-8-8v16" stroke="#a8763a" strokeWidth="3"/>
          </g>
        ):null}
        {category==="growth" ? (
          <g>
            <path d="M126 184q51-24 99 5v48q-48-28-99-5Zm99 5q53-31 110-5v48q-56-22-110 5Z" fill="#fff9ef" stroke="#a88dcc" strokeWidth="4"/>
            <path d="M225 190v47m-81-40q30-11 62 2m38 0q34-12 69-3" fill="none" stroke="#d4b4cf" strokeWidth="3"/>
            <path d="M225 182v-46" stroke="#648e69" strokeWidth="6"/>
            <path d="M226 150q-58-2-53-45 37-4 53 45Zm3-13q1-42 47-42 0 37-47 42Z" fill="#8ac395" stroke="#549c80" strokeWidth="3"/>
            <circle cx="229" cy="109" r="10" fill="#f7d390" opacity=".7"/>
          </g>
        ):null}
        {category==="health" ? (
          <g>
            <ellipse cx="233" cy="226" rx="91" ry="15" fill="#8b77a5" opacity=".14"/>
            <path d="M169 135h141v62q-4 29-32 29h-79q-30-1-30-29Z" fill="#fff" opacity=".83" stroke="#b2d5cb" strokeWidth="4"/>
            <path d="M310 145q48-7 44 30t-46 25" fill="none" stroke="#b2d5cb" strokeWidth="8"/>
            <path d="M196 132q-10-20 6-30m42 30q-10-20 6-30" stroke="#f4c778" strokeWidth="4" fill="none"/>
            <path d="M215 184q-36-35-1-65 25 20 1 65Zm21 0q2-40 43-51-3 37-43 51Z" fill="#8bcbb4" stroke="#5c9d94" strokeWidth="3"/>
          </g>
        ):null}
        {category==="relationship" ? (
          <g>
            <path d="M237 219C149 165 145 128 178 110q34-17 59 18 25-36 60-18 53 32-60 109Z" fill="#ffe2ee" stroke="#c98da9" strokeWidth="5"/>
            <path d="M237 210C170 163 170 143 190 127q24-14 47 18 23-32 48-18 37 25-48 83Z" fill="none" stroke="#fff" strokeWidth="4" opacity=".85"/>
            <circle cx="183" cy="123" r="8" fill="#f8d79c"/><circle cx="296" cy="123" r="8" fill="#f8d79c"/>
          </g>
        ):null}
        {category==="social" ? (
          <g>
            <path d="M142 222v-16q0-31 37-36h127q38 7 38 36v16" fill="#f7e5fc" stroke="#b98db3" strokeWidth="5"/>
            <circle cx="175" cy="149" r="26" fill="#ffe7d5" stroke="#b78c9f" strokeWidth="4"/>
            <circle cx="304" cy="149" r="26" fill="#ffe7d5" stroke="#b78c9f" strokeWidth="4"/>
            <path d="M186 220v-27q0-35 54-42 54 7 54 42v27" fill="#fff9ff" stroke="#ae8ac4" strokeWidth="5"/>
            <circle cx="240" cy="119" r="34" fill="#ffe5d8" stroke="#ae8ac4" strokeWidth="5"/>
            <path d="M191 102q14-28 42-27m32 0q23 2 35 22" fill="none" stroke="#f5d58b" strokeWidth="4"/>
          </g>
        ):null}
        {category==="career" ? (
          <g>
            <rect x="145" y="115" width="191" height="109" rx="17" fill="#fff9f1" stroke="#b5a0d3" strokeWidth="5"/>
            <rect x="204" y="98" width="73" height="26" rx="11" fill="none" stroke="#aa8ccd" strokeWidth="6"/>
            <path d="M145 162q92 62 191 0" fill="none" stroke="#c4a6d9" strokeWidth="5"/>
            <rect x="225" y="159" width="32" height="24" rx="5" fill={shine} stroke="#bd9155" strokeWidth="2"/>
            <path d="M300 107l33-41m-3 25 3-25-25 3" stroke="#c9a057" strokeWidth="6" fill="none"/>
          </g>
        ):null}
        {category==="business" ? (
          <g>
            <path d="M131 218h218" stroke="#9f8cc4" strokeWidth="5"/>
            {[38,61,90,125].map((h,i)=><rect key={i} x={149+i*49} y={216-h} width="31" height={h} rx="6" fill={i%2===0?"#bc9ae3":"#f0c47a"} stroke="#fff" strokeWidth="3"/>)}
            <path d="M149 146l64-25 53-15 61-50m-25 0h25v25" fill="none" stroke="#b78a4e" strokeWidth="7"/>
            <circle cx="150" cy="146" r="8" fill="#f8d99a"/><circle cx="213" cy="121" r="8" fill="#f8d99a"/><circle cx="266" cy="106" r="8" fill="#f8d99a"/>
          </g>
        ):null}
        {category==="period" ? (
          <g>
            <circle cx="236" cy="160" r="77" fill="#fffdf8" stroke="#d2b3e9" strokeWidth="8"/>
            <circle cx="236" cy="160" r="63" fill="none" stroke="#f1d295" strokeWidth="4" strokeDasharray="3 12"/>
            <path d="M236 114v51l35 24" stroke="#9074ba" strokeWidth="8" fill="none"/>
            <circle cx="236" cy="160" r="8" fill="#d2a668"/>
            <path d="M319 87q30-8 51 15" stroke="#d3a35e" strokeWidth="5" fill="none"/>
            <path d="M369 87v15h-17" stroke="#d3a35e" strokeWidth="5" fill="none"/>
          </g>
        ):null}
      </g>
      <path d="M19 249q98-26 198-2 139-17 246-9" fill="none" stroke="#fff" strokeWidth="2" opacity=".64"/>
      <rect x="0" y="0" width="480" height="270" fill="#fff" opacity={wide?".03":".01"}/>
    </svg>
  );
}

type ReviewSummary = {count:number;averageRating:number|null};
const reviewCache=new Map<string,ReviewSummary|null>();
function VerifiedRating({productId}:{productId:string}) {
  const [summary,setSummary]=useState<ReviewSummary|null>(reviewCache.get(productId)??null);
  useEffect(()=>{
    let live=true;
    if(reviewCache.has(productId)){setSummary(reviewCache.get(productId)??null);return()=>{live=false;};}
    void fetch("/api/reviews?productId="+encodeURIComponent(productId),{cache:"no-store"})
      .then(async r=>r.ok?await r.json() as {summary?:ReviewSummary}:null)
      .then(data=>{
        if(!live)return;
        const next=data?.summary??null;
        reviewCache.set(productId,next);setSummary(next);
      }).catch(()=>undefined);
    return()=>{live=false;};
  },[productId]);
  if(!summary || summary.count<=0 || summary.averageRating===null) return null;
  return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7b547f]" aria-label={"구매 인증 후기 "+summary.averageRating.toFixed(1)+"점, "+summary.count+"개"}>
    <span aria-hidden="true" className="text-[#d59e39]">★</span>{summary.averageRating.toFixed(1)} <span className="text-[#877995]">({summary.count})</span>
  </span>;
}

export default function PremiumCatalogMarketplace({
  topicGroups,periodProducts,mode,onModeChange,selectedCategory,onSelectCategory,selectedProductId,
  onSelectProduct,profileId,stateByProductId,savedProductIds,recommendedIdSet,
}:Props) {
  const defaultGroup=topicGroups.find(g=>g.category==="money")??topicGroups[0];
  const currentGroup=topicGroups.find(g=>g.category===selectedCategory)??defaultGroup;
  const selected=mode==="topic"
    ? currentGroup?.products.find(p=>p.id===selectedProductId)
    : periodProducts.find(p=>p.id===selectedProductId);
  const isPeriod=mode==="period";
  const headerTitle=isPeriod?"기간별 분석":(currentGroup?.label??"주제별 분석");
  const chooseTopic=(category:string)=>{
    if(mode!=="topic")onModeChange("topic");
    onSelectCategory(category);
  };
  const choosePeriod=(id:string)=>{
    if(mode!=="period")onModeChange("period");
    onSelectProduct(id);
  };
  const menuClass=(active:boolean)=>"flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#966ad3] "+(active?"bg-[#eee1ff] text-[#6031a4] shadow-sm":"text-[#675778] hover:bg-white hover:text-[#562e85]");
  return <section id="premium-analysis" aria-label="심층분석 상품 찾기" className="py-5 sm:py-7">
    <div className="grid gap-5 md:grid-cols-[166px_minmax(0,1fr)] lg:grid-cols-[192px_minmax(0,1fr)]">
      <aside className="hidden self-start rounded-[1.4rem] border border-[#e7d8f8] bg-[#faf7ff] p-3 shadow-[0_10px_35px_rgba(113,71,173,.06)] md:block" aria-label="심층 분석 카테고리">
        <p className="px-3 pb-2 text-[11px] font-black tracking-wider text-[#8d69b7]">주제별 분석</p>
        <div className="space-y-1">
          {topicGroups.map(group=><button key={group.category} type="button" aria-pressed={mode==="topic"&&currentGroup?.category===group.category} onClick={()=>chooseTopic(group.category)} className={menuClass(mode==="topic"&&currentGroup?.category===group.category)}>
            <span>{group.label}</span><span className="text-[10px] opacity-65">{group.products.length}</span>
          </button>)}
        </div>
        <div className="mx-2 my-4 border-t border-[#e4d5f4]"/>
        <p className="px-3 pb-2 text-[11px] font-black tracking-wider text-[#8d69b7]">기간별 분석</p>
        <div className="space-y-1">
          {periodProducts.map(product=><button key={product.id} type="button" aria-pressed={isPeriod&&selectedProductId===product.id} onClick={()=>choosePeriod(product.id)} className={menuClass(isPeriod&&selectedProductId===product.id)}>{product.title}</button>)}
        </div>
      </aside>

      <div className="min-w-0">
        <div className="mb-4 md:hidden" aria-label="모바일 심층분석 카테고리">
          <p className="mb-2 text-xs font-black text-[#69449c]">주제별 분석</p>
          <div className="flex gap-2 overflow-x-auto pb-3">
            {topicGroups.map(group=><button key={group.category} type="button" aria-pressed={mode==="topic"&&currentGroup?.category===group.category} onClick={()=>chooseTopic(group.category)} className={"shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold "+(mode==="topic"&&currentGroup?.category===group.category?"border-[#ad84e8] bg-[#edddff] text-[#542d91]":"border-[#e5d7f5] bg-white text-[#756384]")}>{group.label}</button>)}
          </div>
          <p className="mb-2 mt-1 text-xs font-black text-[#69449c]">기간별 분석</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {periodProducts.map(product=><button key={product.id} type="button" aria-pressed={isPeriod&&selectedProductId===product.id} onClick={()=>choosePeriod(product.id)} className={"shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold "+(isPeriod&&selectedProductId===product.id?"border-[#ad84e8] bg-[#edddff] text-[#542d91]":"border-[#e5d7f5] bg-white text-[#756384]")}>{product.title}</button>)}
          </div>
        </div>

        {selected ? (
          <div className="overflow-hidden rounded-[1.8rem] border border-[#e7daf8] bg-white shadow-[0_15px_40px_rgba(90,57,152,.08)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#f0e8f9] px-5 py-4 sm:px-6">
              <button type="button" onClick={()=>onSelectProduct(null)} className="rounded-full border border-[#e1d2f4] px-4 py-2 text-xs font-bold text-[#69449e] hover:bg-[#f6efff]">← {isPeriod?"기간 선택":"상품 목록"}</button>
              <span className="text-xs font-semibold text-[#9a88aa]">{isPeriod?"기간별 분석":currentGroup?.label}</span>
            </div>
            <div className="grid gap-4 bg-[linear-gradient(130deg,#ffffff,#f8f0ff)] p-5 sm:grid-cols-[180px_1fr] sm:items-center sm:p-6">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-white/80 shadow-[0_10px_25px_rgba(107,75,163,.13)]">
                <CatalogArt category={isPeriod?"period":(currentGroup?.category??"period")} seed={selected.id} wide/>
              </div>
              <div>
                <p className="text-xs font-bold text-[#8b57bf]">{isPeriod?"기간별":"주제별"} · 심층분석</p>
                <h2 className="mt-2 text-xl font-black leading-snug text-[#2b1646] sm:text-2xl">{selected.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#645571]">{isPeriod?selected.purchaseDecision?.primaryQuestion:getPaidAnalysisTopicConfig(selected.id)?.purchaseDecision?.decisionQuestion}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="text-lg font-black text-[#3a2059]">{money(selected.id)}</span>
                  <VerifiedRating productId={selected.id}/>
                </div>
              </div>
            </div>
            <div className="p-3 sm:p-5">
              <PremiumProductDetail
                key={selected.id}
                product={selected}
                state={stateByProductId.get(selected.id)??"not_purchased"}
                profileId={profileId}
                onClear={()=>onSelectProduct(null)}
                isSaved={savedProductIds.has(selected.id)}
              />
            </div>
          </div>
        ) : !isPeriod && currentGroup ? (
          <div>
            <div className="overflow-hidden rounded-[1.7rem] border border-[#eadcf8] bg-white shadow-[0_12px_35px_rgba(112,69,173,.07)]">
              <div className="grid sm:grid-cols-[170px_1fr]">
                <div className="hidden max-h-[155px] sm:block"><CatalogArt category={currentGroup.category} seed={currentGroup.category} wide/></div>
                <div className="px-5 py-5 sm:px-6">
                  <p className="text-[11px] font-black tracking-wider text-[#9164bc]">주제별 심층분석</p>
                  <h2 className="mt-1 text-2xl font-black text-[#2b1646]">{headerTitle}</h2>
                  <p className="mt-2 text-sm text-[#6c5b7c]">관심 가는 상품을 선택하면 자세한 설명과 구매 정보를 볼 수 있어요.</p>
                  <span className="mt-3 inline-flex rounded-full bg-[#f1e7fe] px-3 py-1 text-xs font-semibold text-[#7843b2]">{currentGroup.products.length}개 분석 상품</span>
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {currentGroup.products.map(product=>{
                const config=getPaidAnalysisTopicConfig(product.id);
                const question=config?.purchaseDecision?.decisionQuestion;
                const state=stateByProductId.get(product.id)??"not_purchased";
                return <button key={product.id} type="button" onClick={()=>onSelectProduct(product.id)} className="group overflow-hidden rounded-[1.45rem] border border-[#eadff5] bg-white text-left shadow-[0_10px_28px_rgba(110,76,165,.07)] transition hover:-translate-y-1 hover:border-[#c49be8] hover:shadow-[0_18px_35px_rgba(110,76,165,.15)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9164d1]" aria-label={product.title+" 상세 정보 보기"}>
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#f8f1ff]">
                    <CatalogArt category={currentGroup.category} seed={product.id}/>
                    {recommendedIdSet.has(product.id)?<span className="absolute left-3 top-3 rounded-full bg-[#6c3ab7] px-2.5 py-1 text-[10px] font-bold text-white shadow">내 추천</span>:null}
                    {state!=="not_purchased"?<span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-[#5b4481]">{STATUS[state]}</span>:null}
                  </div>
                  <div className="space-y-2 px-4 pb-4 pt-3.5">
                    <p className="text-[11px] font-semibold text-[#9265b6]">{product.title}</p>
                    <h3 className="line-clamp-2 min-h-[2.8rem] text-[15px] font-extrabold leading-[1.4] text-[#302044] transition group-hover:text-[#753aba]">{getReadablePaidQuestion(product.id,question??product.title)}</h3>
                    <div className="flex flex-wrap items-end justify-between gap-2 pt-1">
                      <div className="flex min-h-5 items-center"><VerifiedRating productId={product.id}/></div>
                      <span className="text-sm font-black text-[#372049]">{money(product.id)}</span>
                    </div>
                    <p className="border-t border-[#f0e7f6] pt-2 text-xs font-bold text-[#7043ae]">상세 정보 보기 →</p>
                  </div>
                </button>;
              })}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[1.7rem] border border-[#e8d8f9] bg-white text-center shadow-sm">
            <div className="h-44"><CatalogArt category="period" seed="time-chooser" wide/></div>
            <div className="px-6 pb-9 pt-5">
              <h2 className="text-xl font-black text-[#2b1646]">어느 시기의 운이 궁금하세요?</h2>
              <p className="mt-2 text-sm leading-7 text-[#665675]">기간을 선택하면 별도의 상품 목록 없이 해당 분석의 상세 정보가 바로 열립니다.</p>
              <p className="mt-3 text-xs text-[#8c72a1]">왼쪽 목록 또는 위 기간 메뉴에서 선택하세요.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  </section>;
}
