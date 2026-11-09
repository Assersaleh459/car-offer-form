import "server-only";
import { findComparables, type MileageRange } from "./offer";

// Recent auction sales of cars like the seller's: same year, make and model, clean title,
// similar mileage, light or no damage. Copart and IAAI sell many damaged cars, so damaged
// and branded-title sales are left out; the offer's title factor handles Salvage/Rebuilt.
export async function getComparableSales(year: number, make: string, model: string, mileage: number) {
  return findComparables(mileage, async (range) => {
    const lots = await fetchSoldLots(year, make, model, range);
    return lots
      .filter((lot) => LIGHT_DAMAGE.has(lot.damage.toLowerCase()))
      .map((lot) => lot.final_bid)
      .filter((bid): bid is number => typeof bid === "number" && bid > 0);
  });
}

// One sold lot, as in the `lots` list of AuctionsAPI `GET /cars`.
// shortcut: the damage and odometer field names and values are guesses from the docs;
// check them against a real response when the API key arrives.
type SoldLot = { final_bid: number | null; odometer: number; document_title: string; damage: string };

const LIGHT_DAMAGE = new Set(["normal wear", "minor dent/scratches", "none"]);

// Today this returns MOCK data. The real call (when the key arrives) is:
// GET https://auctionsapi.com/api/cars?manufacturer_id=..&model_id=..&year=..&status=6
//   &document_title=clean&sale_date_in_days=90&odometer_from_mi=..&odometer_to_mi=..
// with an `x-api-key` header from process.env.AUCTIONS_API_KEY.
async function fetchSoldLots(year: number, make: string, model: string, range: MileageRange): Promise<SoldLot[]> {
  // The mock applies the same filters the API would apply on its side.
  return mockSoldLots(year, make, model).filter(
    (lot) =>
      lot.document_title === "clean" && lot.odometer >= range.mileageFrom && lot.odometer <= range.mileageTo,
  );
}

// Same car in = same lots out, so test offers are repeatable.
function mockSoldLots(year: number, make: string, model: string): SoldLot[] {
  let seed = hash(`${year}|${make.trim().toLowerCase()}|${model.trim().toLowerCase()}`);
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0; // simple repeatable generator
    return seed / 2 ** 32;
  };
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];

  // Rough used-car curve: about $34k new, losing about 12% a year, never under $1,500,
  // at about 12,000 miles a year.
  const age = Math.max(0, new Date().getFullYear() - year);
  const base = Math.max(1500, 34000 * 0.88 ** age) * (0.85 + random() * 0.3);
  const typicalMiles = Math.max(0.5, age) * 12_000;

  return Array.from({ length: 30 }, () => {
    const odometer = Math.round((typicalMiles * (0.4 + random() * 1.2)) / 100) * 100;
    // 3% less per 10,000 miles above typical (more for lower miles), within ±30%.
    const mileageFactor = Math.min(1.3, Math.max(0.7, 1 - ((odometer - typicalMiles) / 10_000) * 0.03));
    const document_title = random() < 0.25 ? "salvage" : "clean";
    const damage = random() < 0.3 ? pick(["front end", "rear end", "side", "flood"]) : pick([...LIGHT_DAMAGE]);
    const hurt = (document_title === "salvage" ? 0.5 : 1) * (LIGHT_DAMAGE.has(damage) ? 1 : 0.6);
    const price = Math.round((base * mileageFactor * hurt * (0.85 + random() * 0.3)) / 10) * 10;
    return { final_bid: random() < 0.1 ? null : price, odometer, document_title, damage };
  });
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
