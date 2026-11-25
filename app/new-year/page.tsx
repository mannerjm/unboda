import { redirect, notFound } from "next/navigation";
import { isProfileId } from "@/app/lib/profiles/types";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getUserProfile } from "@/app/lib/profiles/server";

export const dynamic="force-dynamic";

/** Legacy seasonal landing: go straight to the existing product detail. */
export default async function NewYearPage({searchParams}:{searchParams:Promise<{profileId?:string}>}) {
  const {profileId}=await searchParams;
  const user = await getCurrentUser();
  if (profileId && !isProfileId(profileId)) notFound();
  const profile = user ? (profileId ? await getUserProfile(profileId, user.id) : await getActiveProfile(user.id)) : null;
  if (user && profileId && !profile) notFound();
  const href="/paid-analysis/new-year-fortune"+(profile ? `?profileId=${encodeURIComponent(profile.id)}` : "");
  redirect(href);
}
