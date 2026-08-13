import type { PaymentStatus } from "../payment";

export const PAID_ANALYSIS_RESOURCE_TYPE = "paid_analysis";

export type OrderRecord = {
  id: string;
  userId: string;
  productId: string;
  amount: number;
  status: PaymentStatus;
  paymentProvider: string | null;
  transactionId: string | null;
  createdAt: string;
  paidAt: string | null;
};

export type PurchaseRecord = {
  id: string;
  userId: string;
  productId: string;
  orderId: string;
  purchasedAt: string;
};

export type EntitlementRecord = {
  id: string;
  userId: string;
  resourceId: string;
  resourceType: string;
  isActive: boolean;
  createdAt: string;
};
