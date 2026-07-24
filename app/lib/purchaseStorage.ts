import type {
  Entitlement,
  Purchase,
} from "./userAccess";

const PURCHASES_STORAGE_KEY = "unboda-purchases";
const ENTITLEMENTS_STORAGE_KEY = "unboda-entitlements";

export function savePurchase(
  purchase: Purchase
): void {
  if (typeof window === "undefined") {
    return;
  }

  const purchases = loadPurchases();

  window.localStorage.setItem(
    PURCHASES_STORAGE_KEY,
    JSON.stringify([...purchases, purchase])
  );
}

export function loadPurchases(): Purchase[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(
    PURCHASES_STORAGE_KEY
  );

  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);

    return Array.isArray(parsed)
      ? (parsed as Purchase[])
      : [];
  } catch {
    return [];
  }
}

export function saveEntitlement(
  entitlement: Entitlement
): void {
  if (typeof window === "undefined") {
    return;
  }

  const entitlements = loadEntitlements();

  window.localStorage.setItem(
    ENTITLEMENTS_STORAGE_KEY,
    JSON.stringify([...entitlements, entitlement])
  );
}

export function loadEntitlements(): Entitlement[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(
    ENTITLEMENTS_STORAGE_KEY
  );

  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);

    return Array.isArray(parsed)
      ? (parsed as Entitlement[])
      : [];
  } catch {
    return [];
  }
}