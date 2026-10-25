import { NextResponse } from "next/server";

// READ ONLY / PREVIEW ONLY. Do not expose Buffer API secrets or IDs.
// Deployed behind the project's existing Vercel SSO deployment protection.
// Fail closed on production, unexpected branch or missing key.
// No createPost, deletePost, mutation, payment or database writes.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const AUDITED_BRANCH = "test/social-automation-safety-poc-20261023";
const BUFFER_API = "https://api.buffer.com";
const EXPECTED = ["instagram", "tiktok", "youtube"] as const;
type Org = { id: string; name?: string };
type Channel = { id: string; name?: string; service: string };
type QueryResult<T> = { data?: T; errors?: unknown[] };

function respond(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

async function gql<T>(token: string, query: string): Promise<T | null> {
  const response = await fetch(BUFFER_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as QueryResult<T>;
  if (payload.errors?.length || !payload.data) return null;
  return payload.data;
}

type RunwayOrganization = { creditBalance?: number; tier?: { maxMonthlyCreditSpend?: number } };

// Read-only Runway organization lookup, verified API reference GET /v1/organization.
// No generation requests are made, and raw provider errors/keys never leave this route.
async function runwayPreflight(): Promise<Record<string, unknown>> {
  const key = process.env.RUNWAY_API_KEY?.trim();
  if (!key || key.length < 10) return { state: "RUNWAY_KEY_MISSING", authenticated: false };
  try {
    const response = await fetch("https://api.dev.runwayml.com/v1/organization", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Runway-Version": "2024-11-06",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) return { state: "RUNWAY_AUTH_OR_LOOKUP_FAILED",
      authenticated: false, status: response.status };
    const json = (await response.json()) as RunwayOrganization;
    if (!Number.isSafeInteger(json.creditBalance) || (json.creditBalance ?? -1) < 0)
      return { state: "RUNWAY_CREDIT_BALANCE_UNVERIFIED", authenticated: false };
    return { state: "RUNWAY_CONNECTED_READ_ONLY", authenticated: true,
      creditBalance: json.creditBalance,
      generatedMediaCount: 0, generationCreditsSpentByThisCheck: 0 };
  } catch {
    return { state: "RUNWAY_READ_ONLY_NETWORK_FAILED", authenticated: false };
  }
}

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview" ||
      process.env.VERCEL_GIT_COMMIT_REF !== AUDITED_BRANCH) {
    return respond({ state: "NOT_AVAILABLE_OUTSIDE_ISOLATED_PREVIEW" }, 404);
  }

  const token = process.env.BUFFER_API_KEY?.trim();
  if (!token || token.length < 10) {
    return respond({
      state: "BUFFER_KEY_MISSING_IN_PREVIEW_RUNTIME",
      connectedVerified: false,
    }, 503);
  }
  try {
    const account = await gql<{ account?: { organizations?: Org[] } }>(
      token, "query GetOrganizations { account { organizations { id name } } }",
    );
    const orgs = account?.account?.organizations;
    if (!Array.isArray(orgs) || orgs.length < 1 || orgs.length > 20) {
      return respond({ state: "BUFFER_ORGANIZATIONS_LOOKUP_FAILED",
        connectedVerified: false }, 502);
    }
    const services = new Set<string>();
    let channelCount = 0;
    for (const org of orgs) {
      if (typeof org.id !== "string" || org.id.length < 3 ||
          org.id.length > 180) {
        return respond({ state: "BUFFER_ORGANIZATION_ID_INVALID",
          connectedVerified: false }, 502);
      }
      const query = `query GetChannels {
        channels(input: {organizationId: ${JSON.stringify(org.id)}}) {
          id name service
        }
      }`;
      const channelsResponse = await gql<{ channels?: Channel[] }>(token, query);
      if (!Array.isArray(channelsResponse?.channels)) {
        return respond({ state: "BUFFER_CHANNELS_LOOKUP_FAILED",
          connectedVerified: false }, 502);
      }
      for (const ch of channelsResponse.channels) {
        if (typeof ch.service === "string") services.add(ch.service.toLowerCase());
        channelCount++;
      }
    }
    const verifiedServices = EXPECTED.filter(name => services.has(name));
    const missingServices = EXPECTED.filter(name => !services.has(name));
    return respond({
      state: missingServices.length ? "CHANNELS_PARTIALLY_CONNECTED" : "CONNECTED_READ_ONLY",
      connectedVerified: missingServices.length === 0,
      organizationCount: orgs.length,
      channelCount,
      verifiedServices,
      missingServices,
      apiKeyPresent: true,
      runway: await runwayPreflight(),
      performedReadOnlyBufferQueries: true,
      postsCreated: 0,
      videoGenerationStarted: false,
      autopublishingActivated: false,
    }, missingServices.length ? 424 : 200);
  } catch {
    return respond({ state: "BUFFER_READ_ONLY_QUERY_FAILED",
      connectedVerified: false }, 502);
  }
}
