"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CONDITIONS, TITLE_STATUSES, type MileageRange, type OfferResult } from "@/lib/offer";
import { isArizonaZip, MAX_YEAR, MIN_YEAR, validateOfferInput, type FieldErrors, type OfferInput } from "@/lib/validate";

type Field = keyof OfferInput;
type ErrorKey = Field | "consent";
type Values = Record<Field, string> & { company: string };

const EMPTY: Values = {
  year: "", make: "", model: "", mileage: "", condition: "", titleStatus: "",
  zip: "", name: "", phone: "", email: "", company: "",
};

// Step 1 = the car, step 2 = who to call. Each step is checked before moving on.
const STEP1: ErrorKey[] = ["year", "make", "model", "mileage", "condition", "titleStatus", "zip"];
const STEP2: ErrorKey[] = ["name", "phone", "email", "consent"];

const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MAX_YEAR - i);
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// Typing helpers: keep only digits and show them the way people read them.
const formatMileage = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 6);
  return d ? Number(d).toLocaleString("en-US") : "";
};
const formatPhoneInput = (raw: string) => {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("1")) d = d.slice(1); // US numbers never start with 1; also handles "+1 602..." pastes
  d = d.slice(0, 10);
  if (d.length <= 3) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};
const SANITIZE: Partial<Record<keyof Values, (v: string) => string>> = {
  mileage: formatMileage,
  phone: formatPhoneInput,
  zip: (v) => v.replace(/\D/g, "").slice(0, 5),
};

const inputClass =
  "w-full rounded-xl border border-field bg-surface px-3.5 py-3 text-base text-ink transition-[border-color] duration-150 placeholder:text-muted/80 focus:border-brand aria-[invalid=true]:border-bad";
const primaryBtn =
  "inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand px-5 py-3.5 text-base font-semibold text-brand-ink transition-[background-color,transform] duration-150 ease-out hover:bg-brand-hover active:scale-[0.97] disabled:cursor-wait disabled:opacity-70";
const secondaryBtn =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-field bg-surface px-5 py-3.5 text-base font-semibold text-ink transition-[background-color,transform] duration-150 ease-out hover:bg-soft active:scale-[0.97]";
const cardClass = "rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-8";

export function OfferForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [result, setResult] = useState<(OfferResult & Partial<MileageRange> & { needsReview?: boolean }) | null>(null);

  // After a step change or an error, move keyboard and screen-reader focus to the right place.
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    if (!pendingFocus.current) return;
    document.getElementById(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  });

  const set = (field: keyof Values, value: string) => {
    setValues((v) => ({ ...v, [field]: SANITIZE[field]?.(value) ?? value }));
    if (errors[field as Field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const firstError = (errs: FieldErrors, keys: ErrorKey[]) => keys.find((k) => errs[k]);
  const onlyKeys = (errs: FieldErrors, keys: ErrorKey[]): FieldErrors =>
    Object.fromEntries(keys.filter((k) => errs[k]).map((k) => [k, errs[k]]));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    const check = validateOfferInput({ ...values, consent });
    const errs: FieldErrors = check.ok ? {} : check.errors;

    if (step === 1) {
      const bad = firstError(errs, STEP1);
      if (bad) {
        setErrors(onlyKeys(errs, STEP1));
        pendingFocus.current = bad;
        return;
      }
      setErrors({});
      setStep(2);
      pendingFocus.current = "step-title";
      return;
    }

    // Step 2: the whole form is checked once more. A problem in step 1 sends the seller back there.
    const bad1 = firstError(errs, STEP1);
    const bad2 = firstError(errs, STEP2);
    if (bad1 || bad2) {
      setErrors(errs);
      if (bad1) setStep(1);
      pendingFocus.current = (bad1 ?? bad2)!;
      return;
    }
    if (!check.ok) return;

    setSending(true);
    try {
      const res = await fetch("/api/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...check.data, consent, company: values.company }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult(data as OfferResult);
        pendingFocus.current = "result-title";
      } else if (data.errors) {
        const serverErrs = data.errors as FieldErrors;
        setErrors(serverErrs);
        const s1 = firstError(serverErrs, STEP1);
        if (s1) setStep(1);
        const target = s1 ?? firstError(serverErrs, STEP2);
        if (target) pendingFocus.current = target;
      } else {
        setFormError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setFormError("Network error. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  const goToStep1 = () => {
    setErrors({});
    setFormError("");
    setStep(1);
    pendingFocus.current = "step-title";
  };
  const startOver = () => {
    setResult(null);
    setValues(EMPTY);
    setConsent(false);
    setErrors({});
    setStep(1);
    pendingFocus.current = "step-title";
  };

  const areaNote = !isArizonaZip(values.zip) && (
    <p className="mt-4 text-sm text-muted">Your ZIP is outside our usual Arizona area. We&apos;ll still call you.</p>
  );
  const anotherCar = (
    <button type="button" onClick={startOver} className={`${secondaryBtn} mt-6 w-full sm:w-auto`}>
      Get an offer for another car
    </button>
  );

  if (result?.needsReview) {
    return (
      <div className={`animate-[rise_300ms_cubic-bezier(0.23,1,0.32,1)] ${cardClass} sm:p-8`}>
        <h2 id="result-title" tabIndex={-1} className="text-sm font-bold uppercase tracking-wide text-brand">
          Thanks, {values.name.split(" ")[0]}
        </h2>
        <p className="mt-2 text-2xl font-bold tracking-tight text-ink text-balance">
          Your {values.year} {values.make} {values.model} needs a quick look from our team.
        </p>
        <p className="mt-3 text-muted">
          We don&apos;t have enough recent sales of this car to price it automatically.
          We&apos;ll call you within 1 hour at {formatPhone(values.phone)} with your offer.
        </p>
        {areaNote}
        {anotherCar}
      </div>
    );
  }

  if (result) {
    return (
      <div className={`animate-[rise_300ms_cubic-bezier(0.23,1,0.32,1)] ${cardClass} sm:p-8`}>
        <h2 id="result-title" tabIndex={-1} className="text-sm font-bold uppercase tracking-wide text-brand">
          Your instant cash offer
        </h2>
        <p className="mt-2 text-5xl font-extrabold tracking-tight text-ink tabular-nums">{usd(result.offer)}</p>
        <p className="mt-1 text-muted">
          for your {values.year} {values.make} {values.model}
        </p>
        <p className="mt-3 inline-block rounded-full bg-good-soft px-3 py-1 text-sm font-semibold text-good">
          Based on {result.comparablesCount} recent sales
        </p>

        <div className="mt-6 rounded-xl bg-soft p-4 text-sm text-ink">
          <p className="font-semibold">How we calculated this</p>
          <p className="mt-1">
            We looked at {result.comparablesCount} recent auction sales of {values.year} {values.make} {values.model}{" "}
            cars with a clean title, little or no damage and {result.mileageFrom?.toLocaleString("en-US")} to{" "}
            {result.mileageTo?.toLocaleString("en-US")} miles ({usd(result.priceLow)} to {usd(result.priceHigh)}). We took the middle price and adjusted it for
            condition and title status.
          </p>
        </div>

        <p className="mt-6 flex items-center gap-2 font-medium text-ink">
          <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-full bg-good" />
          <span>We&apos;ll call you within 1 hour at {formatPhone(values.phone)}.</span>
        </p>
        {areaNote}
        {anotherCar}
      </div>
    );
  }

  const ctl = (id: ErrorKey) => ({
    id,
    "aria-invalid": !!errors[id],
    "aria-describedby": errors[id] ? `${id}-error` : undefined,
  });

  return (
    <form onSubmit={onSubmit} noValidate className={cardClass} aria-busy={sending}>
      <div className="mb-6">
        <div className="flex items-baseline justify-between gap-3 text-sm font-semibold text-muted">
          <span>Step {step} of 2</span>
          <span>{step === 1 ? "About 30 seconds" : "Almost done"}</span>
        </div>
        <div
          role="progressbar"
          aria-label="Form progress"
          aria-valuemin={1}
          aria-valuemax={2}
          aria-valuenow={step}
          className="mt-2 h-2 overflow-hidden rounded-full bg-soft"
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>
      </div>

      {step === 1 && (
        <>
          <h2 id="step-title" tabIndex={-1} className="text-xl font-semibold text-ink">Your car</h2>
          <p className="mt-1 text-sm text-muted">All fields are required.</p>
          <div className="mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <Labeled id="year" label="Year" error={errors.year}>
              <select {...ctl("year")} className={inputClass} value={values.year} onChange={(e) => set("year", e.target.value)}>
                <option value="">Select year</option>
                {YEARS.map((y) => <option key={y}>{y}</option>)}
              </select>
            </Labeled>
            <Labeled id="make" label="Make" error={errors.make}>
              <input {...ctl("make")} className={inputClass} placeholder="Toyota" autoComplete="off" maxLength={40} value={values.make} onChange={(e) => set("make", e.target.value)} />
            </Labeled>
            <Labeled id="model" label="Model" error={errors.model}>
              <input {...ctl("model")} className={inputClass} placeholder="Camry" autoComplete="off" maxLength={60} value={values.model} onChange={(e) => set("model", e.target.value)} />
            </Labeled>
            <Labeled id="mileage" label="Mileage" error={errors.mileage}>
              <div className="relative">
                <input {...ctl("mileage")} className={`${inputClass} pr-12`} placeholder="85,000" inputMode="numeric" autoComplete="off" value={values.mileage} onChange={(e) => set("mileage", e.target.value)} />
                <span aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">mi</span>
              </div>
            </Labeled>
            <Labeled id="condition" label="Condition" error={errors.condition}>
              <select {...ctl("condition")} className={inputClass} value={values.condition} onChange={(e) => set("condition", e.target.value)}>
                <option value="">Select condition</option>
                {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Labeled>
            <Labeled id="titleStatus" label="Title status" error={errors.titleStatus}>
              <select {...ctl("titleStatus")} className={inputClass} value={values.titleStatus} onChange={(e) => set("titleStatus", e.target.value)}>
                <option value="">Select title</option>
                {TITLE_STATUSES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Labeled>
            <Labeled id="zip" label="ZIP code" error={errors.zip}>
              <input {...ctl("zip")} className={inputClass} placeholder="85004" inputMode="numeric" autoComplete="postal-code" value={values.zip} onChange={(e) => set("zip", e.target.value)} />
            </Labeled>
          </div>
          <button key="next" type="submit" className={`${primaryBtn} mt-8`}>
            Next: your details
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h2 id="step-title" tabIndex={-1} className="text-xl font-semibold text-ink">Your contact details</h2>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-soft px-4 py-3 text-sm">
            <span className="font-semibold text-ink">
              {values.year} {values.make} {values.model} · {values.mileage} mi
            </span>
            <button type="button" onClick={goToStep1} className="shrink-0 font-semibold text-brand underline-offset-4 hover:underline">
              Edit
            </button>
          </div>
          <div className="mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <Labeled id="name" label="Full name" error={errors.name} wide>
              <input {...ctl("name")} className={inputClass} autoComplete="name" maxLength={80} value={values.name} onChange={(e) => set("name", e.target.value)} />
            </Labeled>
            <Labeled id="phone" label="Phone" error={errors.phone}>
              <input {...ctl("phone")} type="tel" className={inputClass} placeholder="(602) 555-0123" autoComplete="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} />
            </Labeled>
            <Labeled id="email" label="Email" error={errors.email}>
              <input {...ctl("email")} type="email" className={inputClass} placeholder="you@example.com" autoComplete="email" maxLength={254} value={values.email} onChange={(e) => set("email", e.target.value)} />
            </Labeled>
          </div>

          <div className="mt-6">
            <label className="flex items-start gap-3 text-sm text-ink">
              <input
                {...ctl("consent")}
                type="checkbox"
                checked={consent}
                onChange={(e) => { setConsent(e.target.checked); setErrors((er) => ({ ...er, consent: undefined })); }}
                className="mt-0.5 size-6 shrink-0 accent-brand"
              />
              <span>I agree to be contacted by phone, text or email about my offer.</span>
            </label>
            {errors.consent && <p id="consent-error" className="mt-1.5 text-sm font-medium text-bad">{errors.consent}</p>}
          </div>

          {formError && (
            <p role="alert" className="mt-6 rounded-xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad">{formError}</p>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
            <button type="button" onClick={goToStep1} className={secondaryBtn}>Back</button>
            <button key="submit" type="submit" disabled={sending} className={`${primaryBtn} sm:flex-1`}>
              {sending ? "Calculating your offer…" : "Get my instant offer"}
            </button>
          </div>
          <p className="mt-3 text-center text-sm text-muted">Free, no obligation.</p>
        </>
      )}

      {/* Honeypot: hidden from people, bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" tabIndex={-1} autoComplete="off" value={values.company} onChange={(e) => set("company", e.target.value)} />
      </div>
    </form>
  );
}

function Labeled({ id, label, error, wide, children }: { id: string; label: string; error?: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">{label}</label>
      {children}
      {error && <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-bad">{error}</p>}
    </div>
  );
}

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : raw;
}
