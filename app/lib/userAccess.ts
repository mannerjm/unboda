export type UserAccessLevel =
  | "guest"
  | "free_member"
  | "purchaser"
  | "subscriber";

export type UserAccessState = {
  level: UserAccessLevel;
};

export type UserAccessPermissions = {
  canViewFreeAnalysis: boolean;
  canSaveProfile: boolean;
  canPurchasePaidAnalysis: boolean;
  canViewPurchasedAnalysis: boolean;
  hasSubscriptionBenefits: boolean;
};

export function getUserAccessPermissions(
  level: UserAccessLevel
): UserAccessPermissions {
  switch (level) {
    case "guest":
      return {
        canViewFreeAnalysis: true,
        canSaveProfile: false,
        canPurchasePaidAnalysis: true,
        canViewPurchasedAnalysis: false,
        hasSubscriptionBenefits: false,
      };

    case "free_member":
      return {
        canViewFreeAnalysis: true,
        canSaveProfile: true,
        canPurchasePaidAnalysis: true,
        canViewPurchasedAnalysis: false,
        hasSubscriptionBenefits: false,
      };

    case "purchaser":
      return {
        canViewFreeAnalysis: true,
        canSaveProfile: true,
        canPurchasePaidAnalysis: true,
        canViewPurchasedAnalysis: true,
        hasSubscriptionBenefits: false,
      };

    case "subscriber":
      return {
        canViewFreeAnalysis: true,
        canSaveProfile: true,
        canPurchasePaidAnalysis: true,
        canViewPurchasedAnalysis: true,
        hasSubscriptionBenefits: true,
      };
  }
}

export type User = {
  id: string;
  accessLevel: UserAccessLevel;
};

export type Profile = {
  id: string;
  userId: string;
  name: string;
  isPrimary: boolean;
};

export type EntitlementType =
  | "paid_analysis"
  | "subscription_benefit"
  | "ai_credit";

export type Entitlement = {
  id: string;
  userId: string;
  profileId: string;
  type: EntitlementType;
  resourceId: string;
  isActive: boolean;
};

export type Purchase = {
  id: string;
  userId: string;
  profileId: string;
  productId: string;
  purchasedAt: string;
};

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "expired";

export type Subscription = {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  planId: string;
  startedAt: string;
  expiresAt: string | null;
};

export type CreditType =
  | "ai_question"
  | "additional_analysis";

export type Credit = {
  id: string;
  userId: string;
  type: CreditType;
  remaining: number;
};

export function hasActiveEntitlement(
  entitlements: Entitlement[],
  userId: string,
  profileId: string,
  resourceId: string
): boolean {
  return entitlements.some(
    (entitlement) =>
      entitlement.userId === userId &&
      entitlement.profileId === profileId &&
      entitlement.resourceId === resourceId &&
      entitlement.isActive
  );
}

export function canAccessPaidAnalysis(
  user: User | null,
  profileId: string,
  productId: string,
  entitlements: Entitlement[]
): boolean {
  if (!user) {
    return false;
  }

  return hasActiveEntitlement(
    entitlements,
    user.id,
    profileId,
    productId
  );
}