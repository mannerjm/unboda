import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";

const WATCHDOG_MS = 150_000;
const HEARTBEAT_MS = 10_000;

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

async function main(): Promise<void> {
  const generate = process.argv.includes("--generate");
  const childMode = generate ? "--generate" : "--dry-run";
  console.log("V4_PARENT_START");
  console.log(`V4_PARENT_MODE=${generate ? "GENERATE" : "DRY_RUN"}`);
  console.log("V4_PARENT_TARGET=career-job-change");

  const nodeEnv = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test"
    ? process.env.NODE_ENV
    : "development";
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: nodeEnv,
  };
  const childCommand = process.platform === "win32"
    ? (process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe")
    : "npx";
  const childArgs = process.platform === "win32"
    ? ["/d", "/s", "/c", `npx.cmd --yes tsx scripts/v4-calibration-smoke-child.ts ${childMode} --product career-job-change`]
    : ["--yes", "tsx", "scripts/v4-calibration-smoke-child.ts", childMode, "--product", "career-job-change"];

  let stdoutChunkCount = 0;
  let stderrChunkCount = 0;
  let lastLifecycleEvent = "V4_PARENT_START";
  let childAlive = false;
  const startedAt = Date.now();

  console.log("V4_CHILD_SPAWN_START");
  const child: ChildProcess = spawn(childCommand, childArgs, {
    cwd: process.cwd(),
    env: environment,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  childAlive = true;
  console.log("V4_CHILD_SPAWNED", { pidPresent: Boolean(child.pid) });

  child.stdout?.on("data", (chunk: Buffer) => {
    stdoutChunkCount += 1;
    process.stdout.write(chunk);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    stderrChunkCount += 1;
    process.stderr.write(chunk);
  });
  child.on("spawn", () => {
    lastLifecycleEvent = "V4_CHILD_EVENT_SPAWN";
    console.log("V4_CHILD_EVENT_SPAWN");
  });
  child.on("error", (error) => {
    childAlive = false;
    lastLifecycleEvent = "V4_CHILD_EVENT_ERROR";
    console.error("V4_CHILD_EVENT_ERROR", safeError(error));
  });
  child.on("exit", (exitCode, signal) => {
    childAlive = false;
    lastLifecycleEvent = "V4_CHILD_EVENT_EXIT";
    console.log("V4_CHILD_EVENT_EXIT", { exitCode, signal: signal ?? "none" });
  });
  child.on("close", (exitCode, signal) => {
    childAlive = false;
    lastLifecycleEvent = "V4_CHILD_EVENT_CLOSE";
    console.log("V4_CHILD_EVENT_CLOSE", { exitCode, signal: signal ?? "none" });
  });

  const parentHeartbeat = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    if (elapsedSeconds >= 10 && elapsedSeconds <= 150 && elapsedSeconds % 10 === 0) {
      console.log(`V4_PARENT_HEARTBEAT_${elapsedSeconds}S`);
    }
  }, HEARTBEAT_MS);

  const watchdog = setTimeout(() => {
    console.error("V4_PARENT_WATCHDOG_150S", {
      childAlive,
      childExitCode: child.exitCode,
      childSignalCode: child.signalCode,
      childKilled: child.killed,
    });
    if (childAlive) child.kill();
  }, WATCHDOG_MS);

  await once(child, "close");
  clearInterval(parentHeartbeat);
  clearTimeout(watchdog);
  console.log("V4_STDOUT_CHUNK_COUNT=" + stdoutChunkCount);
  console.log("V4_STDERR_CHUNK_COUNT=" + stderrChunkCount);
  console.log("V4_LAST_LIFECYCLE_EVENT=" + lastLifecycleEvent);
  console.log("V4_PARENT_COMPLETE elapsedMs=" + (Date.now() - startedAt));
}

void main().catch((error: unknown) => {
  console.error("V4_PARENT_FAILURE", safeError(error));
  process.exitCode = 1;
});
