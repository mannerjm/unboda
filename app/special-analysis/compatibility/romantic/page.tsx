import PairCompatibilityPage from "../PairCompatibilityPage";
import {
  COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  COMPATIBILITY_ROMANTIC_PRODUCT,
} from "@/app/lib/specialAnalysisProducts";
import { buildPublicMetadata } from "@/app/lib/seo";

export const metadata = buildPublicMetadata({
  title: COMPATIBILITY_ROMANTIC_PRODUCT.title,
  description: COMPATIBILITY_ROMANTIC_PRODUCT.description,
  path: "/special-analysis/compatibility/romantic",
});

export default function RomanticCompatibilityAnalysisPage() {
  return <PairCompatibilityPage productId={COMPATIBILITY_ROMANTIC_PRODUCT_ID} />;
}
