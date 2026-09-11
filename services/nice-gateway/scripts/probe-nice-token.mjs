import { NiceProviderError, probeNiceAccessToken } from "../src/niceClient.mjs";

try {
  const result = await probeNiceAccessToken({
    clientId: process.env.NICE_CLIENT_ID,
    clientSecret: process.env.NICE_CLIENT_SECRET,
  });
  console.log(JSON.stringify(result));
} catch (error) {
  if (error instanceof NiceProviderError) {
    console.error(
      JSON.stringify({
        ok: false,
        error: error.code,
        provider: "NICE",
        httpStatus: error.httpStatus,
        providerResultCode: error.providerResultCode,
      }),
    );
    process.exitCode = 1;
  } else {
    console.error(JSON.stringify({ ok: false, error: "UNKNOWN_ERROR", provider: "NICE" }));
    process.exitCode = 1;
  }
}
