import { test, expect } from "@playwright/test";

test("empty form shows an error under every field and focuses the first one", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Get my instant offer" }).click();

  for (const msg of [
    "Choose a year from 1995 to 2026.",
    "Enter the make, e.g. Toyota.",
    "Enter the model, e.g. Camry.",
    "Enter miles as a number, e.g. 85000.",
    "Choose a condition.",
    "Choose a title status.",
    "Enter a 5-digit ZIP code.",
    "Enter your name.",
    "Enter a 10-digit US phone number.",
    "Enter a valid email.",
    "Please agree so we can contact you.",
  ]) {
    await expect(page.getByText(msg, { exact: true })).toBeVisible();
  }
  await expect(page.getByLabel("Year")).toBeFocused();
  // Nothing was sent: no offer shown.
  await expect(page.getByText("Your instant cash offer")).toHaveCount(0);
});

test("fixing a field clears its error as you type", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Get my instant offer" }).click();
  await expect(page.getByText("Enter the make, e.g. Toyota.")).toBeVisible();
  await page.getByLabel("Make").fill("Ford");
  await expect(page.getByText("Enter the make, e.g. Toyota.")).toHaveCount(0);
});

test("server rejects bad data even when the browser check is bypassed", async ({ request }) => {
  const res = await request.post("/api/offer", {
    data: { year: 1990, make: "<script>alert(1)</script>", mileage: "lots", zip: "123", email: "x", consent: true },
  });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.errors.year).toBeTruthy();
  expect(body.errors.make).toBeTruthy();
  expect(body.errors.phone).toBeTruthy();
});

test("server requires consent", async ({ request }) => {
  const res = await request.post("/api/offer", {
    data: {
      year: 2018, make: "Toyota", model: "Camry", mileage: 80000, condition: "Good", titleStatus: "Clean",
      zip: "85004", name: "Test Seller", phone: "6025550123", email: "test@example.com",
    },
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).errors.consent).toBeTruthy();
});

test("a filled honeypot field is rejected", async ({ request }) => {
  const res = await request.post("/api/offer", {
    data: {
      year: 2018, make: "Toyota", model: "Camry", mileage: 80000, condition: "Good", titleStatus: "Clean",
      zip: "85004", name: "Test Seller", phone: "6025550123", email: "test@example.com", consent: true,
      company: "spam inc",
    },
  });
  expect(res.status()).toBe(400);
});
