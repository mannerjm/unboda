import { SITE_NAME, SITE_ORIGIN } from "./seo";

export type PublicBreadcrumbItem = Readonly<{ name: string; path: string }>;

/** Static site identity only; never include profile, purchase or review data. */
export function getSiteStructuredData(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#organization`,
        name: SITE_NAME,
        alternateName: "UNBODA",
        url: `${SITE_ORIGIN}/`,
        logo: `${SITE_ORIGIN}/unboda-icon.svg`,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        name: SITE_NAME,
        alternateName: "UNBODA",
        url: `${SITE_ORIGIN}/`,
        inLanguage: "ko-KR",
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
      },
    ],
  };
}

export function buildBreadcrumbStructuredData(items: readonly PublicBreadcrumbItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      // Breadcrumbs describe clean public pages, never personalized query URLs.
      if (!item.path.startsWith("/") || item.path.startsWith("//") || /[?#]/.test(item.path)) {
        throw new Error("Breadcrumb path must be a query-free local public path");
      }
      const url = new URL(item.path, SITE_ORIGIN);
      if (url.origin !== SITE_ORIGIN) {
        throw new Error("Breadcrumb path must stay on the public site origin");
      }
      return {
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: url.href,
      };
    }),
  };
}

/** Prevent a registry label from closing the HTML script element. */
export function serializeStructuredData(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
