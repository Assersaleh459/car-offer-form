// Run: npm test   (Node's built-in test runner, no extra packages)
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateOffer, median } from "../src/lib/offer.ts";

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
