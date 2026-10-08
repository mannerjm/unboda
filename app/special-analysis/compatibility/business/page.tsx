import PairCompatibilityPage from "../PairCompatibilityPage";
import {
  COMPATIBILITY_BUSINESS_PRODUCT_ID,
  COMPATIBILITY_BUSINESS_PRODUCT,
} from "@/app/lib/specialAnalysisProducts";
import { buildPublicMetadata } from "@/app/lib/seo";

export const metadata = buildPublicMetadata({
  title: COMPATIBILITY_BUSINESS_PRODUCT.title,
  description: COMPATIBILITY_BUSINESS_PRODUCT.description,
  path: "/special-analysis/compatibility/business",
});

export default function BusinessCompatibilityPage() {
  return <PairCompatibilityPage productId={COMPATIBILITY_BUSINESS_PRODUCT_ID} />;
}
