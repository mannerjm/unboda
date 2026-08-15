"use client";

import ReactMarkdown from "react-markdown";
import type { AnalyzeSuccessResponse } from "@/app/lib/analyzeApiTypes";
import { parseFreeAnalysisAIInterpretation } from "@/app/lib/freeAnalysisAIInterpretation";

type Props = { analysis: AnalyzeSuccessResponse };

const stemHanja: Record<string, string> = { 갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊", 기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸" };
const branchHanja: Record<string, string> = { 자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳", 오: "午", 미: "未", 신: "申", 유: "酉", 술: "戌", 해: "亥" };
function toHanja(ganji: string): string { return `${stemHanja[ganji[0]] ?? ganji[0] ?? ""}${branchHanja[ganji[1]] ?? ganji[1] ?? ""}`; }

export default function FreeAnalysisPresentation({ analysis }: Props) {
  const free = analysis.freeAnalysis ?? analysis.saju;
  const pillars = [
    { label: "시주", stem: free.hourStem, branch: free.hourBranch, tenGod: free.hourTenGod, branchTenGod: free.hourBranchTenGod, hiddenStems: free.hourHiddenStems, stage: free.hourStage, spirit: free.hourSpirit, nobles: free.hourNobles },
    { label: "일주", stem: free.dayStem, branch: free.dayBranch, tenGod: free.dayTenGod, branchTenGod: free.dayBranchTenGod, hiddenStems: free.dayHiddenStems, stage: free.dayStage, spirit: free.daySpirit, nobles: free.dayNobles },
    { label: "월주", stem: free.monthStem, branch: free.monthBranch, tenGod: free.monthTenGod, branchTenGod: free.monthBranchTenGod, hiddenStems: free.monthHiddenStems, stage: free.monthStage, spirit: free.monthSpirit, nobles: free.monthNobles },
    { label: "년주", stem: free.yearStem, branch: free.yearBranch, tenGod: free.yearTenGod, branchTenGod: free.yearBranchTenGod, hiddenStems: free.yearHiddenStems, stage: free.yearStage, spirit: free.yearSpirit, nobles: free.yearNobles },
  ];
  const elements = free.elementAnalysis;
  const interpretation = parseFreeAnalysisAIInterpretation(analysis.result);
  const sections = [
    ["한눈에 보는 핵심", interpretation.overview], ["원국과 신강·신약", interpretation.strength],
    ["오행 분석", interpretation.fiveElements], ["용신 해석", interpretation.yongshin],
    ["격국 해석", interpretation.gyeokguk], ["현재 대운", interpretation.daeun],
    ["현재 세운", interpretation.seun], ["재물 흐름", interpretation.wealth],
    ["관계 흐름", interpretation.relationship], ["건강·생활 리듬", interpretation.health],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  return <>
    <section className="mb-8 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
      <div className="mb-7 flex items-end justify-between"><div><p className="text-xs tracking-[0.3em] text-stone-500">FOUR PILLARS</p><h2 className="mt-2 text-2xl font-bold">사주팔자</h2></div><p className="text-sm text-stone-500">시 · 일 · 월 · 년</p></div>
      <div className="grid grid-cols-4 gap-2 sm:gap-4">{pillars.map((pillar) => <div key={pillar.label} className={`overflow-hidden rounded-2xl border text-center ${pillar.label === "일주" ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-stone-50"}`}><p className="border-b border-current/20 px-2 py-3 text-sm font-semibold">{pillar.label}</p><div className="p-4"><p className="text-[11px] opacity-60">천간 · {pillar.tenGod}</p><p className="mt-2 text-4xl font-bold">{pillar.stem}</p></div><div className="border-t border-current/20 p-4"><p className="text-[11px] opacity-60">지지 · {pillar.branchTenGod}</p><p className="mt-2 text-4xl font-bold">{pillar.branch}</p>{pillar.hiddenStems?.length ? <><p className="mt-3 text-[10px] opacity-60">지장간</p><div className="mt-1 flex flex-wrap justify-center gap-1">{pillar.hiddenStems.map((stem) => <span key={stem} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{stem}</span>)}</div></> : null}{pillar.stage ? <p className="mt-3 text-xs">십이운성 · {pillar.stage}</p> : null}{pillar.spirit ? <p className="mt-2 text-xs">신살 · {pillar.spirit}</p> : null}{pillar.nobles?.map((noble) => <p key={noble} className="mt-2 text-xs font-semibold">{noble}</p>)}</div></div>)}</div>
      <p className="mt-6 text-center text-xs text-stone-500">일주는 본인을 중심으로 보는 기둥이므로 강조해 표시했습니다.</p>
    </section>
    {free.daeunAnalysis ? <section className="mb-8 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm"><p className="text-xs tracking-[0.25em] text-stone-500">DAEUN ANALYSIS</p><h2 className="mt-2 text-2xl font-bold">대운 분석</h2><div className="mt-5 grid grid-cols-2 gap-4"><Metric label="대운 방향" value={free.daeunAnalysis.direction} /><Metric label="대운 시작" value={`${free.daeunAnalysis.startAge}세`} /></div><div className="mt-5 grid grid-cols-5 gap-2">{free.daeunAnalysis.daeuns.map((item) => { const current = free.currentDaeun?.order === item.order; return <div key={item.order} className={`rounded-xl p-3 text-center ${current ? "bg-stone-900 text-white" : "bg-stone-50"}`}><p className="text-xs opacity-70">{current ? "현재 " : ""}{item.order}대운</p><p className="mt-1 text-2xl font-bold">{toHanja(item.ganji)}</p><p className="mt-1 text-xs">{item.ganji} · {free.daeunAnalysis!.startAge + (item.order - 1) * 10}세</p></div>; })}</div></section> : null}
    <section className="mb-8 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm"><p className="text-xs tracking-[0.25em] text-stone-500">FIVE ELEMENTS</p><h2 className="mt-2 text-2xl font-bold">오행 분포</h2><div className="mt-6 space-y-4">{Object.entries(elements.percentages).map(([element, percentage]) => <div key={element}><div className="flex justify-between text-sm"><span className="font-semibold">{element}</span><span>{percentage}%</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-stone-800" style={{ width: `${Math.min(percentage, 100)}%` }} /></div></div>)}</div><div className="mt-6 grid grid-cols-2 gap-4"><Metric label="가장 강한 오행" value={elements.strongest.join(", ")} /><Metric label="가장 약한 오행" value={elements.weakest.join(", ")} /></div></section>
    <section className="mb-8 grid gap-5 sm:grid-cols-2"><Card title="신강·신약 참고 지표"><p className="text-lg font-bold">{free.strengthAnalysis.level}</p><p className="mt-3 text-sm leading-7 text-stone-700">{free.strengthAnalysis.summary}</p></Card><Card title="용신 분석"><p className="font-semibold">주 용신: {free.yongshinAnalysis.primary}</p><p className="mt-3 text-sm text-stone-700">보조 용신: {free.yongshinAnalysis.secondary.join(", ") || "없음"}</p><p className="mt-3 text-sm leading-7 text-stone-700">{free.yongshinAnalysis.reason}</p></Card><Card title="격국 분석"><p className="font-semibold">주 격국: {free.gyeokgukAnalysis.primary}</p><p className="mt-3 text-sm text-stone-700">후보: {free.gyeokgukAnalysis.candidates.join(", ") || "없음"}</p><p className="mt-3 text-sm leading-7 text-stone-700">{free.gyeokgukAnalysis.reason}</p></Card><Card title="오행 해석"><div className="space-y-3">{free.elementInterpretation.items.map((item) => <div key={item.element} className="rounded-xl bg-stone-50 p-3"><p className="font-semibold">{item.element} · {item.level}</p><p className="mt-1 text-sm leading-6 text-stone-700">{item.description}</p></div>)}</div></Card></section>
    {analysis.saju.elementRelations ? <section className="mb-8 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm"><p className="text-xs tracking-[0.25em] text-stone-500">ELEMENT RELATIONS</p><h2 className="mt-2 text-2xl font-bold">오행 상생·상극</h2><p className="mt-4 text-sm leading-7 text-stone-600">{analysis.saju.elementRelations.summary}</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{analysis.saju.elementRelations.highlights.map((item, index) => <div key={`${item.source}-${item.target}-${index}`} className="rounded-xl bg-stone-50 p-4"><p className="font-semibold">{item.source} → {item.target} · {item.type}</p><p className="mt-2 text-sm leading-6 text-stone-700">{item.description}</p></div>)}</div></section> : null}
    <section className="mb-8 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm"><p className="text-xs tracking-[0.25em] text-stone-500">AI ANALYSIS</p><h2 className="mt-2 text-2xl font-bold">운보다 AI 종합 해석</h2>{sections.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2">{sections.map(([title, text]) => <div key={title} className="rounded-2xl bg-stone-50 p-5"><h3 className="font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-stone-700">{text}</p></div>)}</div> : <div className="mt-5 text-sm leading-7 text-stone-700"><ReactMarkdown>{analysis.result}</ReactMarkdown></div>}</section>
  </>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-stone-50 p-4"><p className="text-xs text-stone-500">{label}</p><p className="mt-2 font-bold">{value}</p></div>; }
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">{title}</h2><div className="mt-4">{children}</div></section>; }