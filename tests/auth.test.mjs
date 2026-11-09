import { test } from "node:test";
import assert from "node:assert/strict";

process.env.ADMIN_PASSWORD = "correct-horse-battery";
const auth = await import("../src/lib/auth.ts");

test("password check: right one passes, wrong ones fail", () => {
  assert.equal(auth.passwordMatches("correct-horse-battery"), true);
  assert.equal(auth.passwordMatches("correct-horse-batter"), false);
  assert.equal(auth.passwordMatches(""), false);
});

test("session token: valid, then rejected if tampered", () => {
  const token = auth.createSessionToken();
  assert.equal(auth.isValidSession(token), true);
  const [exp, sig] = token.split(".");
  assert.equal(auth.isValidSession(`${Number(exp) + 1}.${sig}`), false); // changed expiry
  assert.equal(auth.isValidSession(`${exp}.${sig.slice(0, -1)}${sig.endsWith("A") ? "B" : "A"}`), false); // changed signature
  assert.equal(auth.isValidSession(undefined), false);
});

test("expired token is rejected", () => {
  const past = String(Date.now() - 1000);
  const token = auth.createSessionToken();
  assert.equal(auth.isValidSession(`${past}.${token.split(".")[1]}`), false);
});

test("changing the password logs everyone out; short passwords disable login", () => {
  const token = auth.createSessionToken();
  process.env.ADMIN_PASSWORD = "a-different-password";
  assert.equal(auth.isValidSession(token), false);
  process.env.ADMIN_PASSWORD = "short";
  assert.equal(auth.passwordMatches("short"), false);
});
