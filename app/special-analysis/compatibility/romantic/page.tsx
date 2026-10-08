import PairCompatibilityPage from "../PairCompatibilityPage";
import { COMPATIBILITY_ROMANTIC_PRODUCT_ID } from "@/app/lib/specialAnalysisProducts";
import { NOINDEX_METADATA } from "@/app/lib/seo";

export const metadata = NOINDEX_METADATA;

export default function RomanticCompatibilityAnalysisPage() {
  return <PairCompatibilityPage productId={COMPATIBILITY_ROMANTIC_PRODUCT_ID} />;
}
