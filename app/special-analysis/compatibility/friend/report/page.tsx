import PairCompatibilityReportPage from "../../PairCompatibilityReportPage";
import { COMPATIBILITY_FRIEND_PRODUCT_ID } from "@/app/lib/specialAnalysisProducts";

type Props = { searchParams: Promise<{ profileId?: string; edition?: string }> };

export default function FriendCompatibilityReportPage({ searchParams }: Props) {
  return <PairCompatibilityReportPage productId={COMPATIBILITY_FRIEND_PRODUCT_ID} searchParams={searchParams} />;
}
