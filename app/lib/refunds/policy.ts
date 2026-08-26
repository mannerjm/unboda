import { getPaidReport } from "../paidReports/server";

export type RefundReasonCategory = "CHANGE_OF_MIND" | "CONTENT_NOT_PROVIDED" | "MATERIAL_DEFECT" | "MATERIALLY_DIFFERENT" | "OWNER_OVERRIDE";

export async function assessFullRefundEligibility(input: {
  userId: string;
  profileId: string;
  productId: string;
  reasonCategory: RefundReasonCategory;
}): Promise<{ eligible: boolean; reason: string; generationStarted: boolean }> {
  const report = await getPaidReport(input.userId, input.profileId, input.productId);
  const generationStarted = report !== null;
  if (!generationStarted && input.reasonCategory === "CHANGE_OF_MIND") return { eligible: true, reason: "change of mind before generation", generationStarted };
  if (input.reasonCategory === "CONTENT_NOT_PROVIDED" || input.reasonCategory === "MATERIAL_DEFECT" || input.reasonCategory === "MATERIALLY_DIFFERENT") return { eligible: true, reason: input.reasonCategory, generationStarted };
  return { eligible: false, reason: "refund requires owner review under policy", generationStarted };
}