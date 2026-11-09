import "server-only";

// Recent auction sale prices for cars like the seller's.
// Today this returns MOCK data. When the AuctionsAPI key arrives, the real call goes
// here: same signature, with an `x-api-key` header read from process.env.AUCTIONS_API_KEY.
export async function getComparableSales(
  year: number,
  make: string,
  model: string,
): Promise<number[]> {
  return mockComparableSales(year, make, model);
}

// Same car in = same prices out, so test offers are repeatable.
function mockComparableSales(year: number, make: string, model: string): number[] {
  let seed = hash(`${year}|${make.trim().toLowerCase()}|${model.trim().toLowerCase()}`);
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0; // simple repeatable generator
    return seed / 2 ** 32;
  };

  // Rough used-car curve: about $34k new, losing about 12% a year, never under $1,500.
  const age = Math.max(0, new Date().getFullYear() - year);
  const base = Math.max(1500, 34000 * 0.88 ** age) * (0.85 + random() * 0.3);

  const count = 8 + Math.floor(random() * 5); // 8 to 12 sales
  return Array.from({ length: count }, () => Math.round((base * (0.8 + random() * 0.4)) / 10) * 10);
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
