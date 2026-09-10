import "server-only";

import { getCurrentUser } from "@/app/lib/supabase/auth";
import { createAdminClient } from "@/app/lib/supabase/admin";
import {
  isSupportRequestCategory,
  type SupportRequestCategory,
  type SupportRequestDto,
  type SupportRequestStatus,
} from "./types";

const MESSAGE_MIN_LENGTH = 20;
const MESSAGE_MAX_LENGTH = 1200;
const MAX_ACTIVE_REQUESTS = 3;
const REQUEST_LIST_LIMIT = 20;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIVE_STATUSES: SupportRequestStatus[] = ["OPEN", "IN_REVIEW", "WAITING_USER"];

type SupportRequestRow = {
  id: string;
  category: SupportRequestCategory;
  message: string;
  order_id: string | null;
  status: SupportRequestStatus;
  operator_response: string | null;
  responded_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export class SupportRequestError extends Error {
  constructor(readonly code: "UNAUTHENTICATED" | "INVALID_INPUT" | "ORDER_NOT_FOUND" | "TOO_MANY_ACTIVE" | "PERSISTENCE_FAILED" | "LOOKUP_FAILED") {
    super(code);
    this.name = "SupportRequestError";
  }
}

function toDto(row: SupportRequestRow): SupportRequestDto {
  return {
    id: row.id,
    category: row.category,
    message: row.message,
    orderId: row.order_id,
    status: row.status,
    operatorResponse: row.operator_response,
    respondedAt: row.responded_at,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (normalized.length < MESSAGE_MIN_LENGTH || normalized.length > MESSAGE_MAX_LENGTH) return null;
  return normalized;
}

function normalizeOrderId(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return UUID_PATTERN.test(normalized) ? normalized : undefined;
}

async function requireSupportUser() {
  const user = await getCurrentUser();
  if (!user?.id || !user.email) throw new SupportRequestError("UNAUTHENTICATED");
  return user;
}

export async function listCurrentUserSupportRequests(): Promise<SupportRequestDto[]> {
  const user = await requireSupportUser();
  const { data, error } = await createAdminClient()
    .from("support_requests")
    .select("id,category,message,order_id,status,operator_response,responded_at,resolved_at,created_at,updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(REQUEST_LIST_LIMIT);

  if (error) throw new SupportRequestError("LOOKUP_FAILED");
  return ((data ?? []) as SupportRequestRow[]).map(toDto);
}

export async function createSupportRequest(input: {
  category: unknown;
  message: unknown;
  orderId?: unknown;
}): Promise<SupportRequestDto> {
  const user = await requireSupportUser();
  if (!isSupportRequestCategory(input.category)) throw new SupportRequestError("INVALID_INPUT");
  const message = normalizeMessage(input.message);
  const orderId = normalizeOrderId(input.orderId);
  if (!message || orderId === undefined) throw new SupportRequestError("INVALID_INPUT");

  const supabase = createAdminClient();
  if (orderId) {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (orderError) throw new SupportRequestError("LOOKUP_FAILED");
    if (!order) throw new SupportRequestError("ORDER_NOT_FOUND");
  }

  const { count, error: countError } = await supabase
    .from("support_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ACTIVE_STATUSES);
  if (countError) throw new SupportRequestError("LOOKUP_FAILED");
  if ((count ?? 0) >= MAX_ACTIVE_REQUESTS) throw new SupportRequestError("TOO_MANY_ACTIVE");

  const { data, error } = await supabase
    .from("support_requests")
    .insert({
      user_id: user.id,
      contact_email: user.email.toLowerCase(),
      category: input.category,
      message,
      order_id: orderId,
      status: "OPEN" satisfies SupportRequestStatus,
    })
    .select("id,category,message,order_id,status,operator_response,responded_at,resolved_at,created_at,updated_at")
    .single<SupportRequestRow>();

  if (error || !data) throw new SupportRequestError("PERSISTENCE_FAILED");
  return toDto(data);
}