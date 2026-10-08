import PairCompatibilityPage from "../PairCompatibilityPage";
import {
  COMPATIBILITY_FRIEND_PRODUCT_ID,
  COMPATIBILITY_FRIEND_PRODUCT,
} from "@/app/lib/specialAnalysisProducts";
import { buildPublicMetadata } from "@/app/lib/seo";

export const metadata = buildPublicMetadata({
  title: COMPATIBILITY_FRIEND_PRODUCT.title,
  description: COMPATIBILITY_FRIEND_PRODUCT.description,
  path: "/special-analysis/compatibility/friend",
});

export default function FriendCompatibilityPage() {
  return <PairCompatibilityPage productId={COMPATIBILITY_FRIEND_PRODUCT_ID} />;
}
