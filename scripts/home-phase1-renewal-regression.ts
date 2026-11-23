import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";
import { getProductPricing } from "../app/lib/productPricing";
import { COMPATIBILITY_ROMANTIC_PRODUCT } from "../app/lib/specialAnalysisProducts";
import { HOME_SALE_CATEGORY_LINKS } from "../app/components/HomeMarketplaceContent";
import { groupTopicCatalogProductsByCategory, listPeriodCatalogProducts, resolvePremiumCatalogEntry } from "../app/lib/premiumCatalog";

const page = readFileSync("app/page.tsx","utf8");
const home = readFileSync("app/components/HomeExperience.tsx","utf8");
const market = readFileSync("app/components/HomeMarketplaceContent.tsx","utf8");
const renderedHome = home.slice(home.indexOf("function HomeShell("), home.indexOf("function NewHome("));
assert(renderedHome.length > 200 && renderedHome.includes("<HomeMarketplaceContent copy={copy}"), "white storefront must be the actual rendered homepage");
assert(renderedHome.includes("bg-white") && !renderedHome.includes("<FlowVisual/>")
  && !renderedHome.includes("<QuickRoutes") && !renderedHome.includes("<HomeJourney/>")
  && !renderedHome.includes("home-premium-orbit.svg"), "no old orb, four wide service cards or dark hero on PC or mobile");
assert(home.includes('import HomeMarketplaceContent from "./HomeMarketplaceContent"'), "new storefront imported");
assert(renderedHome.includes("<Header state={state}/>") && renderedHome.includes("<PwaInstallGuide/>") && renderedHome.includes("<Footer/>"),
  "preserve magazine/weather/account/AI header, PWA controls and statutory footer");
assert(home.includes('href="/blog"') && home.includes("매거진"), "magazine must remain in top navigation");
assert(home.includes("<HomeWeatherLine />") && home.includes("<Link href={aiHref}") && home.includes("<Link href={accountHref}"), "preserve weather, AI and account");

for (const required of [
 "getCurrentUser","listUserProfiles","getActiveProfile","listUserFreeAnalysisResults",
 "resolveProfileFreeAnalysisStatus","createEvaluationContext","listUserPaidAnalysisSummaries","createAdminClient"
]) assert(page.includes(required), "keep profile-scoped server auth/customer-stage logic: "+required);
for (const state of ['kind: "guest"','kind: "no_profiles"','kind: "needs_profile_selection"',
 'kind: "analysis_ready"','kind: "analysis_in_progress"','kind: "analysis_stale"','kind: "analysis_complete"'])
 assert(page.includes(state),"member/guest result state missing: "+state);
for (const stage of ["free_only","paid_preparing","paid_failed","paid_ready","consulting_active"])
 assert(page.includes('"'+stage+'"'),"paid customer stage missing: "+stage);
for (const x of ['primaryHref: "/guest-saju"','primaryHref: "/saju"',
 'primaryHref: "/ai-consulting"','primaryHref: "/purchased-analyses"'])
 assert(page.includes(x),"state-aware destination missing: "+x);
assert(page.includes('.eq("role", "assistant")'), "consulting-active must verify persisted messages");
for (const field of ["{copy.eyebrow}","{copy.title}","{copy.description}","{copy.primary}","{copy.secondary}",
 "href={copy.primaryHref}","href={copy.secondaryHref}"])
 assert(market.includes(field),"original login-dependent label/link changed: "+field);
assert(renderedHome.includes("profileLabel={returning?.profileLabel}") && renderedHome.includes("statusLabel={statusLabel}"),
 "profile and analysis in-progress/stale badge preserved");

const expected = [
 ["학업성장운","/deep-analysis?mode=topic&category=growth"],
 ["재물운","/deep-analysis?mode=topic&category=money"],
 ["사업운","/deep-analysis?mode=topic&category=business"],
 ["건강운","/deep-analysis?mode=topic&category=health"],
 ["직업운","/deep-analysis?mode=topic&category=career"],
 ["대인관계운","/deep-analysis?mode=topic&category=social"],
 ["연애운","/deep-analysis?mode=topic&category=relationship"],
 ["올해 운","/deep-analysis?mode=period&productId=yearly-current"],
 ["다음달 운","/deep-analysis?mode=period&productId=monthly-next"],
 ["두 사람 궁합","/special-analysis/compatibility"],
] as const;
assert.equal(HOME_SALE_CATEGORY_LINKS.length,10,"only ten actually purchasable topic categories");
assert.deepEqual(HOME_SALE_CATEGORY_LINKS.map(({label,href})=>[label,href]),
 expected.map(([label,href])=>[label,href]),"every category links to its real existing catalog");
assert(!HOME_SALE_CATEGORY_LINKS.some(x=>(new Set<string>(["무료 분석","무료분석","심층분석"])).has(x.label)),
 "free hero and generic deep-analysis must not be paid topic grid cards");
assert(market.includes("grid-cols-4") && market.includes("max-w-[35rem] lg:max-w-[40rem]"), "centered mobile-first four-column storefront, slightly wider PC content for readability");
assert(market.includes("min-h-[94px]") && market.includes("text-[28px]"), "enlarge paid category icon cards and their labels");
assert(market.includes("sm:w-[116px]") && market.includes("sm:text-[15px]"), "enlarge featured photos and question-first typography");
assert(market.includes("getPremiumProduct(productId)") && market.includes("getProductPricing(productId)")
 && market.includes('pricing.amount.toLocaleString("ko-KR")')
 && market.includes("COMPATIBILITY_ROMANTIC_PRODUCT.amount"), "prices must come from real checkout registries");
assert(market.includes("PREMIUM_PRODUCT_PHOTOS[productId]") && market.includes('PREMIUM_PRODUCT_PHOTOS["relationship-current"].src'),
 "use licensed existing images only");
for (const id of ["study-learning-strategy","money-shared-finance","yearly-current"]) {
 assert(getPremiumProduct(id),"featured premium product exists: "+id);
 assert(getProductPricing(id).amount>0,"featured product actually purchasable: "+id);
 assert(market.includes('"'+id+'"'),"featured product missing "+id);
}
assert(COMPATIBILITY_ROMANTIC_PRODUCT.amount===19_900,"romantic compatibility price matches existing purchase contract");
assert(market.includes('"/deep-analysis?mode=topic&category=" + encodeURIComponent(product.category) + "&productId=" + encodeURIComponent(product.id)'),
  "featured topic links must carry their actual category, not silently use money fallback");
assert(market.includes('getReadablePaidQuestion(productId, product.description)'),
  "featured listing must lead with the customer's real question instead of specialized product name");
const launchTopicGroups = groupTopicCatalogProductsByCategory();
const launchPeriodProducts = listPeriodCatalogProducts();
assert.equal(resolvePremiumCatalogEntry("topic",undefined,"study-learning-strategy").category,"growth",
  "previous bug: study strategy opened 재물운 because missing category defaulted to money");
assert.equal(resolvePremiumCatalogEntry("topic",undefined,"study-learning-strategy").productId,"study-learning-strategy",
  "study strategy must open directly on the correct product detail");
assert.equal(resolvePremiumCatalogEntry("topic","money","study-learning-strategy").category,"growth",
  "explicit stale category must not override the product's canonical launch category");
for (const group of launchTopicGroups) for (const product of group.products) {
 const selection = resolvePremiumCatalogEntry("topic",undefined,product.id);
 assert.equal(selection.category,group.category,"all launched deep links must resolve their canonical category: "+product.id);
 assert.equal(selection.productId,product.id,"all launched deep links must select their product: "+product.id);
}
for (const product of launchPeriodProducts) {
 const selection = resolvePremiumCatalogEntry("period",undefined,product.id);
 assert.equal(selection.category,null,"period detail must not select a topic category");
 assert.equal(selection.productId,product.id,"period detail must select requested product: "+product.id);
}
assert.equal(resolvePremiumCatalogEntry("topic","health","no-such-launch-product").productId,null,
  "invalid or non-launch product IDs cannot deep link to a made-up product");
assert.equal(resolvePremiumCatalogEntry("topic","health","no-such-launch-product").category,"health",
  "invalid product ID still keeps explicitly selected valid category");
assert(market.includes('COMPATIBILITY_ROMANTIC_PRODUCT.title'),"compatibility category and product remain unchanged");
assert(!/★\s*4\.9|이용자\s*[\d,]+\+|50%\s*할인|정가/.test(market),
 "no fabricated popularity, discounts or ratings copied from design artwork");
for (const forbidden of ["requestPayment(","grantEntitlement(","createAdminClient(","generatePaidReport("])
 assert(!market.includes(forbidden),"presentation must never change commercial permissions: "+forbidden);
assert(home.includes("운보다 · 참고용 명리 분석 서비스") && home.includes("support@unboda.kr")
 && home.includes("사업자등록번호 201-28-96364"),"business legal identity and footer preserved");

const footerMarkup = home.slice(home.indexOf("function Footer()"),home.indexOf("function StarField()"));
assert(footerMarkup.includes('bg-[#f8f5fc]') && footerMarkup.includes('border-[#e7def2]')
 && footerMarkup.includes("w-full"), "PC/mobile footer must have full-width lavender-gray background and soft border");
assert(renderedHome.includes("</div>\n    <Footer/>\n  </main>"),
  "legal/footer band must render outside narrow content column, truly full width on desktop");
for (const requiredLegalPath of ['href="/terms"','href="/privacy"','href="/refund"','href="/support"']) {
 assert(footerMarkup.includes(requiredLegalPath), "footer must preserve legal/support destination "+requiredLegalPath);
}
assert(!("originalAmount" in getProductPricing("study-learning-strategy"))
  && !("compareAtPrice" in getProductPricing("study-learning-strategy")),
  "real price registry has no substantiated old price; do not automatically claim a 50% discount");
assert(!market.includes("50%") && !market.includes("19,800원") && !market.includes("할인가"),
  "do not show unverified all-products discounts or made-up comparison prices");

console.log("Home mobile-first white topic storefront, canonical prices and login stages: PASS");
