// Run: npm test   (Node's built-in test runner, no extra packages)
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateOffer, findComparables, median } from "../src/lib/offer.ts";

const prices = [10000, 12000, 11000, 9000, 13000, 10500, 11500, 12500]; // median 11250

test("median of an even list averages the two middle values", () => {
  assert.equal(median(prices), 11250);
  assert.equal(median([3, 1, 2]), 2);
});

test("Excellent + Clean: median × 1.0 × 1 × 0.85, rounded down to $50", () => {
  // 11250 × 0.85 = 9562.5 → 9550
  assert.equal(calculateOffer(prices, "Excellent", "Clean").offer, 9550);
});

test("offers go down: Excellent/Clean > Fair/Clean > Poor/Salvage", () => {
  const a = calculateOffer(prices, "Excellent", "Clean").offer;
  const b = calculateOffer(prices, "Fair", "Clean").offer; // 11250 × 0.75 × 0.85 = 7171.9 → 7150
  const c = calculateOffer(prices, "Poor", "Salvage").offer; // 11250 × 0.55 × 0.6 × 0.85 = 3155.6 → 3150
  assert.deepEqual([a, b, c], [9550, 7150, 3150]);
});

test("Rebuilt title gets the same 0.6 factor as Salvage", () => {
  assert.equal(
    calculateOffer(prices, "Good", "Rebuilt").offer,
    calculateOffer(prices, "Good", "Salvage").offer,
  );
});

test("returns count and price range; refuses an empty list", () => {
  const r = calculateOffer(prices, "Good", "Clean");
  assert.equal(r.comparablesCount, 8);
  assert.equal(r.priceLow, 9000);
  assert.equal(r.priceHigh, 13000);
  assert.throws(() => calculateOffer([], "Good", "Clean"));
});

test("needs at least 3 sales for an instant offer", () => {
  assert.throws(() => calculateOffer([10000, 12000], "Good", "Clean"));
  assert.equal(calculateOffer([10000, 12000, 11000], "Excellent", "Clean").offer, 9350); // 11000 × 0.85
});

// Fake search: records each mileage range asked for and answers from a list.
function fakeSearch(answers) {
  const asked = [];
  return { asked, fetch: async (range) => (asked.push(range), answers[asked.length - 1]) };
}

test("mileage: stops at ±30,000 mi when that finds enough sales", async () => {
  const s = fakeSearch([[1, 2, 3]]);
  const r = await findComparables(80000, s.fetch);
  assert.deepEqual(s.asked, [{ mileageFrom: 50000, mileageTo: 110000 }]);
  assert.deepEqual(r, { prices: [1, 2, 3], mileageFrom: 50000, mileageTo: 110000 });
});

test("mileage: widens to ±60,000 mi when ±30,000 finds too few; never below 0 mi", async () => {
  const s = fakeSearch([[1, 2], [1, 2, 3, 4]]);
  const r = await findComparables(20000, s.fetch);
  assert.deepEqual(s.asked, [
    { mileageFrom: 0, mileageTo: 50000 },
    { mileageFrom: 0, mileageTo: 80000 },
  ]);
  assert.deepEqual(r, { prices: [1, 2, 3, 4], mileageFrom: 0, mileageTo: 80000 });
});

test("mileage: no 'any mileage' step; under 3 sales at ±60,000 mi stays too short", async () => {
  const s = fakeSearch([[], [1, 2]]);
  const r = await findComparables(400000, s.fetch);
  assert.equal(s.asked.length, 2);
  assert.deepEqual(r.prices, [1, 2]);
});
