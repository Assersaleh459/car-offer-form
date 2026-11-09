import { test, expect, type Page } from "@playwright/test";

const car = { year: "2018", make: "Toyota", model: "Camry", mileage: "80000", zip: "85004" };
const seller = { name: "Test Seller", phone: "(602) 555-0123", email: "test@example.com" };

async function submitCar(page: Page, condition: string, title: string) {
  await page.goto("/");
  await page.getByLabel("Year").selectOption(car.year);
  await page.getByLabel("Make").fill(car.make);
  await page.getByLabel("Model").fill(car.model);
  await page.getByLabel("Mileage").fill(car.mileage);
  await page.getByLabel("Condition").selectOption(condition);
  await page.getByLabel("Title status").selectOption(title);
  await page.getByLabel("ZIP code").fill(car.zip);
  await page.getByLabel("Full name").fill(seller.name);
  await page.getByLabel("Phone", { exact: true }).fill(seller.phone);
  await page.getByLabel("Email", { exact: true }).fill(seller.email);
  await page.getByLabel(/I agree to be contacted/).check();
  await page.getByRole("button", { name: "Get my instant offer" }).click();
  const amount = page.getByText(/^\$[\d,]+$/);
  await expect(amount).toBeVisible();
  return Number((await amount.textContent())!.replace(/[^\d]/g, ""));
}

test("the three plan cars give offers that go down in order", async ({ page }) => {
  const excellent = await submitCar(page, "Excellent", "Clean");
  await expect(page.getByText("How we calculated this")).toBeVisible();
  await expect(page.getByText(/We'll call you within 1 hour at \(602\) 555-0123/)).toBeVisible();

  const fair = await submitCar(page, "Fair", "Clean");
  const poor = await submitCar(page, "Poor", "Salvage");

  expect(excellent).toBeGreaterThan(fair);
  expect(fair).toBeGreaterThan(poor);
  expect(excellent % 50).toBe(0);
});

test("'Get an offer for another car' resets the form", async ({ page }) => {
  await submitCar(page, "Good", "Clean");
  await page.getByRole("button", { name: "Get an offer for another car" }).click();
  await expect(page.getByLabel("Make")).toHaveValue("");
  await expect(page.getByLabel(/I agree to be contacted/)).not.toBeChecked();
});

test("a ZIP outside Arizona shows the 'we'll still call you' note", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Year").selectOption("2015");
  await page.getByLabel("Make").fill("Honda");
  await page.getByLabel("Model").fill("Civic");
  await page.getByLabel("Mileage").fill("120000");
  await page.getByLabel("Condition").selectOption("Good");
  await page.getByLabel("Title status").selectOption("Clean");
  await page.getByLabel("ZIP code").fill("90210");
  await page.getByLabel("Full name").fill(seller.name);
  await page.getByLabel("Phone", { exact: true }).fill(seller.phone);
  await page.getByLabel("Email", { exact: true }).fill(seller.email);
  await page.getByLabel(/I agree to be contacted/).check();
  await page.getByRole("button", { name: "Get my instant offer" }).click();
  await expect(page.getByText(/outside our usual Arizona area/)).toBeVisible();
});
