import Link from "next/link";
import {
  COMPATIBILITY_GUIDE_SLUGS,
  getCompatibilityPublicGuide,
  getCompatibilityPublicGuidePath,
} from "@/app/lib/compatibilityPublicGuides";

export default function CompatibilityGuideDiscoveryLinks() {
  return (
    <details className="mt-5 rounded-2xl border border-[#e7d9f3] bg-white/80 px-4 py-3">
      <summary className="cursor-pointer text-sm font-bold text-[#5e427b]">
        관계별 궁합 안내 보기
      </summary>
      <nav aria-label="관계별 궁합 안내" className="mt-3 flex flex-wrap gap-2">
        {COMPATIBILITY_GUIDE_SLUGS.map((slug) => (
          <Link
            key={slug}
            href={getCompatibilityPublicGuidePath(slug)}
            className="rounded-full border border-[#e7d9f3] px-3 py-2 text-xs font-semibold text-[#655773] hover:border-[#b98aed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7650ba]"
          >
            {getCompatibilityPublicGuide(slug)!.product.title} 안내
          </Link>
        ))}
      </nav>
    </details>
  );
}
