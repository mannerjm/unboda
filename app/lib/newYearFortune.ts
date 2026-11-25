export const NEW_YEAR_PRODUCT_ID = "new-year-fortune";
export const NEW_YEAR_MONTHS = Array.from({length:12},(_,i)=>`${i+1}월`);
export const NEW_YEAR_DOMAINS = ["재물운","직업운","사업운","연애·결혼운","대인관계운","가족운","건강운","학업·자기계발운"] as const;
/** Korean civil calendar: Nov–Dec next year, Jan–Oct current year. */
export function newYearTargetYear(anchor:{year:number;month:number}):number { return anchor.year+(anchor.month>=11?1:0); }

/** Public browsing is enabled. New orders fail closed unless the server authorizes this account for seasonal checkout. */
export function isNewYearSalePending(productId: string, checkoutAllowed = false): boolean {
  return productId === NEW_YEAR_PRODUCT_ID && !checkoutAllowed;
}

/** Seasonal artwork must not be carried forward to the wrong zodiac year. */
export function getNewYearArtwork(year: number) {
  return year === 2027
    ? { src: "/images/premium/2027-jeongmi-red-sheep.webp", alt: "2027년 정미년을 상징하는 붉은 양과 황금빛 새해 풍경" }
    : { src: "/images/premium/new-year-fortune.svg", alt: "새해를 상징하는 일출 풍경" };
}
