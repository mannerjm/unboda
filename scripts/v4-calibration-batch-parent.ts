import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";

const WATCHDOG_MS = 150_000;
const HEARTBEAT_MS = 10_000;

const BATCH_PRODUCT_IDS = [
  "money-saving-discipline",
  "career-promotion-readiness",
  "money-income-stability",
  "relationship-current",
  "health-stress-regulation",
  "business-startup-readiness",
  "yearly-current",
  "annual-next",
  "lifetime-overview",
] as const;

function safeError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { name: "UnknownError", message: "unknown error" };
  }

  return {
    name: error.name,
    constructor: error.constructor.name,
    message: error.message.slice(0, 200),
  };
}

async function runProduct(productId: string, generate: boolean): Promise<boolean> {
  const nodeEnv = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test"
    ? process.env.NODE_ENV
    : "development";
  const environment: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: nodeEnv };
  const childMode = generate ? "--generate" : "--dry-run";
  const childCommand = process.platform === "win32"
    ? (process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe")
    : "npx";
  const childArgs = process.platform === "win32"
    ? ["/d", "/s", "/c", `npx.cmd --yes tsx scripts/v4-calibration-batch-child.ts ${childMode} --product ${productId}`]
    : ["--yes", "tsx", "scripts/v4-calibration-batch-child.ts", childMode, "--product", productId];

  const startedAt = Date.now();
  let stdoutChunkCount = 0;
  let stderrChunkCount = 0;
  let childAlive = false;
  let watchdogTriggered = false;
  let closed = false;

  console.log(`V4_BATCH_PRODUCT_START productId=${productId}`);
  const child: ChildProcess = spawn(childCommand, childArgs, {
    cwd: process.cwd(),
    env: environment,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  childAlive = true;
  child.stdout?.on("data", (chunk: Buffer) => {
    stdoutChunkCount += 1;
    process.stdout.write(chunk);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    stderrChunkCount += 1;
    process.stderr.write(chunk);
  });
  child.on("spawn", () => console.log(`V4_BATCH_CHILD_EVENT_SPAWN productId=${productId}`));
  child.on("error", (error) => {
    childAlive = false;
    console.error(`V4_BATCH_CHILD_EVENT_ERROR productId=${productId}`, safeError(error));
  });
  child.on("exit", (exitCode, signal) => {
    childAlive = false;
    console.log(`V4_BATCH_CHILD_EVENT_EXIT productId=${productId}`, { exitCode, signal: signal ?? "none" });
  });
  child.on("close", (exitCode, signal) => {
    childAlive = false;
    closed = true;
    console.log(`V4_BATCH_CHILD_EVENT_CLOSE productId=${productId}`, { exitCode, signal: signal ?? "none" });
  });

  const heartbeat = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    if (elapsedSeconds >= 10 && elapsedSeconds % 10 === 0) {
      console.log(`V4_BATCH_PARENT_HEARTBEAT_${elapsedSeconds}S productId=${productId}`);
    }
  }, HEARTBEAT_MS);
  const watchdog = setTimeout(() => {
    watchdogTriggered = true;
    console.error(`V4_BATCH_WATCHDOG_150S productId=${productId}`, {
      childAlive,
      childExitCode: child.exitCode,
      childSignalCode: child.signalCode,
      childKilled: child.killed,
    });
    if (childAlive) child.kill();
  }, WATCHDOG_MS);

  await once(child, "close");
  clearInterval(heartbeat);
  clearTimeout(watchdog);
  const success = closed && !watchdogTriggered && child.exitCode === 0 && !child.signalCode;
  console.log(`V4_BATCH_PRODUCT_COMPLETE productId=${productId}`, {
    success,
    exitCode: child.exitCode,
    signal: child.signalCode ?? "none",
    stdoutChunkCount,
    stderrChunkCount,
    elapsedMs: Date.now() - startedAt,
  });
  return success;
}

async function main(): Promise<void> {
  const generate = process.argv.includes("--generate");
  console.log("V4_BATCH_PARENT_START");
  console.log(`V4_BATCH_MODE=${generate ? "GENERATE" : "DRY_RUN"}`);
  console.log(`V4_BATCH_COUNT=${BATCH_PRODUCT_IDS.length}`);

  for (const productId of BATCH_PRODUCT_IDS) {
    const success = await runProduct(productId, generate);
    if (!success) {
      throw new Error(`batch stopped after execution failure for ${productId}`);
    }
  }

  console.log("V4_BATCH_PARENT_COMPLETE");
}

void main().catch((error: unknown) => {
  console.error("V4_BATCH_PARENT_FAILURE", safeError(error));
  process.exitCode = 1;
});
