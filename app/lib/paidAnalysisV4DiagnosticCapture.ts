import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PaidAnalysisDetailPromptInput } from "./paidAnalysisDetailPrompt";
import { buildPaidAnalysisDetailPromptV4 } from "./paidAnalysisDetailPrompt";
import { parseGeneratedPaidAnalysisDetailV4 } from "./paidAnalysisDetailService";
import { parseResolvedPaidAnalysisDetailV4 } from "./paidAnalysisDetailOutputParser";
import { validatePaidAnalysisConsistencyV4 } from "./paidAnalysisConsistencyValidator";
import { reviewPaidAnalysisDetailV4 } from "./paidAnalysisSelfReview";
import { resolvePaidAnalysisEvidence } from "./paidAnalysisEvidenceResolver";
import {
  reviewEvidenceLinkage,
  validateActionStructure,
  validateMoneySafety,
  validateTopicTimelineDates,
} from "./paidAnalysisV4QualityValidators";
import { getPaidAnalysisEngine } from "./paidAnalysisEngine";
import { getPaidAnalysisTopicConfig } from "./paidAnalysisTopicConfig";

export type PaidAnalysisV4DiagnosticStage =
  | "PREPARE"
  | "REQUEST"
  | "RESPONSE"
  | "TEXT_EXTRACTION"
  | "STRUCTURED_PARSE"
  | "SCHEMA_VALIDATE"
  | "ARTIFACT_WRITE"
  | "COMPLETE";

export type PaidAnalysisV4DiagnosticRequestResult = {
  requestId?: string;
  responseStatus?: string;
  rawOutput?: string;
};

export type PaidAnalysisV4DiagnosticEnvelope = {
  runId: string;
  productId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  callAttempted: boolean;
  callCompleted: boolean;
  httpOrSdkSuccess: boolean;
  requestId?: string;
  responseStatus?: string;
  model: string;
  reasoningSetting: "low";
  outputLimit: number;
  timeoutMs: number;
  retryCount: number;
  rawOutputAvailable: boolean;
  rawOutputLength: number;
  parsedOutputAvailable: boolean;
  parsedOutputLength: number;
  structuredParseSuccess: boolean;
  schemaValidationSuccess: boolean;
  errorStage?: PaidAnalysisV4DiagnosticStage;
  errorName?: string;
  errorMessageSafe?: string;
  requiredInsightCountExpected: number;
  requiredInsightCountDetected?: number;
  artifactPath?: string;
};

export type PaidAnalysisV4DiagnosticManifest = {
  runId: string;
  startedAt: string;
  finishedAt?: string;
  products: PaidAnalysisV4DiagnosticEnvelope[];
  callsAttempted: number;
  callsCompleted: number;
  successfulCalls: number;
  failedCalls: number;
  parseFailures: number;
  artifactCount: number;
};

export type PaidAnalysisV4DiagnosticArtifact = {
  envelope: PaidAnalysisV4DiagnosticEnvelope;
  rawOutput?: string;
  parsedOutput?: unknown;
  resolvedEvidence?: unknown;
  validation?: unknown;
};

export type PaidAnalysisV4DiagnosticArtifactStore = {
  artifactDirectory: string;
  getProductPath: (productId: string) => string;
  writeManifest: (manifest: PaidAnalysisV4DiagnosticManifest) => Promise<string>;
  writeProduct: (productId: string, artifact: PaidAnalysisV4DiagnosticArtifact) => Promise<string>;
};

export type PaidAnalysisV4DiagnosticOptions = {
  runId: string;
  productIds: readonly string[];
  model: string;
  reasoningSetting: "low";
  outputLimit: number;
  timeoutMs: number;
  retryCount: number;
  buildInput: (productId: string) => PaidAnalysisDetailPromptInput;
  request: (prompt: string) => Promise<PaidAnalysisV4DiagnosticRequestResult>;
  artifactStore: PaidAnalysisV4DiagnosticArtifactStore;
};

function safeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message.slice(0, 500) };
  }

  return { name: "UnknownError", message: "unknown diagnostic failure" };
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || /abort|timeout/i.test(error.message));
}

function timestampRunId(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function writeJsonAtomically(filePath: string, value: unknown): Promise<void> {
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(value, null, 2), "utf8");
  await rename(temporaryPath, filePath);
}

export async function createPaidAnalysisV4DiagnosticArtifactStore(
  runId = timestampRunId(),
  baseDirectory = path.join(process.cwd(), ".tmp", "paid-analysis-v4-diagnostics"),
): Promise<PaidAnalysisV4DiagnosticArtifactStore> {
  const artifactDirectory = path.join(baseDirectory, runId);
  await mkdir(artifactDirectory, { recursive: true });

  return {
    artifactDirectory,
    getProductPath(productId) {
      return path.join(artifactDirectory, `${runId}-${productId}.json`);
    },
    async writeManifest(manifest) {
      const filePath = path.join(artifactDirectory, `${runId}-manifest.json`);
      await writeJsonAtomically(filePath, manifest);
      return filePath;
    },
    async writeProduct(productId, artifact) {
      const filePath = this.getProductPath(productId);
      await writeJsonAtomically(filePath, artifact);
      return filePath;
    },
  };
}

export async function removePaidAnalysisV4DiagnosticArtifacts(directory: string): Promise<void> {
  await rm(directory, { recursive: true, force: true });
}

function updateManifestCounts(manifest: PaidAnalysisV4DiagnosticManifest): void {
  manifest.callsAttempted = manifest.products.filter((item) => item.callAttempted).length;
  manifest.callsCompleted = manifest.products.filter((item) => item.callCompleted).length;
  manifest.successfulCalls = manifest.products.filter((item) => item.schemaValidationSuccess).length;
  manifest.failedCalls = manifest.products.filter((item) => Boolean(item.errorStage)).length;
  manifest.parseFailures = manifest.products.filter((item) => item.errorStage === "STRUCTURED_PARSE" || item.errorStage === "SCHEMA_VALIDATE").length;
  manifest.artifactCount = manifest.products.filter((item) => Boolean(item.artifactPath)).length;
}

export async function runPaidAnalysisV4DiagnosticCapture(
  options: PaidAnalysisV4DiagnosticOptions,
): Promise<PaidAnalysisV4DiagnosticManifest> {
  const manifest: PaidAnalysisV4DiagnosticManifest = {
    runId: options.runId,
    startedAt: new Date().toISOString(),
    products: [],
    callsAttempted: 0,
    callsCompleted: 0,
    successfulCalls: 0,
    failedCalls: 0,
    parseFailures: 0,
    artifactCount: 0,
  };

  await options.artifactStore.writeManifest(manifest);

  productLoop: for (const productId of options.productIds) {
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    const config = getPaidAnalysisTopicConfig(productId);
    const envelope: PaidAnalysisV4DiagnosticEnvelope = {
      runId: options.runId,
      productId,
      startedAt,
      finishedAt: startedAt,
      durationMs: 0,
      callAttempted: false,
      callCompleted: false,
      httpOrSdkSuccess: false,
      model: options.model,
      reasoningSetting: options.reasoningSetting,
      outputLimit: options.outputLimit,
      timeoutMs: options.timeoutMs,
      retryCount: options.retryCount,
      rawOutputAvailable: false,
      rawOutputLength: 0,
      parsedOutputAvailable: false,
      parsedOutputLength: 0,
      structuredParseSuccess: false,
      schemaValidationSuccess: false,
      requiredInsightCountExpected: config?.requiredInsights.length ?? 0,
    };
    const artifact: PaidAnalysisV4DiagnosticArtifact = { envelope };

    try {
      const input = options.buildInput(productId);
      const prompt = buildPaidAnalysisDetailPromptV4(input);
      envelope.callAttempted = true;

      let requestResult: PaidAnalysisV4DiagnosticRequestResult;
      try {
        requestResult = await options.request(prompt);
      } catch (error) {
        const details = safeError(error);
        envelope.errorStage = "REQUEST";
        envelope.errorName = isTimeout(error) ? "REQUEST_TIMEOUT" : details.name;
        envelope.errorMessageSafe = details.message;
        await finalizeProduct(options, manifest, envelope, artifact, startedMs);
        continue productLoop;
      }

      envelope.callCompleted = true;
      envelope.httpOrSdkSuccess = true;
      envelope.requestId = requestResult.requestId;
      envelope.responseStatus = requestResult.responseStatus;

      if (requestResult.responseStatus && requestResult.responseStatus !== "completed") {
        envelope.errorStage = "RESPONSE";
        envelope.errorName = "INCOMPLETE_RESPONSE";
        envelope.errorMessageSafe = `response status=${requestResult.responseStatus}`;
        await finalizeProduct(options, manifest, envelope, artifact, startedMs);
        continue productLoop;
      }

      const rawOutput = requestResult.rawOutput?.trim() ?? "";
      envelope.rawOutputAvailable = rawOutput.length > 0;
      envelope.rawOutputLength = rawOutput.length;
      artifact.rawOutput = rawOutput || undefined;

      if (!rawOutput) {
        envelope.errorStage = "TEXT_EXTRACTION";
        envelope.errorName = "EMPTY_RESPONSE";
        envelope.errorMessageSafe = "response output text was empty";
        await finalizeProduct(options, manifest, envelope, artifact, startedMs);
        continue productLoop;
      }

      let detail;
      try {
        detail = parseGeneratedPaidAnalysisDetailV4(rawOutput);
        envelope.structuredParseSuccess = true;
        envelope.parsedOutputAvailable = true;
        envelope.parsedOutputLength = JSON.stringify(detail).length;
        envelope.requiredInsightCountDetected = config?.requiredInsights.length;
        artifact.parsedOutput = detail;
      } catch (error) {
        const details = safeError(error);
        envelope.errorStage = "STRUCTURED_PARSE";
        envelope.errorName = details.name;
        envelope.errorMessageSafe = details.message;
        await finalizeProduct(options, manifest, envelope, artifact, startedMs);
        continue productLoop;
      }

      try {
        const consistency = validatePaidAnalysisConsistencyV4(detail);
        const review = reviewPaidAnalysisDetailV4(detail);
        const timeline = validateTopicTimelineDates(detail, productId);
        const action = validateActionStructure(detail);
        const money = getPaidAnalysisEngine(productId) === "MONEY"
          ? validateMoneySafety(detail)
          : { ok: true, issues: [] };
        const { resolved, unresolvedKeys } = resolvePaidAnalysisEvidence(detail.evidence, input.evidenceFacts ?? {});
        const resolvedDetail = { ...detail, evidence: resolved };
        parseResolvedPaidAnalysisDetailV4(resolvedDetail);

        artifact.resolvedEvidence = { resolved, unresolvedKeys };
        artifact.validation = {
          consistency,
          review,
          timeline,
          action,
          money,
          linkageWarnings: reviewEvidenceLinkage(resolvedDetail),
          resolvedValidation: true,
        };
        envelope.schemaValidationSuccess = consistency.ok && review.passed && timeline.ok && action.ok && money.ok && unresolvedKeys.length === 0;
        if (!envelope.schemaValidationSuccess) {
          envelope.errorStage = "SCHEMA_VALIDATE";
          envelope.errorName = "VALIDATION_FAILED";
          envelope.errorMessageSafe = "parsed output did not satisfy V4 validation";
        }
      } catch (error) {
        const details = safeError(error);
        envelope.errorStage = "SCHEMA_VALIDATE";
        envelope.errorName = details.name;
        envelope.errorMessageSafe = details.message;
      }
    } catch (error) {
      const details = safeError(error);
      envelope.errorStage = "PREPARE";
      envelope.errorName = details.name;
      envelope.errorMessageSafe = details.message;
    }

    await finalizeProduct(options, manifest, envelope, artifact, startedMs);
  }

  manifest.finishedAt = new Date().toISOString();
  updateManifestCounts(manifest);
  await options.artifactStore.writeManifest(manifest);
  return manifest;
}

async function finalizeProduct(
  options: PaidAnalysisV4DiagnosticOptions,
  manifest: PaidAnalysisV4DiagnosticManifest,
  envelope: PaidAnalysisV4DiagnosticEnvelope,
  artifact: PaidAnalysisV4DiagnosticArtifact,
  startedMs: number,
): Promise<PaidAnalysisV4DiagnosticManifest> {
  envelope.finishedAt = new Date().toISOString();
  envelope.durationMs = Date.now() - startedMs;
  envelope.artifactPath = options.artifactStore.getProductPath(envelope.productId);
  artifact.envelope = envelope;

  try {
    const writtenArtifactPath = await options.artifactStore.writeProduct(envelope.productId, artifact);
    if (writtenArtifactPath !== envelope.artifactPath) {
      throw new Error("artifact store returned a path different from its deterministic product path");
    }
  } catch (error) {
    const details = safeError(error);
    envelope.errorStage = "ARTIFACT_WRITE";
    envelope.errorName = details.name;
    envelope.errorMessageSafe = details.message;
  }

  manifest.products.push(envelope);
  updateManifestCounts(manifest);
  await options.artifactStore.writeManifest(manifest);
  return manifest;
}