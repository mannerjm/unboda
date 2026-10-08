import type { MetadataRoute } from "next";
import { getLaunchProductIds } from "@/app/lib/paidAnalysisTopicConfig";
import { COMPATIBILITY_GUIDE_SLUGS, getCompatibilityPublicGuidePath } from "@/app/lib/compatibilityPublicGuides";
import { SITE_ORIGIN } from "@/app/lib/seo";

type SitemapEntry = MetadataRoute.Sitemap[number];

function entry(
  path: string,
  changeFrequency: SitemapEntry["changeFrequency"],
  priority: number,
): SitemapEntry {
  return {
    url: `${SITE_ORIGIN}${path}`,
    changeFrequency,
    priority,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    entry("/", "weekly", 1),
    entry("/guest-saju", "monthly", 0.9),
    entry("/deep-analysis", "weekly", 0.9),
    entry("/special-analysis", "monthly", 0.8),
    entry("/special-analysis/compatibility", "weekly", 0.9),
    entry("/reviews", "weekly", 0.7),
    entry("/trust", "monthly", 0.6),
    entry("/privacy", "yearly", 0.2),
    entry("/terms", "yearly", 0.2),
    entry("/refund", "yearly", 0.2),
  ];

  const paidProductPages: MetadataRoute.Sitemap = getLaunchProductIds().map((productId) =>
    entry(`/paid-analysis/${productId}`, "monthly", 0.8),
  );

  const publicCompatibilityGuidePages: MetadataRoute.Sitemap = COMPATIBILITY_GUIDE_SLUGS.map((slug) =>
    entry(getCompatibilityPublicGuidePath(slug), "monthly", 0.8),
  );

  return [...staticPages, ...paidProductPages, ...publicCompatibilityGuidePages];
}
