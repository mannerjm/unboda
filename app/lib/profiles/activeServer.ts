import { createAdminClient } from "../supabase/admin";
import { getUserProfile } from "./server";
import type { ProfileDto } from "./types";

export async function getActiveProfile(userId: string): Promise<ProfileDto | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("active_profiles")
    .select("profile_id")
    .eq("user_id", userId)
    .maybeSingle<{ profile_id: string }>();

  if (error) throw new Error(`활성 프로필을 조회하지 못했습니다: ${error.message}`);
  return data ? getUserProfile(data.profile_id, userId) : null;
}

export async function setActiveProfile(userId: string, profileId: string): Promise<ProfileDto | null> {
  const profile = await getUserProfile(profileId, userId);
  if (!profile) return null;

  const supabase = createAdminClient();
  const { error } = await supabase.from("active_profiles").upsert(
    { user_id: userId, profile_id: profile.id },
    { onConflict: "user_id" },
  );

  if (error) throw new Error(`활성 프로필을 변경하지 못했습니다: ${error.message}`);
  return profile;
}
