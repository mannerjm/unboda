import type { AccountPaymentHistoryItem } from "./accountPaymentHistory";

export const ACCOUNT_PAYMENT_PAGE_SIZE = 20;
export type PaymentPeriod = "all" | "3m" | "1y";
export type PaymentStatusFilter = "all" | "paid" | "refund_pending" | "refunded" | "canceled";
export type PaymentHistoryFilters = {
  query: string;
  period: PaymentPeriod;
  from: string;
  to: string;
  status: PaymentStatusFilter;
};
export type PaymentHistoryPage = {
  filters: PaymentHistoryFilters;
  page: number;
  total: number;
  totalPages: number;
  from: number;
  to: number;
  items: AccountPaymentHistoryItem[];
};

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: string): string {
  if (!datePattern.test(value)) return "";
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : "";
}
function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function parsePaymentHistoryParams(params: {
  q?: string | string[];
  period?: string | string[];
  from?: string | string[];
  to?: string | string[];
  status?: string | string[];
  page?: string | string[];
}): { filters: PaymentHistoryFilters; requestedPage: number } {
  const period = first(params.period);
  const status = first(params.status);
  const rawPage = first(params.page);
  const parsedPage = Number(rawPage);
  return {
    filters: {
      query: first(params.q).trim().slice(0, 80),
      period: period === "3m" || period === "1y" ? period : "all",
      from: parseDate(first(params.from)),
      to: parseDate(first(params.to)),
      status: status === "paid" || status === "refund_pending" || status === "refunded" || status === "canceled"
        ? status : "all",
    },
    requestedPage: /^\d{1,6}$/.test(rawPage) && Number.isSafeInteger(parsedPage) && parsedPage > 0
      ? parsedPage : 1,
  };
}

function seoulDate(timestamp: string): string {
  return new Date(new Date(timestamp).getTime() + SEOUL_OFFSET_MS).toISOString().slice(0, 10);
}

function paymentStatus(item: AccountPaymentHistoryItem): Exclude<PaymentStatusFilter, "all"> {
  if (item.refund?.status === "REFUND_COMPLETED") return "refunded";
  if (item.refund) return "refund_pending";
  return item.paymentStatus === "canceled" ? "canceled" : "paid";
}

/** Page on the authenticated server; do not pass the full account ledger to
 * client navigation or leak another profile's report access. */
export function selectPaymentHistoryPage(
  allItems: readonly AccountPaymentHistoryItem[],
  filters: PaymentHistoryFilters,
  requestedPage: number,
  now = new Date(),
): PaymentHistoryPage {
  const query = filters.query.toLocaleLowerCase("ko-KR");
  const localToday = new Date(now.getTime() + SEOUL_OFFSET_MS);
  const since = new Date(localToday);
  if (filters.period !== "all") since.setUTCMonth(since.getUTCMonth() - (filters.period === "3m" ? 3 : 12));
  const periodFrom = filters.period === "all" ? "" : since.toISOString().slice(0, 10);
  const from = filters.from && filters.from > periodFrom ? filters.from : periodFrom;
  const visible = allItems.filter((item) => {
    const date = seoulDate(item.purchasedAt);
    return (!query || item.productName.toLocaleLowerCase("ko-KR").includes(query))
      && (!from || date >= from)
      && (!filters.to || date <= filters.to)
      && (filters.status === "all" || paymentStatus(item) === filters.status);
  });
  const total = visible.length;
  const totalPages = Math.max(1, Math.ceil(total / ACCOUNT_PAYMENT_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const items = visible.slice((page - 1) * ACCOUNT_PAYMENT_PAGE_SIZE, page * ACCOUNT_PAYMENT_PAGE_SIZE);
  return {
    filters, page, total, totalPages, items,
    from: total ? (page - 1) * ACCOUNT_PAYMENT_PAGE_SIZE + 1 : 0,
    to: total ? (page - 1) * ACCOUNT_PAYMENT_PAGE_SIZE + items.length : 0,
  };
}

export function paymentHistoryHref(filters: PaymentHistoryFilters, page: number): string {
  const query = new URLSearchParams();
  if (filters.query) query.set("q", filters.query);
  if (filters.period !== "all") query.set("period", filters.period);
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  if (filters.status !== "all") query.set("status", filters.status);
  if (page > 1) query.set("page", String(page));
  const params = query.toString();
  return `/mypage/payments${params ? `?${params}` : ""}`;
}
