import { defineConfig, devices } from "@playwright/test";

// The app rate-limits per client IP (10 offers / 10 min, 5 login failures / 15 min).
// Each run and each project pretends to be a fresh private IP, so the tests never
// throttle each other or a rerun. Locally the app trusts x-forwarded-for; on Vercel
// the platform sets that header, so this trick does not work against the live site.
const run = Date.now();
const testIp = (n: number) => `10.${(run >> 8) & 255}.${run & 255}.${n}`;

// Run: npx playwright test --reporter=line
// Expects the dev server on port 3010 (npm run dev -- -p 3010); starts it if not running.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // tests share one server with in-memory rate limits
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["line"]],
  use: {
    baseURL: "http://localhost:3010",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], extraHTTPHeaders: { "x-forwarded-for": testIp(1) } } },
    { name: "mobile", use: { ...devices["Pixel 7"], extraHTTPHeaders: { "x-forwarded-for": testIp(2) } }, testMatch: /happy-path/ },
  ],
  webServer: {
    command: "npx next dev -p 3010",
    url: "http://localhost:3010",
    reuseExistingServer: true,
    timeout: 300_000, // slow disk: first start takes minutes
  },
});
