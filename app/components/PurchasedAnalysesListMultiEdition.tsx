import Link from "next/link";
import type { PurchasedAnalysisProductGroup } from "@/app/lib/purchasedAnalysesGrouping";
import Phase9NextAnalysisCards from "@/app/components/Phase9NextAnalysisCards";
import type { Phase9NextAnalysisRecommendation } from "@/app/lib/phase9NextAnalysis";
import { getPremiumProductDisplayTitle } from "@/app/lib/premiumPresentation";
import {
  getCompatibilityPairReportPath,
  getSpecialAnalysisProduct,
  isCompatibilityFamilyOtherProductId,
  isCompatibilityFamilyParentChildProductId,
  isCompatibilityFamilySiblingProductId,
  isCompatibilityPairProductId,
} from "@/app/lib/specialAnalysisProducts";

const statusLabels: Record<string, string> = {
  none: "리포트 준비 중",
  generating: "리포트 준비 중",
  completed: "바로 열 수 있어요",
  failed: "다시 준비가 필요해요",
};

const statusClasses: Record<string, string> = {
  none: "border-slate-200 bg-slate-50 text-slate-600",
  generating: "border-slate-200 bg-slate-50 text-slate-600",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
};

type PurchasedAnalysesListProps = {
  groups: readonly PurchasedAnalysisProductGroup[];
  profileId: string;
  previewMode?: boolean;
  phase9Recommendations?: readonly Phase9NextAnalysisRecommendation[];
};

function compatibilityEditionLabel(productId: string, editionKey: string | null): string {
  const pair = editionKey?.match(/^PAIR_YEAR:(\d{4}):[a-f0-9]{16}$/);
  if (pair && isCompatibilityPairProductId(productId)) {
    return `${pair[1]}년 ${getSpecialAnalysisProduct(productId)?.shortTitle ?? "궁합"}`;
  }
  const parentChild = editionKey?.match(/^FAMILY_PARENT_CHILD_YEAR:(\d{4}):[a-f0-9]{16}$/);
  if (parentChild) return `${parentChild[1]}년 부모·자녀 궁합`;
  const siblings = editionKey?.match(/^FAMILY_SIBLINGS_YEAR:(\d{4}):[a-f0-9]{16}$/);
  if (siblings) return `${siblings[1]}년 형제·자매 궁합`;
  const other = editionKey?.match(/^FAMILY_OTHER_YEAR:(\d{4}):[a-f0-9]{16}$/);
  if (other) return `${other[1]}년 기타 가족 궁합`;
  if (isCompatibilityFamilyParentChildProductId(productId)) return "부모·자녀 궁합";
  if (isCompatibilityFamilySiblingProductId(productId)) return "형제·자매 궁합";
  if (isCompatibilityFamilyOtherProductId(productId)) return "기타 가족 궁합";
  return "궁합 분석";
}

function formatAcquiredDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "보관 중";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function acquisitionLabel(source: PurchasedAnalysisProductGroup["editions"][number]["acquisitionSource"]): string {
  return source === "purchase" ? "구매" : "보관 시작";
}

function getDisplayTitle(group: PurchasedAnalysisProductGroup): string {
  const specialProduct = getSpecialAnalysisProduct(group.productId);
  return specialProduct?.title ?? getPremiumProductDisplayTitle(group.productId, group.productName);
}

function getCategoryLabel(group: PurchasedAnalysisProductGroup): string {
  return getSpecialAnalysisProduct(group.productId)?.categoryLabel ?? "심층 분석";
}

function getEditionLabel(
  group: PurchasedAnalysisProductGroup,
  edition: PurchasedAnalysisProductGroup["editions"][number],
): string {
  const isCompatibility =
    isCompatibilityPairProductId(group.productId)
    || isCompatibilityFamilyParentChildProductId(group.productId)
    || isCompatibilityFamilySiblingProductId(group.productId)
    || isCompatibilityFamilyOtherProductId(group.productId);

  return isCompatibility
    ? compatibilityEditionLabel(group.productId, edition.analysisEditionKey)
    : edition.editionLabel;
}

function reportHref(
  group: PurchasedAnalysisProductGroup,
  profileId: string,
  editionKey: string | null,
  previewMode: boolean,
): string {
  if (previewMode) return "/admin/report-preview";

  const editionQuery = editionKey ? `&edition=${encodeURIComponent(editionKey)}` : "";

  if (isCompatibilityPairProductId(group.productId)) {
    return `${getCompatibilityPairReportPath(group.productId)}?profileId=${encodeURIComponent(profileId)}${editionQuery}`;
  }
  if (isCompatibilityFamilyParentChildProductId(group.productId)) {
    return `/special-analysis/compatibility/family/parent-child/report?profileId=${encodeURIComponent(profileId)}${editionQuery}`;
  }
  if (isCompatibilityFamilySiblingProductId(group.productId)) {
    return `/special-analysis/compatibility/family/siblings/report?profileId=${encodeURIComponent(profileId)}${editionQuery}`;
  }
  if (isCompatibilityFamilyOtherProductId(group.productId)) {
    return `/special-analysis/compatibility/family/other/report?profileId=${encodeURIComponent(profileId)}${editionQuery}`;
  }

  return `/paid-analysis/${encodeURIComponent(group.productId)}/report?profileId=${encodeURIComponent(profileId)}${editionQuery}`;
}

export default function PurchasedAnalysesList({
  groups,
  profileId,
  previewMode = false,
  phase9Recommendations = [],
}: PurchasedAnalysesListProps) {
  if (groups.length === 0) {
    return (
      <section className="mt-6 rounded-[1.75rem] border border-[#dce1ef] bg-white px-6 py-12 text-center shadow-sm">
        <p className="text-lg font-bold text-[#11162d]">아직 보관된 유료 분석이 없습니다.</p>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-slate-600">
          필요한 질문이 생기면 심층 분석이나 전문 분석을 둘러보세요. 구매한 리포트는 이곳에 프로필별로 모입니다.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/deep-analysis" className="rounded-2xl bg-[#6f5ce7] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#5f4fd2]">
            심층 분석 둘러보기
          </Link>
          <Link href="/special-analysis" className="rounded-2xl border border-[#dce1ef] bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-[#f7f8fc]">
            전문 분석 둘러보기
          </Link>
        </div>
      </section>
    );
  }

  const allEditions = groups
    .flatMap((group) => group.editions.map((edition) => ({ group, edition })))
    .sort((a, b) => b.edition.acquiredAt.localeCompare(a.edition.acquiredAt));
  const recent = allEditions[0]!;
  const completedCount = allEditions.filter(({ edition }) => edition.reportStatus === "completed").length;
  const preparingCount = allEditions.filter(({ edition }) =>
    edition.reportStatus === "none" || edition.reportStatus === "generating",
  ).length;
  const recentReportHref = reportHref(recent.group, profileId, recent.edition.analysisEditionKey, previewMode);
  const recentEditionLabel = getEditionLabel(recent.group, recent.edition);
  const consultingHubHref = previewMode
    ? "/admin/ai-consulting-preview"
    : `/ai-consulting?profileId=${encodeURIComponent(profileId)}`;

  return (
    <div className="mt-6">
      <section className="overflow-hidden rounded-[2rem] border border-[#d8d3ff] bg-[radial-gradient(circle_at_82%_14%,rgba(112,88,229,0.13),transparent_26%),linear-gradient(145deg,#ffffff_0%,#f7f6ff_100%)] p-5 shadow-[0_18px_48px_rgba(43,45,94,0.08)] sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.15em] text-[#6f5ce7]">RECENT</p>
            <h2 className="mt-2 text-xl font-black text-[#11162d]">최근 이어보기</h2>
            <p className="mt-4 text-xs font-bold tracking-[0.12em] text-slate-500">{getCategoryLabel(recent.group)}</p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.025em] text-[#11162d]">{getDisplayTitle(recent.group)}</h3>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="rounded-full border border-[#d8d3ff] bg-white px-3 py-1.5 font-semibold text-[#5e4bd1]">{recentEditionLabel}</span>
              <span>
                {acquisitionLabel(recent.edition.acquisitionSource)} · {formatAcquiredDate(recent.edition.acquiredAt)}
              </span>
            </div>
            <span className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${statusClasses[recent.edition.reportStatus]}`}>
              {statusLabels[recent.edition.reportStatus]}
            </span>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href={recentReportHref} className="rounded-2xl bg-[#171a3d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#242957]">
              {recent.edition.reportStatus === "failed" ? "다시 준비하기" : recent.edition.reportStatus === "none" || recent.edition.reportStatus === "generating" ? "리포트 준비 화면 보기" : "리포트 보기"}
            </Link>
          </div>
        </div>
      </section>

      <section className="relative mt-4 overflow-hidden rounded-[1.9rem] border border-[#4d4f87] bg-[radial-gradient(circle_at_86%_12%,rgba(128,105,255,.28),transparent_30%),linear-gradient(135deg,#111734_0%,#1a1942_55%,#282052_100%)] p-5 text-white shadow-[0_18px_50px_rgba(28,31,76,0.16)] sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[#7b61ff]/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-black tracking-[0.15em] text-[#b5aaff]">UNBODA AI CONSULTING · 핵심 기능</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.025em]">리포트가 끝나도, 상담은 계속 이어집니다</h2>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              질문권은 상품별로 나뉘지 않습니다. 완료된 구매 분석이 늘어날수록 AI 상담 범위가 자동으로 넓어지고, 질문마다 관련 리포트를 자동으로 연결합니다. 출생정보를 변경한 경우 변경 전 리포트와 상담은 이전 정보 기준으로 보관되며 일반 자동 상담 범위와 섞이지 않습니다. 이전 상담 기록과 내가 직접 저장한 기억도 각 상담 경계에 맞춰 이어서 참고합니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#ddd8ff]">
              <span className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-2">보유 리포트 통합</span>
              <span className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-2">상담 기록 이어보기</span>
              <span className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-2">직접 저장한 기억 참고</span>
            </div>
          </div>
          <Link
            href={consultingHubHref}
            className="shrink-0 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-[#191833] shadow-[0_12px_28px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-[#eeeaff]"
          >
            통합 AI 상담 바로가기
          </Link>
        </div>
      </section>

      <section className="mt-6" aria-labelledby="purchased-library-heading">
        <div className="flex flex-col gap-3 border-b border-[#dce1ef] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.15em] text-[#6f5ce7]">MY LIBRARY</p>
            <h2 id="purchased-library-heading" className="mt-2 text-2xl font-black text-[#11162d]">전체 보관함</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">연도판과 분석 상태를 확인하고, 완료된 리포트는 언제든 다시 열 수 있습니다.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-[#eef0f6] px-3 py-2 text-slate-600">보관 {allEditions.length}개</span>
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-800">완료 {completedCount}개</span>
            {preparingCount > 0 ? (
              <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-600">준비 중 {preparingCount}개</span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {groups.map((group) => {
            const specialProduct = getSpecialAnalysisProduct(group.productId);
            const isCompatibility =
              isCompatibilityPairProductId(group.productId)
              || isCompatibilityFamilyParentChildProductId(group.productId)
              || isCompatibilityFamilySiblingProductId(group.productId)
              || isCompatibilityFamilyOtherProductId(group.productId);

            return (
              <article key={group.productId} className="rounded-[1.75rem] border border-[#dce1ef] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold tracking-[0.12em] text-slate-500">{specialProduct?.categoryLabel ?? "심층 분석"}</p>
                    <h3 className="mt-2 text-lg font-black text-[#11162d]">{getDisplayTitle(group)}</h3>
                  </div>
                  <span className="self-start rounded-full bg-[#f3f1ff] px-3 py-1.5 text-xs font-bold text-[#5e4bd1]">
                    {group.editions.length > 1 ? `${group.editions.length}개 연도판·에디션` : "1개 보관"}
                  </span>
                </div>

                <div className="mt-4 divide-y divide-[#e7eaf2]">
                  {group.editions.map((edition) => {
                    const href = reportHref(group, profileId, edition.analysisEditionKey, previewMode);
                    const displayEditionLabel = getEditionLabel(group, edition);
                    const isPreparing = edition.reportStatus === "none" || edition.reportStatus === "generating";

                    return (
                      <div key={edition.analysisEditionKey ?? "legacy"} className="grid gap-4 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[15px] font-bold text-[#11162d]">{displayEditionLabel}</p>
                            {!isCompatibility && edition.isLatest && group.editions.length > 1 ? (
                              <span className="rounded-full bg-[#f3f1ff] px-2.5 py-1 text-xs font-bold text-[#5e4bd1]">최신 연도판</span>
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                            <span>{acquisitionLabel(edition.acquisitionSource)} · {formatAcquiredDate(edition.acquiredAt)}</span>
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses[edition.reportStatus]}`}>
                              {statusLabels[edition.reportStatus]}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <Link href={href} className="rounded-xl border border-[#cfd5e6] bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-[#f7f8fc]">
                            {edition.reportStatus === "failed" ? "다시 준비하기" : isPreparing ? "리포트 준비 화면 보기" : "리포트 보기"}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section data-next-question-slot="phase9" className="mt-6 rounded-[1.75rem] border border-[#dce1ef] bg-[#f9faff] p-5 sm:p-6">
        <p className="text-xs font-bold tracking-[0.15em] text-[#6f5ce7]">NEXT QUESTION · PHASE 9</p>
        <h2 className="mt-2 text-xl font-black text-[#11162d]">다음 질문이 생겼다면</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-slate-700">
          보관한 리포트와 현재 보유한 exact edition을 기준으로, 겹치지 않는 다음 분석을 최대 2개만 제안합니다.
        </p>
        {phase9Recommendations.length > 0 ? (
          <Phase9NextAnalysisCards recommendations={phase9Recommendations} compact />
        ) : (
          <>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              지금 바로 이어지는 추천이 없으면 다른 심층 분석이나 전문 분석을 둘러볼 수 있습니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/deep-analysis" className="rounded-2xl bg-[#171a3d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#242957]">
                심층 분석 둘러보기
              </Link>
              <Link href="/special-analysis" className="rounded-2xl border border-[#dce1ef] bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-[#f7f8fc]">
                전문 분석 보기
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
