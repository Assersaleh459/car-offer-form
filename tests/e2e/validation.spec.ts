import { test, expect } from "@playwright/test";
import { fillCar } from "./helpers";

test("step 1: empty form shows an error under every car field, focuses the first, and stays on step 1", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Next: your details" }).click();

  for (const msg of [
    "Choose a year from 1995 to 2026.",
    "Enter the make, e.g. Toyota.",
    "Enter the model, e.g. Camry.",
    "Enter miles as a number, e.g. 85000.",
    "Choose a condition.",
    "Choose a title status.",
    "Enter a 5-digit ZIP code.",
  ]) {
    await expect(page.getByText(msg, { exact: true })).toBeVisible();
  }
  await expect(page.getByLabel("Year")).toBeFocused();
  await expect(page.getByText("Step 1 of 2")).toBeVisible();
  await expect(page.getByText("Your instant cash offer")).toHaveCount(0);
});

test("step 2: empty contact details show errors, focus the name, and send nothing", async ({ page }) => {
  await page.goto("/");
  await fillCar(page, { condition: "Good", title: "Clean" });
  await page.getByRole("button", { name: "Get my instant offer" }).click();

  for (const msg of [
    "Enter your name.",
    "Enter a 10-digit US phone number.",
    "Enter a valid email.",
    "Please agree so we can contact you.",
  ]) {
    await expect(page.getByText(msg, { exact: true })).toBeVisible();
  }
  await expect(page.getByLabel("Full name")).toBeFocused();
  await expect(page.getByText("Your instant cash offer")).toHaveCount(0);
});

test("fixing a field clears its error as you type", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Next: your details" }).click();
  await expect(page.getByText("Enter the make, e.g. Toyota.")).toBeVisible();
  await page.getByLabel("Make").fill("Ford");
  await expect(page.getByText("Enter the make, e.g. Toyota.")).toHaveCount(0);
});

test("mileage, ZIP and phone are formatted as you type", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Mileage").pressSequentially("85000");
  await expect(page.getByLabel("Mileage")).toHaveValue("85,000");
  await page.getByLabel("ZIP code").pressSequentially("85a004x9");
  await expect(page.getByLabel("ZIP code")).toHaveValue("85004");

  await fillCar(page, { condition: "Good", title: "Clean" });
  await page.getByLabel("Phone", { exact: true }).pressSequentially("16025550123");
  await expect(page.getByLabel("Phone", { exact: true })).toHaveValue("(602) 555-0123");
});

test.describe("dark mode follows the device", () => {
  test.use({ colorScheme: "dark" });
  test("page and card use the dark tokens", async ({ page }) => {
    await page.goto("/");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe("rgb(11, 18, 32)");
    const card = await page.locator("form").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(card).toBe("rgb(18, 27, 46)");
  });
});

test("the demo notice is on the page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("note")).toContainText("Demo site: please don't enter real personal details.");
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
