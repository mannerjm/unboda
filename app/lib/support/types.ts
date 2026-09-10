export const SUPPORT_REQUEST_CATEGORIES = [
  "PAYMENT_REFUND",
  "PAID_ANALYSIS",
  "ACCOUNT_ACCESS",
  "PROFILE_DATA",
  "PRIVACY_ACCOUNT",
  "OTHER",
] as const;

export type SupportRequestCategory = (typeof SUPPORT_REQUEST_CATEGORIES)[number];

export const SUPPORT_REQUEST_STATUSES = [
  "OPEN",
  "IN_REVIEW",
  "WAITING_USER",
  "RESOLVED",
] as const;

export type SupportRequestStatus = (typeof SUPPORT_REQUEST_STATUSES)[number];

export const SUPPORT_CATEGORY_LABELS: Record<SupportRequestCategory, string> = {
  PAYMENT_REFUND: "결제·환불",
  PAID_ANALYSIS: "유료 분석 결과",
  ACCOUNT_ACCESS: "로그인·비밀번호",
  PROFILE_DATA: "프로필·사주 정보",
  PRIVACY_ACCOUNT: "개인정보·계정 종료",
  OTHER: "기타 문의",
};

export const SUPPORT_STATUS_LABELS: Record<SupportRequestStatus, string> = {
  OPEN: "접수됨",
  IN_REVIEW: "확인 중",
  WAITING_USER: "고객 확인 필요",
  RESOLVED: "답변 완료",
};

export type SupportRequestDto = {
  id: string;
  category: SupportRequestCategory;
  message: string;
  orderId: string | null;
  status: SupportRequestStatus;
  operatorResponse: string | null;
  respondedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OperatorSupportRequestDto = SupportRequestDto & {
  contactEmail: string;
};

export function isSupportRequestCategory(value: unknown): value is SupportRequestCategory {
  return typeof value === "string" && SUPPORT_REQUEST_CATEGORIES.includes(value as SupportRequestCategory);
}

export function isSupportRequestStatus(value: unknown): value is SupportRequestStatus {
  return typeof value === "string" && SUPPORT_REQUEST_STATUSES.includes(value as SupportRequestStatus);
}