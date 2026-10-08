import PairCompatibilityPage from "../PairCompatibilityPage";
import { COMPATIBILITY_WORKPLACE_PRODUCT_ID } from "@/app/lib/specialAnalysisProducts";
import { NOINDEX_METADATA } from "@/app/lib/seo";

export const metadata = NOINDEX_METADATA;

export default function WorkplaceCompatibilityPage() {
  return <PairCompatibilityPage productId={COMPATIBILITY_WORKPLACE_PRODUCT_ID} />;
}
