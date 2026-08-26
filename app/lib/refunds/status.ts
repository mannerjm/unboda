import type { RefundStatus } from "../purchases/types";

export const REFUND_MESSAGES: Record<RefundStatus, string> = {
  REFUND_REQUESTED: "환불 요청을 접수했습니다.",
  REFUND_PROCESSING: "결제 취소를 처리하고 있습니다.",
  REFUND_COMPLETED: "환불 처리가 완료되었습니다. 결제수단 반영 시점은 결제사에 따라 다를 수 있습니다.",
  REFUND_FAILED_RETRYING: "일시적인 문제로 환불 처리를 다시 시도하고 있습니다.",
  OWNER_REVIEW_REQUIRED: "자동 처리가 어려워 담당자가 확인 중입니다.",
};

export function getRefundCustomerMessage(status: RefundStatus): string {
  return REFUND_MESSAGES[status];
}