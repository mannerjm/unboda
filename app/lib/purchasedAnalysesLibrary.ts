import { getPremiumProductDisplayTitle } from "./premiumPresentation";
import type { PurchasedAnalysisProductGroup } from "./purchasedAnalysesGrouping";
import { getSpecialAnalysisProduct } from "./specialAnalysisProducts";

export const LIBRARY_PAGE_SIZE = 20;
export type LibraryKind = "all" | "deep" | "special";
export type LibraryOrder = "newest" | "oldest";
export type LibraryFilters = { query: string; kind: LibraryKind; order: LibraryOrder };

export type PurchasedLibraryPage = {
  filters: LibraryFilters;
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  groups: PurchasedAnalysisProductGroup[];
};

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Restrict untrusted URL parameters before using them in labels or links. */
export function parseLibraryParams(params: {
  q?: string | string[];
  kind?: string | string[];
  order?: string | string[];
  page?: string | string[];
}): { filters: LibraryFilters; requestedPage: number } {
  const kind = firstParam(params.kind);
  const order = firstParam(params.order);
  const rawPage = firstParam(params.page);
  const pageNumber = Number(rawPage);
  return {
    filters: {
      query: firstParam(params.q).trim().slice(0, 80),
      kind: kind === "deep" || kind === "special" ? kind : "all",
      order: order === "oldest" ? "oldest" : "newest",
    },
    requestedPage: /^\d{1,6}$/.test(rawPage) && Number.isSafeInteger(pageNumber) && pageNumber > 0
      ? pageNumber
      : 1,
  };
}

/**
 * Preserve current-profile entitlement scope, exact edition and report links.
 * Filter and paginate on the SERVER before serializing the visible cards to the
 * client. Full groups are retained separately for recent/consulting and counts.
 * This does not change the existing entitlement lookup into DB-level paging.
 */
export function selectPurchasedLibraryPage(
  groups: readonly PurchasedAnalysisProductGroup[],
  filters: LibraryFilters,
  requestedPage: number,
): PurchasedLibraryPage {
  const query = filters.query.trim().toLocaleLowerCase("ko-KR");
  const candidates = groups
    .filter((group) => {
      const isSpecial = Boolean(getSpecialAnalysisProduct(group.productId));
      if (filters.kind === "special" && !isSpecial) return false;
      if (filters.kind === "deep" && isSpecial) return false;
      const displayName = getSpecialAnalysisProduct(group.productId)?.title
        ?? getPremiumProductDisplayTitle(group.productId, group.productName);
      return !query || displayName.toLocaleLowerCase("ko-KR").includes(query);
    })
    .flatMap((group) => group.editions.map((edition) => ({ group, edition })));

  // Deterministic order even when multiple editions have an identical timestamp.
  candidates.sort((a, b) =>
    (filters.order === "oldest"
      ? a.edition.acquiredAt.localeCompare(b.edition.acquiredAt)
      : b.edition.acquiredAt.localeCompare(a.edition.acquiredAt))
    || a.group.productId.localeCompare(b.group.productId)
    || (a.edition.analysisEditionKey ?? "").localeCompare(b.edition.analysisEditionKey ?? ""),
  );

  const total = candidates.length;
  const totalPages = Math.max(1, Math.ceil(total / LIBRARY_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const selected = candidates.slice((page - 1) * LIBRARY_PAGE_SIZE, page * LIBRARY_PAGE_SIZE);

  // The original grouping's isLatest and edition identities stay intact.
  // A single product may appear on consecutive pages without mixing editions.
  const paged = new Map<string, PurchasedAnalysisProductGroup>();
  for (const { group, edition } of selected) {
    const id = `${group.profileId}|${group.productId}`;
    const existing = paged.get(id);
    if (existing) existing.editions.push(edition);
    else paged.set(id, { ...group, editions: [edition] });
  }

  return {
    filters,
    page,
    totalPages,
    total,
    from: total === 0 ? 0 : (page - 1) * LIBRARY_PAGE_SIZE + 1,
    to: total === 0 ? 0 : (page - 1) * LIBRARY_PAGE_SIZE + selected.length,
    groups: [...paged.values()],
  };
}

export function purchasedLibraryHref(filters: LibraryFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.kind !== "all") params.set("kind", filters.kind);
  if (filters.order !== "newest") params.set("order", filters.order);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/purchased-analyses${query ? `?${query}` : ""}`;
}
