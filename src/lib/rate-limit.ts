// shortcut: counts live in this server's memory. On Vercel each instance has its own
// counts and they reset on cold start, so this slows down abuse but is not a hard limit.
// Upgrade to Upstash Ratelimit (or Vercel Firewall rules) before real traffic.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Returns 0 if allowed, otherwise seconds until the key may try again.
export function hit(key: string, limit: number, windowMs: number): number {
  const now = Date.now();
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);

  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return 0;
  }
  b.count++;
  return b.count > limit ? Math.ceil((b.resetAt - now) / 1000) : 0;
}

export function blockedFor(key: string, limit: number): number {
  const b = buckets.get(key);
  const now = Date.now();
  return b && b.resetAt > now && b.count >= limit ? Math.ceil((b.resetAt - now) / 1000) : 0;
}

export function reset(key: string) {
  buckets.delete(key);
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || "unknown";
}
