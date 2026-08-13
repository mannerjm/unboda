/**
 * Phase 3B: localStorage is no longer a purchase/entitlement source of truth.
 * Orders, purchases and entitlements live in Supabase Postgres and are read
 * server-side (app/lib/purchases/server.ts). This module only clears the
 * legacy keys older builds may have left in the browser.
 */
const LEGACY_PURCHASES_STORAGE_KEY = "unboda-purchases";
const LEGACY_ENTITLEMENTS_STORAGE_KEY = "unboda-entitlements";

export function clearLegacyPurchaseStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LEGACY_PURCHASES_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_ENTITLEMENTS_STORAGE_KEY);
}