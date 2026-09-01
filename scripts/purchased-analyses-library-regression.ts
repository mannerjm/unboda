import { readFileSync } from "node:fs";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const page = readFileSync("app/purchased-analyses/page.tsx", "utf8");
const list = readFileSync("app/components/PurchasedAnalysesList.tsx", "utf8");
const shell = readFileSync("app/components/AppShell.tsx", "utf8");
const paidReports = readFileSync("app/lib/paidReports/server.ts", "utf8");
const mypage = readFileSync("app/mypage/page.tsx", "utf8");
const saju = readFileSync("app/saju/page.tsx", "utf8");

assert(page.includes('redirect("/auth/login?returnTo=/purchased-analyses")'), "purchased analyses must require authentication");
assert(page.includes("getActiveProfile(user.id)"), "purchased analyses must resolve the authoritative active profile");
assert(page.includes("analysis.profileId === activeProfile.id"), "library must exclude another profile's analyses");
assert(page.includes("현재 분석 대상") && page.includes("activeProfile.label"), "active profile orientation must be displayed");
assert(page.includes("마이페이지에서 프로필 선택") && page.includes('href="/mypage"'), "no-active-profile recovery must link to My Page");
assert(!page.includes("ProfileSelector"), "purchased analyses must not expose a profile switcher");
assert(shell.includes('href: "/purchased-analyses"') && shell.includes("구매한 분석"), "shell must expose purchased analyses navigation");
assert(!shell.includes("결제 / 관리"), "purchased analyses must remain in the analysis group, not a payment management group");
assert(list.includes("none:") && list.includes("generating:") && list.includes("completed:") && list.includes("failed:"), "library must preserve all paid report states");
assert(list.includes('analysis.reportStatus === "generating"'), "generating library items must remain non-actionable");
assert(list.includes("/paid-analysis/${analysis.productId}/report?profileId=${encodeURIComponent(profileId)}"), "report actions must preserve the active profile id");
assert(list.includes("아직 구매한 심층 분석이 없습니다.") && list.includes("현재 분석 대상에게 필요한 심층 분석을 확인해 보세요.") && list.includes("심층 분석 둘러보기 →") && list.includes('href="/deep-analysis"'), "empty library must provide a polished deep analysis recovery");
assert(paidReports.includes("listUserEntitlements(userId)") && !paidReports.includes("getLaunchProductIds"), "library source must be active entitlement based, not launch-filtered");
assert(mypage.includes("구매한 심층 분석") && mypage.includes("구매 및 환불 내역"), "My Page purchase and refund history must remain intact");
assert(!saju.includes("PurchasedAnalysesList"), "내 분석 must remain free-only");
assert(Boolean(getPremiumProduct("health")), "historical canonical products must remain resolvable");

console.log("purchased-analyses-library-regression: OK");
