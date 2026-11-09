import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// The password comes from .env.local (never from this file). It is used, not printed.
function adminPassword(): string {
  const env = process.env.ADMIN_PASSWORD ?? readFileSync(".env.local", "utf8").match(/^ADMIN_PASSWORD=(.*)$/m)?.[1]?.trim();
  if (!env) throw new Error("ADMIN_PASSWORD not found in env or .env.local");
  return env;
}

async function login(page: Page, password: string) {
  await page.goto("/admin");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

test("/admin asks for a password; the leads are not in the page before login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
  expect(await page.content()).not.toContain("Test Seller");
});

test("wrong password shows an error and stays on the login page", async ({ page }) => {
  await login(page, "definitely-not-the-password");
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveText("Wrong password.");
  await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
});

test("right password shows the leads newest first, then log out works", async ({ page, request }) => {
  // Create a fresh lead so there is something recognisable at the top.
  const make = `Zeta${Date.now().toString().slice(-5)}`;
  const res = await request.post("/api/offer", {
    data: {
      year: 2016, make, model: "Tester", mileage: 50000, condition: "Good", titleStatus: "Clean",
      zip: "85001", name: "Newest Lead", phone: "6025550199", email: "newest@example.com", consent: true,
    },
  });
  expect(res.ok()).toBeTruthy();

  await login(page, adminPassword());
  await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible();
  const firstRow = page.locator("tbody tr").first();
  await expect(firstRow).toContainText(`2016 ${make} Tester`);
  await expect(firstRow).toContainText("Newest Lead");
  await expect(firstRow).toContainText(/\$[\d,]+/);

  // The session cookie must be httpOnly and scoped to /admin.
  const cookie = (await page.context().cookies()).find((c) => c.name === "admin_session");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.path).toBe("/admin");
  expect(cookie?.sameSite).toBe("Strict");

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
});

test("a forged session cookie does not log in", async ({ page, context }) => {
  await context.addCookies([{ name: "admin_session", value: "9999999999999.forged", url: "http://localhost:3010/admin" }]);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
});

// Runs last in this file: it locks out the test IP for 15 minutes.
// The lock must arrive after exactly 5 failures in a row. A successful login resets
// the count, so depending on which tests ran before, this test needs 4 or 5 wrong tries.
test("after 5 wrong passwords the 6th try is blocked, even with the right password", async ({ page }) => {
  let blocked = false;
  let wrongTries = 0;
  for (let i = 0; i < 6 && !blocked; i++) {
    await login(page, `wrong-${i}-wrong-wrong`);
    const alert = page.getByRole("alert").filter({ hasText: /\S/ });
    await expect(alert).toBeVisible();
    const text = (await alert.textContent()) ?? "";
    blocked = /Too many failed attempts/.test(text);
    if (!blocked) {
      expect(text).toBe("Wrong password.");
      wrongTries++;
    }
  }
  expect(blocked).toBe(true);
  expect(wrongTries).toBeGreaterThanOrEqual(4);
  expect(wrongTries).toBeLessThanOrEqual(5);

  await login(page, adminPassword());
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(/Too many failed attempts\. Try again in \d+ minute\(s\)\./);
  await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
});
