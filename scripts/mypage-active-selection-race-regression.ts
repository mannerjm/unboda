import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const source = read("app/mypage/page.tsx");

// --- Static structural checks -------------------------------------------------

assert(!source.includes("isActivating"), "activate() must not gate concurrent clicks behind an in-flight boolean");
assert(source.includes("if (profileId === activeProfileId) return;"), "activate() must only skip a click that repeats the currently displayed selection");
assert(source.includes("setActiveProfileId(profileId);") && source.includes("pendingActiveProfileIdRef.current = profileId;"), "every click must update the UI immediately and record the latest pending selection");
assert(source.includes("isPersistingActiveProfileRef"), "PUT /api/profiles/active must be serialized behind an in-flight guard so only one request runs at a time");
assert(source.includes("if (isPersistingActiveProfileRef.current) return;"), "a new persist attempt must no-op while one is already in flight, instead of firing a second PUT");
assert(source.includes("if (pendingActiveProfileIdRef.current !== confirmedActiveProfileIdRef.current)") && source.includes("void persistPendingActiveProfile();"), "finishing a PUT must re-check for a newer pending selection and persist only the latest one");
assert(source.includes("confirmedActiveProfileIdRef.current = profileId;"), "a successful PUT must advance the confirmed active profile ref");
assert(source.includes("pendingActiveProfileIdRef.current === profileId") && source.includes("setActiveProfileId(confirmedActiveProfileIdRef.current);"), "rollback on failure must only apply when the failed attempt is still the latest desired selection");
assert(source.includes("confirmedActiveProfileIdRef.current = activeBody.profile?.id ?? null;"), "the confirmed active profile ref must be synced from the server's initial active profile on load");
const activationSection = source.slice(source.indexOf("function activate("), source.indexOf("async function signOut("));
assert(activationSection.length > 0 && !activationSection.includes("reloadMypageData()"), "activation must not trigger the full profiles/summary reload; only explicit mutations may");
console.log("1. serialized single-PUT persistence structure present ✓");

// --- Behavioral simulation: A -> B -> C -> A rapid clicks -----------------------
// Mirrors app/mypage/page.tsx's activate()/persistPendingActiveProfile() coalescing
// algorithm against a fake, delayed PUT to prove: every click updates the UI
// immediately, intermediate selections are never sent to the server, and the
// final persisted value matches the user's last click.

async function simulate() {
  let confirmed: string | null = "init";
  let pending: string | null = null;
  let persisting = false;
  const uiHistory: string[] = [];
  const persistedCalls: string[] = [];

  async function fakePut(profileId: string): Promise<{ ok: boolean }> {
    persistedCalls.push(profileId);
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { ok: true };
  }

  async function persistPending(): Promise<void> {
    if (persisting) return;
    const profileId = pending;
    if (profileId === null || profileId === confirmed) return;
    persisting = true;
    const response = await fakePut(profileId);
    if (response.ok) confirmed = profileId;
    persisting = false;
    if (pending !== confirmed) void persistPending();
  }

  let activeProfileId = confirmed;
  function activate(profileId: string): void {
    if (profileId === activeProfileId) return;
    activeProfileId = profileId;
    uiHistory.push(profileId);
    pending = profileId;
    void persistPending();
  }

  activate("A");
  activate("B");
  activate("C");
  activate("A");

  await new Promise((resolve) => setTimeout(resolve, 100));

  assert(JSON.stringify(uiHistory) === JSON.stringify(["A", "B", "C", "A"]), `every rapid click must update the UI immediately, got ${JSON.stringify(uiHistory)}`);
  assert(activeProfileId === "A", `final UI selection must be the user's last click (A), got ${activeProfileId}`);
  assert(confirmed === "A", `final server-persisted value must be A, got ${confirmed}`);
  assert(!persistedCalls.includes("B") && !persistedCalls.includes("C"), `intermediate selections must never be sent to the server, got ${JSON.stringify(persistedCalls)}`);
  console.log(`2. rapid A -> B -> C -> A: UI history ${JSON.stringify(uiHistory)}, persisted PUT calls ${JSON.stringify(persistedCalls)}, final confirmed "${confirmed}" ✓`);
}

void simulate()
  .then(() => console.log("\nmypage-active-selection-race-regression passed ✓"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
