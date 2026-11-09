import { createHash, createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "admin_session";
export const SESSION_HOURS = 8;
const MIN_PASSWORD_LENGTH = 12;

function adminPassword(): string | null {
  const p = process.env.ADMIN_PASSWORD ?? "";
  if (p.length < MIN_PASSWORD_LENGTH) {
    console.error(`ADMIN_PASSWORD is missing or shorter than ${MIN_PASSWORD_LENGTH} characters; admin login is disabled.`);
    return null;
  }
  return p;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest();

// Constant-time compare (hashing first makes both sides the same length).
export function passwordMatches(input: string): boolean {
  const real = adminPassword();
  if (!real) return false;
  return timingSafeEqual(sha256(input), sha256(real));
}

// Session token = "<expiry ms>.<HMAC of expiry>". The HMAC key comes from the password,
// so changing ADMIN_PASSWORD logs everyone out.
function sign(value: string, password: string): string {
  return createHmac("sha256", sha256(`session:${password}`)).update(value).digest("base64url");
}

export function createSessionToken(): string {
  const real = adminPassword();
  if (!real) throw new Error("Admin login is disabled");
  const expires = String(Date.now() + SESSION_HOURS * 3600_000);
  return `${expires}.${sign(expires, real)}`;
}

export function isValidSession(token: string | undefined): boolean {
  const real = adminPassword();
  if (!real || !token) return false;
  const [expires, sig] = token.split(".");
  if (!expires || !sig || !/^\d+$/.test(expires) || Number(expires) < Date.now()) return false;
  const expected = Buffer.from(sign(expires, real));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// Audit log: goes to the server log (Vercel > Logs). Never logs the password.
export function audit(event: string, ip: string) {
  console.info(JSON.stringify({ audit: event, ip, at: new Date().toISOString() }));
}
