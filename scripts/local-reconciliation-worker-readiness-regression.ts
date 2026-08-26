import { POST } from "../app/api/internal/payments/reconcile/route";

async function main(): Promise<void> {
  const response = await POST(
    new Request("http://127.0.0.1:3000/api/internal/payments/reconcile", {
      method: "POST",
    }),
  );

  if (response.status !== 401) {
    throw new Error(`FAIL: expected unauthorized worker response, got ${response.status}`);
  }

  console.log("local reconciliation worker readiness passed: unauthorized request rejected");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
