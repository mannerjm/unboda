// Read-only Advanced REST account verification. No post creation or token disclosure.
const HOST = "https://app.metricool.com";
const USER_ID = "5729495";
const BRAND_ID = "7377653";
export async function verifyAdvancedRestAccess({env = {}, fetcher = fetch, allowNetwork = false} = {}) {
  if (!allowNetwork) return {state:"BLOCKED",reason:"READ_ONLY_NETWORK_OPT_IN_REQUIRED"};
  const token = typeof env.METRICOOL_API_TOKEN === "string" ? env.METRICOOL_API_TOKEN.trim() : "";
  if (!token) return {state:"BLOCKED",reason:"METRICOOL_API_TOKEN_MISSING"};
  if (env.METRICOOL_USER_ID !== USER_ID || env.METRICOOL_BLOG_ID !== BRAND_ID)
    return {state:"BLOCKED",reason:"BRAND_IDENTITY_UNVERIFIED"};
  const url = new URL("/api/admin/simpleProfiles", HOST);
  url.searchParams.set("userId", USER_ID);
  let response;
  try {
    response = await fetcher(url, {method:"GET",headers:{"X-Mc-Auth":token,"Accept":"application/json"},
      redirect:"error",cache:"no-store"});
  } catch {
    return {state:"FAILED",reason:"READ_ONLY_NETWORK_ERROR"};
  }
  if (!response?.ok) return {state:"FAILED",reason:"METRICOOL_READ_ONLY_HTTP_ERROR",
    httpStatus:Number(response?.status) || null};
  let body;
  try {body=await response.json();} catch {return {state:"FAILED",reason:"INVALID_JSON_RESPONSE"};}
  const list=Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data :
    Array.isArray(body?.brands) ? body.brands : Array.isArray(body?.profiles) ? body.profiles : null;
  if (!list) return {state:"FAILED",reason:"UNVERIFIED_PROFILES_RESPONSE_SCHEMA"};
  const matching=list.some(item => String(item?.id ?? item?.blogId ?? item?.brandId ?? "") === BRAND_ID);
  if (!matching) return {state:"FAILED",reason:"BRAND_NOT_VISIBLE_TO_TOKEN"};
  return {state:"REST_READ_AUTHENTICATED",brandId:BRAND_ID,
    userId:USER_ID,method:"GET",externalWrites:false,
    postingNotYetVerified:true};
}
