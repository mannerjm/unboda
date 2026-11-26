/** Wealth storefront-only presentation. Canonical product names and prices remain unchanged. */
const WEALTH_COPY: Readonly<Record<string, {title:string; intro:string}>> = {
  "money-shared-finance": {"title":"함께 쓰는 돈","intro":"돈 이야기가 서운해지는 이유와 부담을 나누는 방법"},
  "money-contract-commitment": {"title":"계약하기 전 살펴볼 점","intro":"오래 이어지는 지출에서 놓치기 쉬운 부분"},
  "money-spending-decision": {"title":"큰돈을 쓰기 전","intro":"필요한 소비와 마음에 끌리는 소비의 차이"},
  "money-income-stability": {"title":"나의 수입운","intro":"수입이 달라질 때 내게 맞는 돈 관리 습관"},
  "money-debt-repayment": {"title":"빚과 돈 걱정","intro":"생활비와 갚을 돈 사이에서 챙겨볼 이야기"},
  "money-emergency-buffer": {"title":"갑자기 돈이 필요할 때","intro":"예상 밖의 지출에 대비하는 나만의 습관"},
  "money-wealth-accumulation": {"title":"돈이 모이는 습관","intro":"돈이 잘 모이지 않는 이유와 나에게 맞는 방법"},
  "money-leak-risk": {"title":"내 돈이 새는 이유","intro":"나도 모르게 반복되는 지출 습관 살펴보기"},
  "money-saving-discipline": {"title":"나에게 맞는 저축법","intro":"저축이 흐트러지는 이유와 꾸준히 모으는 습관"},
  "wealth": {"title":"나의 재물운","intro":"돈을 벌고 쓰는 내 성향과 지금의 재물 흐름"},
};
export function getWealthStorefrontCopy(productId:string) {
  if (!Object.prototype.hasOwnProperty.call(WEALTH_COPY, productId)) return undefined;
  return { ...WEALTH_COPY[productId], coverSrc: `/images/wealth-covers/${productId}.png` };
}
