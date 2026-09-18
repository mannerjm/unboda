import { redirect } from "next/navigation";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import AiConsultingPortfolioClient from "./AiConsultingPortfolioClient";

export default async function AiConsultingPage({
  searchParams,
}: {
  searchParams: Promise<{
    profileId?: string;
    productId?: string;
    edition?: string;
  }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    const returnTo = params.productId && params.edition
      ? `/ai-consulting?productId=${encodeURIComponent(params.productId)}&edition=${encodeURIComponent(params.edition)}`
      : "/ai-consulting";
    redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const activeProfile = await getActiveProfile(user.id);
  if (!activeProfile) {
    redirect("/mypage");
  }

  return (
    <AiConsultingPortfolioClient
      profileId={activeProfile.id}
      focusProductId={params.productId ?? null}
      focusEdition={params.edition ?? null}
    />
  );
}
