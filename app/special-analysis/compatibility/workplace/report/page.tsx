import PairCompatibilityReportPage from "../../PairCompatibilityReportPage";
import { COMPATIBILITY_WORKPLACE_PRODUCT_ID } from "@/app/lib/specialAnalysisProducts";

type Props = { searchParams: Promise<{ profileId?: string; edition?: string }> };

export default function WorkplaceCompatibilityReportPage({ searchParams }: Props) {
  return <PairCompatibilityReportPage productId={COMPATIBILITY_WORKPLACE_PRODUCT_ID} searchParams={searchParams} />;
}
