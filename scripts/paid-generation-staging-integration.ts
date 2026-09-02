/**
 * Staging-only diagnostic: verifies the paid_reports / paid_generation_attempts
 * runtime persistence contract against the real staging Supabase project.
 *
 * NOT wired into any npm script and NOT executed automatically. Run manually,
 * and only once every safety condition below is met:
 *
 *   1. STAGING_SUPABASE_PROJECT_REF matches the NEXT_PUBLIC_SUPABASE_URL project ref
 *      (enforced by assertStagingSupabaseProject()).
 *   2. STAGING_RUNTIME_TEST_CONFIRM is exactly "yes".
 *   3. STAGING_RUNTIME_TEST_USER_ID / STAGING_RUNTIME_TEST_PROFILE_ID point at a
 *      pre-existing staging fixture user/profile (never production data).
 *
 * Scope: DB/runtime persistence only. No OpenAI calls, no auth/purchase flow.
 * All rows created here are prefixed with "staging-runtime-test-". Cleanup
 * deletes only the paid_reports fixture (service_role has no DELETE grant on
 * paid_generation_attempts by design); attempts are removed via the report's
 * ON DELETE CASCADE, then a read-only check confirms both tables are empty
 * for this run's IDs. Existing data is never touched.
 */
import { randomUUID } from "node:crypto";
import { assertStagingSupabaseProject } from "./lib/assertStagingSupabaseProject";

function requireRuntimeTestConfirmation(): void {
  if (process.env.STAGING_RUNTIME_TEST_CONFIRM !== "yes") {
    throw new Error(
      'STAGING_RUNTIME_TEST_CONFIRM must be exactly "yes" to run this script. Refusing to touch Supabase.',
    );
  }
}

function requireFixtureIdentity(): { userId: string; profileId: string } {
  const userId = process.env.STAGING_RUNTIME_TEST_USER_ID;
  const profileId = process.env.STAGING_RUNTIME_TEST_PROFILE_ID;

  if (!userId || !profileId) {
    throw new Error(
      "STAGING_RUNTIME_TEST_USER_ID and STAGING_RUNTIME_TEST_PROFILE_ID must reference an existing staging fixture user/profile.",
    );
  }

  return { userId, profileId };
}

async function main(): Promise<void> {
  // Fail-closed: no Supabase client may exist before this line succeeds.
  const projectRef = assertStagingSupabaseProject();
  requireRuntimeTestConfirmation();
  const { userId, profileId } = requireFixtureIdentity();

  const runId = randomUUID();
  const fixturePrefix = `staging-runtime-test-${runId}`;
  const productId = `${fixturePrefix}-product`;
  const generationId = `${fixturePrefix}-generation`;

  console.info("[paid-generation-staging-integration] dry-run summary", {
    projectRef,
    fixturePrefix,
    plannedChecks: [
      "paid_reports fixture claim",
      "paid_generation_attempts retry_index sequencing (0 -> 1)",
      "succeeded attempt: status/failure_stage/usage/token persistence",
      "failed attempt: status/failure_stage persistence",
      "persistence-failure marking: status+failure_stage consistency",
      "(generation_id, retry_index) UNIQUE constraint rejection",
    ],
  });

  // Only after both guards pass do we import modules that can construct a Supabase client.
  const { claimPaidReport } = await import("../app/lib/paidReports/server");
  const {
    getNextPaidGenerationRetryIndex,
    persistPaidGenerationAttempt,
    markPaidGenerationPersistenceFailure,
  } = await import("../app/lib/paidGenerationTelemetryServer");
  const { createAdminClient } = await import("../app/lib/supabase/admin");

  const createdAttemptIds: string[] = [];
  let reportId: string | undefined;

  try {
    // A. paid_reports fixture via the real claim contract (no auth/purchase flow).
    const claim = await claimPaidReport({ userId, profileId, productId, purchaseId: null, analysisEditionKey: "LEGACY" });
    if (claim.state !== "claimed") {
      throw new Error(`unexpected claim state for a fresh fixture: ${claim.state}`);
    }
    reportId = claim.report.id;

    // B. retry_index sequencing.
    const firstRetryIndex = await getNextPaidGenerationRetryIndex(generationId);
    if (firstRetryIndex !== 0) {
      throw new Error(`expected first retry_index 0, got ${firstRetryIndex}`);
    }

    // C. succeeded attempt with usage/tokens.
    const succeededAttemptId = `${fixturePrefix}-attempt-0`;
    createdAttemptIds.push(succeededAttemptId);
    await persistPaidGenerationAttempt({
      attemptId: succeededAttemptId,
      generationId,
      reportId,
      productId,
      productFamily: "TOPIC",
      commercialBand: "T1_ENTRY",
      generationContractVersion: "V3",
      model: "gpt-5",
      reasoningEffort: "low",
      maxOutputTokens: 4800,
      requestId: `${fixturePrefix}-request-0`,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 1200,
      status: "succeeded",
      failureStage: null,
      retryIndex: firstRetryIndex,
      usageAvailable: true,
      inputTokens: 100,
      cachedInputTokens: 10,
      cacheWriteTokens: 0,
      outputTokens: 200,
      reasoningTokens: 20,
      totalTokens: 300,
    });

    const secondRetryIndex = await getNextPaidGenerationRetryIndex(generationId);
    if (secondRetryIndex !== 1) {
      throw new Error(`expected second retry_index 1, got ${secondRetryIndex}`);
    }

    // D. failed attempt with a valid failure_stage.
    const failedAttemptId = `${fixturePrefix}-attempt-1`;
    createdAttemptIds.push(failedAttemptId);
    await persistPaidGenerationAttempt({
      attemptId: failedAttemptId,
      generationId,
      reportId,
      productId,
      productFamily: "TOPIC",
      commercialBand: "T1_ENTRY",
      generationContractVersion: "V3",
      model: "gpt-5",
      reasoningEffort: "low",
      maxOutputTokens: 4800,
      requestId: null,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 800,
      status: "failed",
      failureStage: "consistency",
      retryIndex: secondRetryIndex,
      usageAvailable: false,
      inputTokens: null,
      cachedInputTokens: null,
      cacheWriteTokens: null,
      outputTokens: null,
      reasoningTokens: null,
      totalTokens: null,
    });

    // E. persistence-failure marking must not leave status=succeeded with failure_stage=persistence.
    await markPaidGenerationPersistenceFailure({
      attemptId: succeededAttemptId,
      failureStage: "persistence",
    });

    const admin = createAdminClient();
    const { data: markedRow, error: markedError } = await admin
      .from("paid_generation_attempts")
      .select("status, failure_stage")
      .eq("attempt_id", succeededAttemptId)
      .maybeSingle<{ status: string; failure_stage: string | null }>();

    if (markedError) {
      throw new Error(`failed to read back persistence-marked attempt: ${markedError.message}`);
    }
    if (markedRow?.status !== "failed" || markedRow?.failure_stage !== "persistence") {
      throw new Error(
        `persistence marking contract violated: status=${markedRow?.status}, failure_stage=${markedRow?.failure_stage}`,
      );
    }

    // F. (generation_id, retry_index) UNIQUE constraint must reject a duplicate attempt.
    let uniqueViolationObserved = false;
    try {
      await persistPaidGenerationAttempt({
        attemptId: `${fixturePrefix}-attempt-1-dup`,
        generationId,
        reportId,
        productId,
        productFamily: "TOPIC",
        commercialBand: "T1_ENTRY",
        generationContractVersion: "V3",
        model: "gpt-5",
        reasoningEffort: "low",
        maxOutputTokens: 4800,
        requestId: null,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 500,
        status: "failed",
        failureStage: "consistency",
        retryIndex: secondRetryIndex,
        usageAvailable: false,
        inputTokens: null,
        cachedInputTokens: null,
        cacheWriteTokens: null,
        outputTokens: null,
        reasoningTokens: null,
        totalTokens: null,
      });
    } catch {
      uniqueViolationObserved = true;
    }
    if (!uniqueViolationObserved) {
      throw new Error(
        "(generation_id, retry_index) UNIQUE constraint did not reject a duplicate attempt",
      );
    }

    console.info("[paid-generation-staging-integration] all runtime contract checks passed", {
      projectRef,
      fixturePrefix,
    });
  } finally {
    const admin = createAdminClient();

    // service_role intentionally has no DELETE grant on paid_generation_attempts
    // (013_paid_generation_attempts.sql) so telemetry rows can't be deleted directly.
    // Deleting the paid_reports fixture cascades to its attempts via
    // report_id ... on delete cascade (013_paid_generation_attempts.sql).
    if (reportId) {
      const { error } = await admin
        .from("paid_reports")
        .delete()
        .eq("id", reportId);

      if (error) {
        console.error("[paid-generation-staging-integration] cleanup failed for report", {
          reportId,
          message: error.message,
        });
      }
    }

    if (reportId || createdAttemptIds.length > 0) {
      const { data: remainingAttempts, error: attemptCheckError } = await admin
        .from("paid_generation_attempts")
        .select("attempt_id")
        .in("attempt_id", createdAttemptIds.length > 0 ? createdAttemptIds : [""]);

      if (attemptCheckError) {
        throw new Error(
          `cleanup verification failed to read back paid_generation_attempts: ${attemptCheckError.message}`,
        );
      }

      const { data: remainingReports, error: reportCheckError } = reportId
        ? await admin.from("paid_reports").select("id").eq("id", reportId)
        : { data: [], error: null };

      if (reportCheckError) {
        throw new Error(`cleanup verification failed to read back paid_reports: ${reportCheckError.message}`);
      }

      const remainingAttemptCount = remainingAttempts?.length ?? 0;
      const remainingReportCount = remainingReports?.length ?? 0;

      console.info("[paid-generation-staging-integration] cleanup verification", {
        remainingAttemptCount,
        remainingReportCount,
      });

      if (remainingAttemptCount !== 0 || remainingReportCount !== 0) {
        throw new Error(
          `cleanup failed: ${remainingAttemptCount} attempt row(s) and ${remainingReportCount} report row(s) still remain`,
        );
      }
    }
  }
}

void main();
