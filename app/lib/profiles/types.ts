export type ProfileRelationshipType =
  | "self"
  | "spouse"
  | "child"
  | "parent"
  | "sibling"
  | "other";

export type ProfileAppGender = "남성" | "여성";
export type ProfileDbGender = "male" | "female";
export type ProfileAppCalendarType = "양력" | "음력";
export type ProfileDbCalendarType = "solar" | "lunar";

export type ProfileInput = {
  label: string;
  relationshipType: ProfileRelationshipType;
  birthDate: string;
  birthTime: string;
  gender: ProfileAppGender;
  calendarType: ProfileAppCalendarType;
  isLeapMonth: boolean;
};

export type ProfileDto = ProfileInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export function isProfileId(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

type ProfileValidationResult =
  | { valid: true; value: ProfileInput }
  | { valid: false; error: string };

const relationshipTypes: readonly ProfileRelationshipType[] = [
  "self",
  "spouse",
  "child",
  "parent",
  "sibling",
  "other",
];

export function toProfileDbGender(gender: ProfileAppGender): ProfileDbGender {
  return gender === "남성" ? "male" : "female";
}

export function fromProfileDbGender(gender: ProfileDbGender): ProfileAppGender {
  return gender === "male" ? "남성" : "여성";
}

export function toProfileDbCalendarType(
  calendarType: ProfileAppCalendarType,
): ProfileDbCalendarType {
  return calendarType === "양력" ? "solar" : "lunar";
}

export function fromProfileDbCalendarType(
  calendarType: ProfileDbCalendarType,
): ProfileAppCalendarType {
  return calendarType === "solar" ? "양력" : "음력";
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validateProfileInput(input: unknown): ProfileValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, error: "프로필 입력값이 올바르지 않습니다." };
  }

  const value = input as Partial<ProfileInput>;
  const label = typeof value.label === "string" ? value.label.trim() : "";

  if (!label) {
    return { valid: false, error: "프로필 이름을 입력해 주세요." };
  }

  if (label.length > 100) {
    return { valid: false, error: "프로필 이름은 100자 이하여야 합니다." };
  }

  const relationshipType = value.relationshipType;

  if (!relationshipTypes.includes(relationshipType as ProfileRelationshipType)) {
    return { valid: false, error: "relationshipType이 올바르지 않습니다." };
  }

  if (typeof value.birthDate !== "string" || !isValidDate(value.birthDate)) {
    return { valid: false, error: "birthDate는 실제 YYYY-MM-DD 날짜여야 합니다." };
  }

  if (typeof value.birthTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.birthTime)) {
    return { valid: false, error: "birthTime은 HH:mm 형식이어야 합니다." };
  }

  if (value.gender !== "남성" && value.gender !== "여성") {
    return { valid: false, error: "gender는 '남성' 또는 '여성'이어야 합니다." };
  }

  if (value.calendarType !== "양력" && value.calendarType !== "음력") {
    return { valid: false, error: "calendarType은 '양력' 또는 '음력'이어야 합니다." };
  }

  if (typeof value.isLeapMonth !== "boolean") {
    return { valid: false, error: "isLeapMonth는 boolean이어야 합니다." };
  }

  if (value.calendarType === "양력" && value.isLeapMonth) {
    return { valid: false, error: "양력 프로필은 윤달일 수 없습니다." };
  }

  return {
    valid: true,
    value: {
      label,
      relationshipType: relationshipType as ProfileRelationshipType,
      birthDate: value.birthDate,
      birthTime: value.birthTime,
      gender: value.gender,
      calendarType: value.calendarType,
      isLeapMonth: value.isLeapMonth,
    },
  };
}

export function mergeProfileInput(
  current: ProfileInput,
  patch: unknown,
): ProfileValidationResult {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return { valid: false, error: "프로필 입력값이 올바르지 않습니다." };
  }

  const partial = patch as Record<string, unknown>;
  const allowedKeys = new Set([
    "label",
    "relationshipType",
    "birthDate",
    "birthTime",
    "gender",
    "calendarType",
    "isLeapMonth",
  ]);

  if (Object.keys(partial).some((key) => !allowedKeys.has(key))) {
    return { valid: false, error: "수정할 수 없는 프로필 필드가 포함되어 있습니다." };
  }

  return validateProfileInput({ ...current, ...partial });
}
