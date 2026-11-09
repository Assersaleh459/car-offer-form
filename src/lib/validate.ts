// Field checks shared by the form (for quick feedback) and the API route (the real gate).
import { CONDITIONS, TITLE_STATUSES, type Condition, type TitleStatus } from "./offer";

export const MIN_YEAR = 1995;
export const MAX_YEAR = 2026;

export type OfferInput = {
  year: number;
  make: string;
  model: string;
  mileage: number;
  condition: Condition;
  titleStatus: TitleStatus;
  zip: string;
  name: string;
  phone: string; // digits only, 10 digits
  email: string;
};

export type FieldErrors = Partial<Record<keyof OfferInput | "consent", string>>;

// Arizona ZIP codes start with 85 or 86. Others are accepted; we just tell the seller.
export const isArizonaZip = (zip: string) => /^8[56]/.test(zip);

type Result = { ok: true; data: OfferInput } | { ok: false; errors: FieldErrors };

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const TEXT = /^[\p{L}\p{N} .'&-]+$/u; // letters, numbers, space and . ' & -

export function validateOfferInput(body: unknown): Result {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const errors: FieldErrors = {};

  const year = Number(b.year);
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR)
    errors.year = `Choose a year from ${MIN_YEAR} to ${MAX_YEAR}.`;

  const make = str(b.make);
  if (make.length < 2 || make.length > 40 || !TEXT.test(make)) errors.make = "Enter the make, e.g. Toyota.";

  const model = str(b.model);
  if (model.length < 1 || model.length > 60 || !TEXT.test(model)) errors.model = "Enter the model, e.g. Camry.";

  const mileageText = str(b.mileage).replace(/,/g, "") || String(b.mileage ?? "");
  const mileage = Number(mileageText);
  if (!/^\d{1,7}$/.test(mileageText) || mileage > 999999) errors.mileage = "Enter miles as a number, e.g. 85000.";

  const condition = str(b.condition) as Condition;
  if (!CONDITIONS.includes(condition)) errors.condition = "Choose a condition.";

  const titleStatus = str(b.titleStatus) as TitleStatus;
  if (!TITLE_STATUSES.includes(titleStatus)) errors.titleStatus = "Choose a title status.";

  const zip = str(b.zip);
  if (!/^\d{5}$/.test(zip)) errors.zip = "Enter a 5-digit ZIP code.";

  const name = str(b.name);
  if (name.length < 2 || name.length > 80 || !TEXT.test(name)) errors.name = "Enter your name.";

  let phone = str(b.phone).replace(/\D/g, "");
  if (phone.length === 11 && phone.startsWith("1")) phone = phone.slice(1);
  if (!/^[2-9]\d{9}$/.test(phone)) errors.phone = "Enter a 10-digit US phone number.";

  const email = str(b.email).toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "Enter a valid email.";

  // Leads are only saved with consent, so the consent itself is not stored separately.
  if (b.consent !== true && b.consent !== "true") errors.consent = "Please agree so we can contact you.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { year, make, model, mileage, condition, titleStatus, zip, name, phone, email } };
}
