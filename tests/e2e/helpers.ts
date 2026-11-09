import { expect, type Page } from "@playwright/test";

export const car = { year: "2018", make: "Toyota", model: "Camry", mileage: "80000", zip: "85004" };
export const seller = { name: "Test Seller", phone: "(602) 555-0123", email: "test@example.com" };

// Step 1: the car. Ends on step 2.
export async function fillCar(page: Page, opts: { condition: string; title: string; zip?: string; year?: string; make?: string; model?: string }) {
  await page.getByLabel("Year").selectOption(opts.year ?? car.year);
  await page.getByLabel("Make").fill(opts.make ?? car.make);
  await page.getByLabel("Model").fill(opts.model ?? car.model);
  await page.getByLabel("Mileage").fill(car.mileage);
  await page.getByLabel("Condition").selectOption(opts.condition);
  await page.getByLabel("Title status").selectOption(opts.title);
  await page.getByLabel("ZIP code").fill(opts.zip ?? car.zip);
  await page.getByRole("button", { name: "Next: your details" }).click();
  await expect(page.getByText("Step 2 of 2")).toBeVisible();
}

// Step 2: the seller. Ends on the result screen.
export async function fillContactAndSubmit(page: Page) {
  await page.getByLabel("Full name").fill(seller.name);
  await page.getByLabel("Phone", { exact: true }).fill(seller.phone);
  await page.getByLabel("Email", { exact: true }).fill(seller.email);
  await page.getByLabel(/I agree to be contacted/).check();
  await page.getByRole("button", { name: "Get my instant offer" }).click();
}
