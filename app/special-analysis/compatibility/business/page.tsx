import PairCompatibilityPage from "../PairCompatibilityPage";
import { COMPATIBILITY_BUSINESS_PRODUCT_ID } from "@/app/lib/specialAnalysisProducts";

export default function BusinessCompatibilityPage() {
  return <PairCompatibilityPage productId={COMPATIBILITY_BUSINESS_PRODUCT_ID} />;
}
