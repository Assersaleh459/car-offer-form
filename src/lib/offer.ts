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
  minComparables: 3, // fewer similar sales than this: no instant offer, we call the seller
  // Similar sales are searched within this many miles of the seller's car, widest last.
  // No "any mileage" step: it priced very high-mileage cars like average ones.
  mileageBands: [30_000, 60_000],
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

export type MileageRange = { mileageFrom: number; mileageTo: number };

// Find similar sales: try ±30,000 mi around the seller's mileage first, then wider,
// and stop at the first search that finds enough sales.
export async function findComparables(
  mileage: number,
  fetchPrices: (range: MileageRange) => Promise<number[]>,
): Promise<{ prices: number[] } & MileageRange> {
  let found: { prices: number[] } & MileageRange = { prices: [], mileageFrom: 0, mileageTo: 0 };
  for (const band of OFFER_RULES.mileageBands) {
    const range = { mileageFrom: Math.max(0, mileage - band), mileageTo: mileage + band };
    found = { prices: await fetchPrices(range), ...range };
    if (found.prices.length >= OFFER_RULES.minComparables) break;
  }
  return found;
}

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
  if (salePrices.length < OFFER_RULES.minComparables) throw new Error("Too few comparable sales");

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
