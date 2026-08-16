import { createAdminClient } from "../supabase/admin";
import {
  fromProfileDbCalendarType,
  fromProfileDbGender,
  toProfileDbCalendarType,
  toProfileDbGender,
  MAX_PROFILES_PER_USER,
  type ProfileDeletability,
  type ProfileDeleteReason,
  type ProfileDto,
  type ProfileInput,
} from "./types";

type ProfileRow = {
  id: string;
  user_id: string;
  label: string;
  relationship_type: ProfileDto["relationshipType"];
  birth_date: string;
  birth_time: string;
  gender: "male" | "female";
  calendar_type: "solar" | "lunar";
  is_leap_month: boolean;
  created_at: string;
  updated_at: string;
};

function toProfileDto(row: ProfileRow): ProfileDto {
  return {
    id: row.id,
    label: row.label,
    relationshipType: row.relationship_type,
    birthDate: row.birth_date,
    birthTime: row.birth_time.slice(0, 5),
    gender: fromProfileDbGender(row.gender),
    calendarType: fromProfileDbCalendarType(row.calendar_type),
    isLeapMonth: row.is_leap_month,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function sortUserProfiles(profiles: ProfileDto[]): ProfileDto[] {
  return [...profiles].sort((left, right) => {
    const leftIsSelf = left.relationshipType === "self";
    const rightIsSelf = right.relationshipType === "self";

    if (leftIsSelf !== rightIsSelf) {
      return leftIsSelf ? -1 : 1;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

function toProfileInsert(input: ProfileInput, userId: string) {
  return {
    user_id: userId,
    label: input.label,
    relationship_type: input.relationshipType,
    birth_date: input.birthDate,
    birth_time: input.birthTime,
    gender: toProfileDbGender(input.gender),
    calendar_type: toProfileDbCalendarType(input.calendarType),
    is_leap_month: input.isLeapMonth,
  };
}

function toProfileUpdate(input: ProfileInput) {
  return {
    label: input.label,
    relationship_type: input.relationshipType,
    birth_date: input.birthDate,
    birth_time: input.birthTime,
    gender: toProfileDbGender(input.gender),
    calendar_type: toProfileDbCalendarType(input.calendarType),
    is_leap_month: input.isLeapMonth,
  };
}

export function isProfilesSelfConflict(error: { code?: string; message?: string } | null): boolean {
  return Boolean(
    error?.code === "23505" &&
      error.message?.includes("profiles_one_self_per_user_idx"),
  );
}

export class ProfileLimitError extends Error {
  constructor() {
    super(`프로필은 계정당 최대 ${MAX_PROFILES_PER_USER}개까지 만들 수 있습니다.`);
    this.name = "ProfileLimitError";
  }
}

/** Raised when Postgres rejects the delete with 23503, i.e. a foreign key the preflight did not cover. */
export class ProfileInUseError extends Error {
  constructor() {
    super("다른 데이터가 연결되어 있어 프로필을 삭제할 수 없습니다.");
    this.name = "ProfileInUseError";
  }
}

// Every table that references public.profiles with a purchase meaning. All four
// are checked because the DB blocks the delete on each one independently.
const PURCHASE_SCOPED_TABLES = ["orders", "purchases", "entitlements", "paid_reports"] as const;

/**
 * One pass over every table that can block a delete for this user, so the
 * per-profile answer and the mypage list answer come from the same rules.
 */
export async function listProfileDeleteBlockers(
  userId: string,
): Promise<Map<string, ProfileDeleteReason>> {
  const supabase = createAdminClient();
  const blockers = new Map<string, ProfileDeleteReason>();
  // Reasons are recorded in priority order: a purchase can never be resolved by
  // the user, while an active selection can, so it must not mask the others.
  const block = (profileId: string | null, reason: ProfileDeleteReason) => {
    if (profileId && !blockers.has(profileId)) blockers.set(profileId, reason);
  };

  const purchaseScoped = await Promise.all(
    PURCHASE_SCOPED_TABLES.map((table) =>
      supabase.from(table).select("profile_id").eq("user_id", userId),
    ),
  );

  for (const { data, error } of purchaseScoped) {
    if (error) {
      throw new Error(`프로필 삭제 가능 여부를 확인하지 못했습니다: ${error.message}`);
    }

    for (const row of (data ?? []) as Array<{ profile_id: string }>) {
      block(row.profile_id, "PROFILE_HAS_PURCHASE");
    }
  }

  const { data: transfers, error: transferError } = await supabase
    .from("guest_free_analyses")
    .select("resolved_profile_id")
    .eq("transferred_user_id", userId)
    .not("resolved_profile_id", "is", null);

  if (transferError) {
    throw new Error(`비회원 분석 이전 이력을 확인하지 못했습니다: ${transferError.message}`);
  }

  for (const row of (transfers ?? []) as Array<{ resolved_profile_id: string | null }>) {
    block(row.resolved_profile_id, "PROFILE_HAS_TRANSFER_HISTORY");
  }

  const { data: active, error: activeError } = await supabase
    .from("active_profiles")
    .select("profile_id")
    .eq("user_id", userId)
    .maybeSingle<{ profile_id: string }>();

  if (activeError) {
    throw new Error(`활성 프로필을 확인하지 못했습니다: ${activeError.message}`);
  }

  block(active?.profile_id ?? null, "PROFILE_IS_ACTIVE");

  return blockers;
}

export async function getProfileDeletability(
  profileId: string,
  userId: string,
): Promise<ProfileDeletability> {
  const reason = (await listProfileDeleteBlockers(userId)).get(profileId);

  return reason ? { deletable: false, reason } : { deletable: true };
}

export async function listUserProfiles(userId: string): Promise<ProfileDto[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`프로필 목록을 조회하지 못했습니다: ${error.message}`);
  }

  return sortUserProfiles(((data ?? []) as ProfileRow[]).map(toProfileDto));
}

export async function getUserProfile(
  profileId: string,
  userId: string,
): Promise<ProfileDto | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw new Error(`프로필을 조회하지 못했습니다: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return toProfileDto(data);
}

export async function createUserProfile(
  input: ProfileInput,
  userId: string,
): Promise<ProfileDto> {
  const supabase = createAdminClient();
  const { count, error: countError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) {
    throw new Error(`프로필 수를 확인하지 못했습니다: ${countError.message}`);
  }

  if ((count ?? 0) >= MAX_PROFILES_PER_USER) {
    throw new ProfileLimitError();
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert(toProfileInsert(input, userId))
    .select("*")
    .single<ProfileRow>();

  if (error || !data) {
    if (isProfilesSelfConflict(error)) {
      throw error;
    }

    throw new Error(`프로필을 생성하지 못했습니다: ${error?.message ?? "unknown"}`);
  }

  return toProfileDto(data);
}

export async function updateUserProfile(
  profileId: string,
  input: ProfileInput,
  userId: string,
): Promise<ProfileDto | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(toProfileUpdate(input))
    .eq("id", profileId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle<ProfileRow>();

  if (error) {
    if (isProfilesSelfConflict(error)) {
      throw error;
    }

    throw new Error(`프로필을 수정하지 못했습니다: ${error.message}`);
  }

  return data ? toProfileDto(data) : null;
}

export async function deleteUserProfile(
  profileId: string,
  userId: string,
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", profileId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    if (error.code === "23503") {
      throw new ProfileInUseError();
    }

    throw new Error(`프로필을 삭제하지 못했습니다: ${error.message}`);
  }

  return Boolean(data);
}
