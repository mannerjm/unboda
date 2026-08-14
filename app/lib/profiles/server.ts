import { createAdminClient } from "../supabase/admin";
import {
  fromProfileDbCalendarType,
  fromProfileDbGender,
  toProfileDbCalendarType,
  toProfileDbGender,
  MAX_PROFILES_PER_USER,
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
    throw new Error(`프로필을 삭제하지 못했습니다: ${error.message}`);
  }

  return Boolean(data);
}
