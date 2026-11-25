export const NEW_YEAR_PRODUCT_ID = "new-year-fortune";
export const NEW_YEAR_MONTHS = Array.from({length:12},(_,i)=>`${i+1}월`);
export const NEW_YEAR_DOMAINS = ["재물운","직업운","사업운","연애·결혼운","대인관계운","가족운","건강운","학업·자기계발운"] as const;
/** Korean civil calendar: Nov–Dec next year, Jan–Oct current year. */
export function newYearTargetYear(anchor:{year:number;month:number}):number { return anchor.year+(anchor.month>=11?1:0); }
