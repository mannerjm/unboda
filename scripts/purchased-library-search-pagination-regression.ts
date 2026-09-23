import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  LIBRARY_PAGE_SIZE,
  parseLibraryParams,
  purchasedLibraryHref,
  selectPurchasedLibraryPage,
  type LibraryFilters,
} from "../app/lib/purchasedAnalysesLibrary";
import type { PurchasedAnalysisProductGroup } from "../app/lib/purchasedAnalysesGrouping";

const filters: LibraryFilters = { query: "", kind: "all", order: "newest" };
const makeEdition = (day: number) => ({
  analysisEditionKey: `YEAR:${2000 + day}`,
  reportStatus: "completed" as const,
  editionLabel: `${2000 + day}년 분석`,
  isLatest: day === 46,
  acquiredAt: new Date(Date.UTC(2026, 0, day)).toISOString(),
  acquisitionSource: "purchase" as const,
});
const deep: PurchasedAnalysisProductGroup = {
  profileId: "profile-A",
  productId: "wealth",
  productName: "재물운 심층 분석",
  latestAcquiredAt: makeEdition(46).acquiredAt,
  editions: Array.from({ length: 46 }, (_, i) => makeEdition(i + 1)),
};
const special: PurchasedAnalysisProductGroup = {
  profileId: "profile-A",
  productId: "compatibility-romantic",
  productName: "연인·배우자 궁합 분석",
  latestAcquiredAt: new Date(Date.UTC(2026, 2, 4)).toISOString(),
  editions: Array.from({ length: 4 }, (_, i) => ({
    ...makeEdition(1),
    analysisEditionKey: `PAIR_YEAR:2026:000000000000000${i}`,
    acquiredAt: new Date(Date.UTC(2026, 2, i + 1)).toISOString(),
  })),
};
const foreign: PurchasedAnalysisProductGroup = {
  ...deep, profileId: "profile-B",
  editions: [{ ...makeEdition(42), analysisEditionKey: "YEAR:2100" }],
};
// The caller MUST pass only the active profile's groups; the filter does not
// mix account-wide purchases or invent a redundant target selector.
const activeGroups = [deep, special];
const pages = [1, 2, 3].map((page) => selectPurchasedLibraryPage(activeGroups, filters, page));
assert.equal(pages[0].total, 50);
assert.equal(pages[0].totalPages, 3);
assert.equal(pages[0].from, 1);
assert.equal(pages[0].to, LIBRARY_PAGE_SIZE);
assert.equal(pages[2].from, 41);
assert.equal(pages[2].to, 50);
const editions = pages.flatMap((p) => p.groups.flatMap((group) => group.editions));
assert.equal(editions.length, 50, "every purchased edition must appear on exactly one page");
assert.equal(new Set(editions.map((e) => e.analysisEditionKey)).size, 50);
assert.equal(editions[0].analysisEditionKey, special.editions[3].analysisEditionKey, "default newest sort");
assert.equal(selectPurchasedLibraryPage(activeGroups, filters, 100).page, 3, "page clamping");
assert.equal(selectPurchasedLibraryPage(activeGroups, filters, -3).page, 1);
assert.equal(selectPurchasedLibraryPage([], filters, 10).totalPages, 1);
assert.equal(selectPurchasedLibraryPage([], filters, 10).total, 0);

const oldest = selectPurchasedLibraryPage(activeGroups, { ...filters, order: "oldest" }, 1);
assert.equal(oldest.groups[0].editions[0].analysisEditionKey, deep.editions[0].analysisEditionKey);
const filteredSpecial = selectPurchasedLibraryPage(activeGroups, { ...filters, kind: "special" }, 1);
assert.equal(filteredSpecial.total, 4);
assert(filteredSpecial.groups.every((group) => group.productId === special.productId));
const filteredDeep = selectPurchasedLibraryPage(activeGroups, { ...filters, kind: "deep" }, 1);
assert.equal(filteredDeep.total, 46);
assert(filteredDeep.groups.every((group) => group.productId === deep.productId));
const named = selectPurchasedLibraryPage(activeGroups, { ...filters, query: "궁합" }, 1);
assert.equal(named.total, 4);
assert.equal(selectPurchasedLibraryPage(activeGroups, { ...filters, query: "없는 리포트" }, 1).total, 0);
assert(activeGroups.every((group) => group.editions.length > 0), "full library data must stay unchanged");

const parsed = parseLibraryParams({ q: ["  궁합  ", "ignored"], kind: "special", order: "oldest", page: "2" });
assert.deepEqual(parsed, { filters: { query: "궁합", kind: "special", order: "oldest" }, requestedPage: 2 });
assert.deepEqual(parseLibraryParams({ kind: "invalid", order: "invalid", page: "-1" }), { filters, requestedPage: 1 });
assert.equal(parseLibraryParams({ page: "999999999999999999999" }).requestedPage, 1);
assert.equal(purchasedLibraryHref(parsed.filters, 2), "/purchased-analyses?q=%EA%B6%81%ED%95%A9&kind=special&order=oldest&page=2");
assert.equal(purchasedLibraryHref(filters, 1), "/purchased-analyses");

const page = readFileSync("app/purchased-analyses/page.tsx", "utf8");
const list = readFileSync("app/components/PurchasedAnalysesListMultiEdition.tsx", "utf8");
const refresh = readFileSync("app/components/PurchasedAnalysesAutoRefresh.tsx", "utf8");
const helper = readFileSync("app/lib/purchasedAnalysesLibrary.ts", "utf8");
assert(page.includes("analysis.profileId === activeProfile.id"), "selected profile must remain the sole library scope");
assert(page.includes("selectPurchasedLibraryPage(groups, filters, requestedPage)"));
assert(page.includes("getActiveProfile(user.id)") && page.includes("listUserPaidAnalysisSummaries(user.id)"));
assert(refresh.includes("router.refresh()") && refresh.includes("hasPreparingEdition"), "auto-refresh must still use all report editions");
assert(refresh.includes("libraryPage={libraryPage}") && refresh.includes("libraryOverview={libraryOverview}"));
assert(page.includes("groups.find((full) => full.productId === visible.productId)"), "visible group badges must use the complete original edition count");
assert(page.includes("groups={recentGroups}") && page.includes("libraryOverview={libraryOverview}"), "send only the recent report and 20 visible records to the client");
assert(refresh.includes("libraryOverview.preparingCount > 0"), "preparing reports outside the visible page must still auto-refresh");
assert(list.includes("libraryOverview?.total ?? allEditions.length") && list.includes("libraryOverview?.completedCount") && list.includes("libraryOverview?.preparingCount"), "overall counters must remain accurate across pages");
assert(list.includes("최근 이어보기") && list.includes("통합 AI 상담 바로가기") && list.includes("data-next-question-slot=\"phase9\""));
assert(list.includes("const recent = allEditions[0]!") && list.includes("const visibleGroups = libraryPage?.groups ?? groups"),
  "recent and AI cards must remain based on the full library rather than the current filter");
assert(list.includes("getEditionLabel(group, edition)") && list.includes("reportHref(group, profileId, edition.analysisEditionKey, previewMode)"),
  "original profile and exact-edition report links must remain unchanged");
assert(list.includes('action="/purchased-analyses"') && list.includes('name="q"') && list.includes('name="kind"') && list.includes('name="order"'));
assert(!list.includes('name="profileId"') && !helper.includes("profileFilter"), "do not create an unnecessary profile filter");
assert(list.includes("visibleGroups.map((group)") && list.includes("다음 목록 보기") && list.includes("검색 조건에 맞는 리포트가 없습니다."));
assert(!page.includes("insert(") && !page.includes("update(") && !page.includes("delete(") && !page.includes("openai"), "library search must be read-only and AI-free");
assert.deepEqual(foreign.profileId, "profile-B", "foreign sample stays outside activeGroups");
console.log("purchased-library-search-pagination-regression: OK");
