import "server-only";

import { createAdminClient } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";
import { RESET_TARGET_EMAIL, RESET_TARGET_ID, RESET_TARGET_PROFILE_ID, type ResetDependencies } from "./bPasswordReset";

export function createResetDependencies(): ResetDependencies {
  // Created lazily: production/other branches must fail before either client exists.
  let sessionClient: ReturnType<typeof createClient> | undefined;
  const session = () => sessionClient ??= createClient();
  return {
    environment: () => process.env,
    now: () => Date.now(),
    async getActor() {
      const { data, error } = await (await session()).auth.getUser();
      if (error || !data.user) return null;
      return {
        id: data.user.id,
        email: data.user.email ?? "",
        emailConfirmed: Boolean(data.user.email_confirmed_at),
        isAnonymous: data.user.is_anonymous === true,
        lastSignInAt: data.user.last_sign_in_at ?? null,
      };
    },
    async getTarget() {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.getUserById(RESET_TARGET_ID);
      if (error || !data.user || data.user.id !== RESET_TARGET_ID || data.user.email !== RESET_TARGET_EMAIL) return null;
      const { data: profile, error: profileError } = await admin.from("profiles")
        .select("id,user_id").eq("id", RESET_TARGET_PROFILE_ID).eq("user_id", RESET_TARGET_ID).maybeSingle();
      if (profileError || !profile) return null;
      return {
        id: data.user.id, email: data.user.email,
        updatedAt: data.user.updated_at ?? "",
        profileId: profile.id as string, profileOwnerId: profile.user_id as string,
      };
    },
    async updatePassword(userId, password) {
      if (userId !== RESET_TARGET_ID) return false;
      const { data, error } = await createAdminClient().auth.admin.updateUserById(RESET_TARGET_ID, { password });
      return !error && data.user?.id === RESET_TARGET_ID && data.user.email === RESET_TARGET_EMAIL;
    },
    async signOutOperator() {
      const { error } = await (await session()).auth.signOut({ scope: "local" });
      return !error;
    },
  };
}
