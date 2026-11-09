"use server";

import { cookies, headers } from "next/headers";
import { audit, createSessionToken, passwordMatches, SESSION_COOKIE, SESSION_HOURS } from "@/lib/auth";
import { blockedFor, clientIp, hit, reset } from "@/lib/rate-limit";

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60_000;

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const ip = clientIp(await headers());
  const key = `login:${ip}`;

  const wait = blockedFor(key, MAX_FAILURES);
  if (wait) {
    audit("login_blocked", ip);
    return { error: `Too many failed attempts. Try again in ${Math.ceil(wait / 60)} minute(s).` };
  }

  const password = formData.get("password");
  if (typeof password !== "string" || password.length > 200 || !passwordMatches(password)) {
    hit(key, MAX_FAILURES, LOCK_MS);
    audit("login_failed", ip);
    return { error: "Wrong password." };
  }

  reset(key);
  audit("login_success", ip);
  (await cookies()).set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: SESSION_HOURS * 3600,
  });
  return {};
}

export async function logout() {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/admin" });
}
