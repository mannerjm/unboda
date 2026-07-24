import type {
  Entitlement,
  Purchase,
} from "./userAccess";


export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "canceled";

export type Order = {
  id: string;
  userId: string;
  profileId: string;
  productId: string;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
  paidAt: string | null;
};

export type PaymentResult = {
  orderId: string;
  status: PaymentStatus;
  transactionId: string | null;
};

export type CreateOrderInput = {
  userId: string;
  profileId: string;
  productId: string;
  amount: number;
};

export function createPendingOrder(
  input: CreateOrderInput
): Order {
  const now = new Date().toISOString();

  return {
    id: `order-${Date.now()}`,
    userId: input.userId,
    profileId: input.profileId,
    productId: input.productId,
    amount: input.amount,
    status: "pending",
    createdAt: now,
    paidAt: null,
  };
}

export function markOrderAsPaid(
  order: Order,
  transactionId: string
): {
  order: Order;
  paymentResult: PaymentResult;
} {
  const paidAt = new Date().toISOString();

  const paidOrder: Order = {
    ...order,
    status: "paid",
    paidAt,
  };

  const paymentResult: PaymentResult = {
    orderId: order.id,
    status: "paid",
    transactionId,
  };

  return {
    order: paidOrder,
    paymentResult,
  };
}

export function createPurchaseAccessFromPaidOrder(
  order: Order
): {
  purchase: Purchase;
  entitlement: Entitlement;
} {
  if (order.status !== "paid") {
    throw new Error(
      "결제가 완료된 주문만 구매 권한을 생성할 수 있습니다."
    );
  }

  const purchase: Purchase = {
    id: `purchase-${order.id}`,
    userId: order.userId,
    profileId: order.profileId,
    productId: order.productId,
    purchasedAt: order.paidAt ?? new Date().toISOString(),
  };

  const entitlement: Entitlement = {
    id: `entitlement-${order.id}`,
    userId: order.userId,
    profileId: order.profileId,
    type: "paid_analysis",
    resourceId: order.productId,
    isActive: true,
  };

  return {
    purchase,
    entitlement,
  };
}