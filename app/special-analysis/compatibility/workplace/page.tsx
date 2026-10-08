import PairCompatibilityPage from "../PairCompatibilityPage";
import {
  COMPATIBILITY_WORKPLACE_PRODUCT_ID,
  COMPATIBILITY_WORKPLACE_PRODUCT,
} from "@/app/lib/specialAnalysisProducts";
import { buildPublicMetadata } from "@/app/lib/seo";

export const metadata = buildPublicMetadata({
  title: COMPATIBILITY_WORKPLACE_PRODUCT.title,
  description: COMPATIBILITY_WORKPLACE_PRODUCT.description,
  path: "/special-analysis/compatibility/workplace",
});

export default function WorkplaceCompatibilityPage() {
  return <PairCompatibilityPage productId={COMPATIBILITY_WORKPLACE_PRODUCT_ID} />;
}
