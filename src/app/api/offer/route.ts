import { NextResponse } from "next/server";
import { getComparableSales } from "@/lib/auctions";
import { calculateOffer } from "@/lib/offer";
import { saveLead, toLead } from "@/lib/leads";
import { validateOfferInput } from "@/lib/validate";
import { clientIp, hit } from "@/lib/rate-limit";

const OFFERS_PER_WINDOW = 10;
const WINDOW_MS = 10 * 60_000;

export async function POST(request: Request) {
  const retryAfter = hit(`offer:${clientIp(request.headers)}`, OFFERS_PER_WINDOW, WINDOW_MS);
  if (retryAfter) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  let body: unknown;
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 10_000) throw new Error("too large");
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: a hidden field people never fill in. Bots often do, so reject it.
  if (body && typeof body === "object" && (body as Record<string, unknown>).company) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const check = validateOfferInput(body);
  if (!check.ok) return NextResponse.json({ errors: check.errors }, { status: 400 });
  const input = check.data;

  try {
    const prices = await getComparableSales(input.year, input.make, input.model);
    if (prices.length === 0) {
      // Rare car, no comparable sales: keep the lead, a person prices it by phone.
      const noData = { offer: 0, comparablesCount: 0, priceLow: 0, priceHigh: 0, median: 0 };
      await saveLead(toLead(input, noData));
      return NextResponse.json({ ...noData, needsReview: true });
    }
    const result = calculateOffer(prices, input.condition, input.titleStatus);
    await saveLead(toLead(input, result));
    return NextResponse.json(result);
  } catch (err) {
    console.error("offer failed", err); // full detail stays in the server log
    return NextResponse.json({ error: "We couldn't calculate an offer right now. Please try again." }, { status: 500 });
  }
}
