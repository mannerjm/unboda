import { createAdminClient } from "../supabase/admin";

export type AiConsultingCreditHistoryEntryType =
  | "PURCHASE"
  | "CONSUME"
  | "REFUND"
  | "ADJUSTMENT";

export type AiConsultingCreditHistoryEntry = {
  id: string;
  entryType: AiConsultingCreditHistoryEntryType;
  quantity: number;
  bundleId: string | null;
  sourcePurchaseId: string | null;
  relatedMessageId: string | null;
  createdAt: string;
};

type CreditLedgerRow = {
  id: string;
  entry_type: AiConsultingCreditHistoryEntryType;
  quantity: number;
  bundle_id: string | null;
  source_purchase_id: string | null;
  related_message_id: string | null;
  created_at: string;
};

export async function listAiConsultingCreditHistory(input: {
  userId: string;
  profileId: string;
  limit?: number;
}): Promise<AiConsultingCreditHistoryEntry[]> {
  const requestedLimit = input.limit ?? 50;
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(100, Math.max(1, requestedLimit))
    : 50;

  const { data, error } = await createAdminClient()
    .from("ai_consulting_credit_ledger")
    .select("id,entry_type,quantity,bundle_id,source_purchase_id,related_message_id,created_at")
    .eq("user_id", input.userId)
    .eq("profile_id", input.profileId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`AI_CONSULTING_CREDIT_HISTORY_FAILED: ${error.message}`);
  }

  return ((data ?? []) as CreditLedgerRow[]).map((row) => ({
    id: row.id,
    entryType: row.entry_type,
    quantity: row.quantity,
    bundleId: row.bundle_id,
    sourcePurchaseId: row.source_purchase_id,
    relatedMessageId: row.related_message_id,
    createdAt: row.created_at,
  }));
}
