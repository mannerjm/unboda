import PairCompatibilityReportPage from "../PairCompatibilityReportPage";
import { COMPATIBILITY_ROMANTIC_PRODUCT_ID } from "@/app/lib/specialAnalysisProducts";

type Props = { searchParams: Promise<{ profileId?: string; edition?: string }> };

export default function CompatibilityPurchasedReportPage({ searchParams }: Props) {
  return <PairCompatibilityReportPage productId={COMPATIBILITY_ROMANTIC_PRODUCT_ID} searchParams={searchParams} />;
}
