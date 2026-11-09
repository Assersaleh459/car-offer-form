import { test, expect, type Page } from "@playwright/test";
import { car, fillCar, fillContactAndSubmit, seller } from "./helpers";

async function submitCar(page: Page, condition: string, title: string) {
  await page.goto("/");
  await fillCar(page, { condition, title });
  await fillContactAndSubmit(page);
  const amount = page.getByText(/^\$[\d,]+$/);
  await expect(amount).toBeVisible();
  return Number((await amount.textContent())!.replace(/[^\d]/g, ""));
}

test("the three plan cars give offers that go down in order", async ({ page }) => {
  const excellent = await submitCar(page, "Excellent", "Clean");
  await expect(page.getByText("How we calculated this")).toBeVisible();
  await expect(page.getByText(/Based on \d+ recent sales/)).toBeVisible();
  await expect(page.getByText(/We'll call you within 1 hour at \(602\) 555-0123/)).toBeVisible();

  const fair = await submitCar(page, "Fair", "Clean");
  const poor = await submitCar(page, "Poor", "Salvage");

  expect(excellent).toBeGreaterThan(fair);
  expect(fair).toBeGreaterThan(poor);
  expect(excellent % 50).toBe(0);
});

test("the form has two steps and the result heading gets focus", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Step 1 of 2")).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveCount(0); // contact fields are on step 2

  await fillCar(page, { condition: "Good", title: "Clean" });
  await expect(page.getByRole("heading", { name: "Your contact details" })).toBeFocused();
  await expect(page.getByLabel("Make")).toHaveCount(0);
  await expect(page.getByText("2018 Toyota Camry · 80,000 mi")).toBeVisible();

  await fillContactAndSubmit(page);
  await expect(page.getByRole("heading", { name: "Your instant cash offer" })).toBeFocused();
});

test("Back and Edit return to step 1 with the car details kept", async ({ page }) => {
  await page.goto("/");
  await fillCar(page, { condition: "Good", title: "Clean" });
  await page.getByLabel("Full name").fill(seller.name);

  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByText("Step 1 of 2")).toBeVisible();
  await expect(page.getByLabel("Make")).toHaveValue(car.make);
  await expect(page.getByLabel("Mileage")).toHaveValue("80,000");

  await page.getByRole("button", { name: "Next: your details" }).click();
  await expect(page.getByLabel("Full name")).toHaveValue(seller.name); // step 2 data is kept too

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByLabel("Model")).toHaveValue(car.model);
});

test("'Get an offer for another car' resets the form to step 1", async ({ page }) => {
  await submitCar(page, "Good", "Clean");
  await page.getByRole("button", { name: "Get an offer for another car" }).click();
  await expect(page.getByText("Step 1 of 2")).toBeVisible();
  await expect(page.getByLabel("Make")).toHaveValue("");
  await expect(page.getByRole("heading", { name: "Your car", exact: true })).toBeFocused();
});

test("a ZIP outside Arizona shows the 'we'll still call you' note", async ({ page }) => {
  await page.goto("/");
  await fillCar(page, { year: "2015", make: "Honda", model: "Civic", condition: "Good", title: "Clean", zip: "90210" });
  await fillContactAndSubmit(page);
  await expect(page.getByText(/outside our usual Arizona area/)).toBeVisible();
});
