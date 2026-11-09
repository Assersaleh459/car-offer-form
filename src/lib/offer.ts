// The offer rules. A client changes the numbers here, nothing else.
export const OFFER_RULES = {
  conditionFactor: {
    Excellent: 1.0,
    Good: 0.9,
    Fair: 0.75,
    Poor: 0.55,
  },
  brandedTitleFactor: 0.6, // applied when the title is Salvage or Rebuilt
  margin: 0.15, // our margin, taken off the adjusted price
  roundDownTo: 50, // final offer is rounded down to this many dollars
} as const;

export const CONDITIONS = ["Excellent", "Good", "Fair", "Poor"] as const;
export const TITLE_STATUSES = ["Clean", "Salvage", "Rebuilt"] as const;
export type Condition = (typeof CONDITIONS)[number];
export type TitleStatus = (typeof TITLE_STATUSES)[number];

export type OfferResult = {
  offer: number;
  comparablesCount: number;
  priceLow: number;
  priceHigh: number;
  median: number;
};

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Offer = median comparable price × condition factor × title factor × (1 − margin),
// rounded down to the nearest $50.
export function calculateOffer(
  salePrices: number[],
  condition: Condition,
  titleStatus: TitleStatus,
): OfferResult {
  if (salePrices.length === 0) throw new Error("No comparable sales");

  const mid = median(salePrices);
  const titleFactor = titleStatus === "Clean" ? 1 : OFFER_RULES.brandedTitleFactor;
  const raw =
    mid * OFFER_RULES.conditionFactor[condition] * titleFactor * (1 - OFFER_RULES.margin);
  const step = OFFER_RULES.roundDownTo;

  return {
    offer: Math.max(0, Math.floor(raw / step) * step),
    comparablesCount: salePrices.length,
    priceLow: Math.min(...salePrices),
    priceHigh: Math.max(...salePrices),
    median: Math.round(mid),
  };
}
