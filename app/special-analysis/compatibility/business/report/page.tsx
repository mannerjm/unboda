import PairCompatibilityReportPage from "../../PairCompatibilityReportPage";
import { COMPATIBILITY_BUSINESS_PRODUCT_ID } from "@/app/lib/specialAnalysisProducts";

type Props = { searchParams: Promise<{ profileId?: string; edition?: string }> };

export default function BusinessCompatibilityReportPage({ searchParams }: Props) {
  return <PairCompatibilityReportPage productId={COMPATIBILITY_BUSINESS_PRODUCT_ID} searchParams={searchParams} />;
}
