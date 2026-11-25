import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import AppShell from "@/app/components/AppShell";
import NewYearTeacherCard from "@/app/components/NewYearTeacherCard";
import { getServerAnchorDate, parseAnchorDate } from "@/app/lib/analysisReferencePeriod";
import { newYearTargetYear, NEW_YEAR_DOMAINS, isNewYearSalePending } from "@/app/lib/newYearFortune";
import { buildPublicMetadata } from "@/app/lib/seo";
import { isProfileId } from "@/app/lib/profiles/types";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getUserProfile } from "@/app/lib/profiles/server";
import { notFound } from "next/navigation";
import { getProductPricing } from "@/app/lib/productPricing";
export const dynamic="force-dynamic";
export const metadata:Metadata=buildPublicMetadata({title:"신년운세 · 운보다",description:"나의 사주로 살펴보는 새해 총운과 분야별 운세, 열두 달의 흐름",path:"/new-year"});
export default async function NewYearPage({searchParams}:{searchParams:Promise<{profileId?:string}>}) {
  const {profileId}=await searchParams;
  const user = await getCurrentUser();
  if (profileId && !isProfileId(profileId)) notFound();
  const profile = user ? (profileId ? await getUserProfile(profileId, user.id) : await getActiveProfile(user.id)) : null;
  if (user && profileId && !profile) notFound();
  const year=newYearTargetYear(parseAnchorDate(getServerAnchorDate()));
  const href="/paid-analysis/new-year-fortune"+(profile ? `?profileId=${encodeURIComponent(profile.id)}` : "");
  return <AppShell activeProfileId={profile?.id}><main className="min-h-screen bg-[#f7f2fc] px-4 py-6 sm:px-8 sm:py-10 text-[#281744]"><div className="mx-auto max-w-5xl">
    <section className="overflow-hidden rounded-[2rem] border border-[#ecd7bf] bg-[#fff8ed] shadow-sm">
      <Image src={year === 2027 ? "/images/premium/2027-jeongmi-red-sheep.webp" : "/images/premium/new-year-fortune.svg"} alt={year === 2027 ? "2027년 정미년을 상징하는 붉은 양과 황금빛 새해 풍경" : "새해를 상징하는 일출 풍경"} width={960} height={420} className="w-full h-auto" priority unoptimized />
      <div className="p-5 sm:p-8"><p className="font-bold text-sm text-[#975a33]">{year === 2027 ? "2027 정미년(丁未年) · 붉은 양의 해" : "새해, 나의 운을 알아보는 시간"}</p>
      <h1 className="mt-2 break-keep text-3xl font-black sm:text-4xl">{year}년 신년운세</h1><p className="mt-3 text-base leading-7 text-[#735b50]">고객님의 실제 사주로 살펴보는 새해 총운과 분야별 흐름, 1월부터 12월까지의 개인 맞춤 분석입니다.</p>
      {profile ? <p className="mt-4 rounded-xl border border-[#ecd7bf] bg-white/70 px-4 py-3 text-sm text-[#735b50]">현재 분석 대상: <strong>{profile.label}</strong></p> : null}
      {isNewYearSalePending("new-year-fortune") ? <p className="mt-4 text-sm font-bold text-[#975a33]">정식 판매 준비 중 · 상품 미리보기</p> : null}
      <p className="mt-5 text-2xl font-black">{getProductPricing("new-year-fortune").amount.toLocaleString("ko-KR")}원</p><Link href={href} className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#a44332] px-5 py-3 font-bold text-white sm:w-auto">{year}년 신년운세 보기</Link></div>
    </section>
    <section className="mt-5 rounded-2xl bg-white p-5 sm:p-7"><h2 className="text-xl font-bold">한 해를 분야별로 살펴보세요</h2><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{NEW_YEAR_DOMAINS.map(label=><div key={label} className="min-w-0 break-keep rounded-xl bg-[#f5eefb] px-3 py-4 text-sm font-bold">{label}</div>)}</div><h3 className="mt-5 font-bold">열두 달의 흐름과 실천 계획</h3><p className="mt-2 text-sm leading-6">매월 중요한 흐름과 행동·주의 기준을 확인하고, 구매 보관함에서 다시 읽을 수 있습니다. 구매 후 운담 AI 상담은 기존 질문권으로 이용합니다.</p></section>
    <NewYearTeacherCard variant="list" />
    <p className="mt-4 text-sm leading-6 text-slate-600">명리 해석은 참고용이며 미래 사건이나 결과를 보장하지 않습니다. 기존 내년 운은 다음 해의 변화와 사전 준비 중심 분석입니다.</p>
  </div></main></AppShell>;
}