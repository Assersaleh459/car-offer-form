"use client";

import { useState, type FormEvent } from "react";
import { CONDITIONS, TITLE_STATUSES, type OfferResult } from "@/lib/offer";
import { isArizonaZip, MAX_YEAR, MIN_YEAR, validateOfferInput, type FieldErrors, type OfferInput } from "@/lib/validate";

type Field = keyof OfferInput;
type Values = Record<Field, string> & { company: string };

const EMPTY: Values = {
  year: "", make: "", model: "", mileage: "", condition: "", titleStatus: "",
  zip: "", name: "", phone: "", email: "", company: "",
};

const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MAX_YEAR - i);
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const inputClass =
  "w-full rounded-xl border border-stone-300 bg-white px-3.5 py-3 text-base text-stone-900 shadow-sm outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-stone-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-600/15 aria-[invalid=true]:border-red-500";

export function OfferForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<(OfferResult & { needsReview?: boolean }) | null>(null);

  const set = (field: keyof Values, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field as Field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    const check = validateOfferInput({ ...values, consent });
    if (!check.ok) {
      setErrors(check.errors);
      document.getElementById(Object.keys(check.errors)[0])?.focus();
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...check.data, consent, company: values.company }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setResult(data as OfferResult);
      else if (data.errors) setErrors(data.errors);
      else setFormError(data.error ?? "Something went wrong. Please try again.");
    } catch {
      setFormError("Network error. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  const startOver = () => { setResult(null); setValues(EMPTY); setConsent(false); };
  const areaNote = !isArizonaZip(values.zip) && (
    <p className="mt-4 text-sm text-stone-600">Your ZIP is outside our usual Arizona area. We&apos;ll still call you.</p>
  );

  if (result?.needsReview) {
    return (
      <div className="animate-[rise_300ms_cubic-bezier(0.23,1,0.32,1)] rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">Thanks, {values.name.split(" ")[0]}</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-stone-900 text-balance">
          Your {values.year} {values.make} {values.model} needs a quick look from our team.
        </p>
        <p className="mt-3 text-stone-600">
          We don&apos;t have enough recent sales of this car to price it automatically.
          We&apos;ll call you within 1 hour at {formatPhone(values.phone)} with your offer.
        </p>
        {areaNote}
        <button type="button" onClick={startOver} className="mt-6 text-sm font-medium text-amber-700 underline-offset-4 hover:underline">
          Get an offer for another car
        </button>
      </div>
    );
  }

  if (result) {
    return (
      <div className="animate-[rise_300ms_cubic-bezier(0.23,1,0.32,1)] rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">Your instant cash offer</p>
        <p className="mt-2 text-5xl font-bold tracking-tight text-stone-900 tabular-nums">{usd(result.offer)}</p>
        <p className="mt-1 text-stone-600">
          for your {values.year} {values.make} {values.model}
        </p>

        <div className="mt-6 rounded-2xl bg-stone-50 p-4 text-sm text-stone-700">
          <p className="font-semibold text-stone-900">How we calculated this</p>
          <p className="mt-1">
            We looked at {result.comparablesCount} recent auction sales of similar cars ({usd(result.priceLow)} to{" "}
            {usd(result.priceHigh)}), took the middle price, and adjusted it for condition and title status.
          </p>
        </div>

        <p className="mt-6 flex items-center gap-2 font-medium text-stone-900">
          <span aria-hidden className="inline-block size-2.5 rounded-full bg-green-500" />
          We&apos;ll call you within 1 hour at {formatPhone(values.phone)}.
        </p>
        {areaNote}

        <button
          type="button"
          onClick={startOver}
          className="mt-6 text-sm font-medium text-amber-700 underline-offset-4 hover:underline"
        >
          Get an offer for another car
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-4 text-lg font-semibold text-stone-900">Your car</legend>

        <Labeled id="year" label="Year" error={errors.year}>
          <select id="year" className={inputClass} value={values.year} onChange={(e) => set("year", e.target.value)} aria-invalid={!!errors.year} aria-describedby="year-error">
            <option value="">Select year</option>
            {YEARS.map((y) => <option key={y}>{y}</option>)}
          </select>
        </Labeled>
        <Labeled id="make" label="Make" error={errors.make}>
          <input id="make" className={inputClass} placeholder="Toyota" autoComplete="off" maxLength={40} value={values.make} onChange={(e) => set("make", e.target.value)} aria-invalid={!!errors.make} aria-describedby="make-error" />
        </Labeled>
        <Labeled id="model" label="Model" error={errors.model}>
          <input id="model" className={inputClass} placeholder="Camry" autoComplete="off" maxLength={60} value={values.model} onChange={(e) => set("model", e.target.value)} aria-invalid={!!errors.model} aria-describedby="model-error" />
        </Labeled>
        <Labeled id="mileage" label="Mileage" error={errors.mileage}>
          <input id="mileage" className={inputClass} placeholder="85000" inputMode="numeric" maxLength={9} value={values.mileage} onChange={(e) => set("mileage", e.target.value)} aria-invalid={!!errors.mileage} aria-describedby="mileage-error" />
        </Labeled>
        <Labeled id="condition" label="Condition" error={errors.condition}>
          <select id="condition" className={inputClass} value={values.condition} onChange={(e) => set("condition", e.target.value)} aria-invalid={!!errors.condition} aria-describedby="condition-error">
            <option value="">Select condition</option>
            {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Labeled>
        <Labeled id="titleStatus" label="Title status" error={errors.titleStatus}>
          <select id="titleStatus" className={inputClass} value={values.titleStatus} onChange={(e) => set("titleStatus", e.target.value)} aria-invalid={!!errors.titleStatus} aria-describedby="titleStatus-error">
            <option value="">Select title</option>
            {TITLE_STATUSES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Labeled>
        <Labeled id="zip" label="ZIP code" error={errors.zip}>
          <input id="zip" className={inputClass} placeholder="85004" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={values.zip} onChange={(e) => set("zip", e.target.value)} aria-invalid={!!errors.zip} aria-describedby="zip-error" />
        </Labeled>
      </fieldset>

      <fieldset className="mt-8 grid gap-4 sm:grid-cols-2">
        <legend className="mb-4 text-lg font-semibold text-stone-900">Your contact details</legend>

        <Labeled id="name" label="Full name" error={errors.name} wide>
          <input id="name" className={inputClass} autoComplete="name" maxLength={80} value={values.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} aria-describedby="name-error" />
        </Labeled>
        <Labeled id="phone" label="Phone" error={errors.phone}>
          <input id="phone" type="tel" className={inputClass} placeholder="(602) 555-0123" autoComplete="tel" maxLength={20} value={values.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!errors.phone} aria-describedby="phone-error" />
        </Labeled>
        <Labeled id="email" label="Email" error={errors.email}>
          <input id="email" type="email" className={inputClass} placeholder="you@example.com" autoComplete="email" maxLength={254} value={values.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} aria-describedby="email-error" />
        </Labeled>

        {/* Honeypot: hidden from people, bots fill it in. */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="company">Company</label>
          <input id="company" tabIndex={-1} autoComplete="off" value={values.company} onChange={(e) => set("company", e.target.value)} />
        </div>
      </fieldset>

      <div className="mt-6">
        <label className="flex items-start gap-3 text-sm text-stone-700">
          <input
            id="consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => { setConsent(e.target.checked); setErrors((er) => ({ ...er, consent: undefined })); }}
            aria-invalid={!!errors.consent}
            aria-describedby="consent-error"
            className="mt-0.5 size-5 shrink-0 accent-amber-600"
          />
          <span>I agree to be contacted by phone, text or email about my offer.</span>
        </label>
        <p id="consent-error" className="mt-1 min-h-5 text-sm text-red-600">{errors.consent}</p>
      </div>

      {formError && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="mt-8 w-full rounded-xl bg-amber-600 px-5 py-3.5 text-base font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-amber-700 active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
      >
        {sending ? "Calculating your offer…" : "Get my instant offer"}
      </button>
      <p className="mt-3 text-center text-xs text-stone-500">Free, no obligation. Takes about a minute.</p>
      <p className="mt-1 text-center text-xs font-medium text-stone-500">Demo site: please don&apos;t enter real personal details.</p>
    </form>
  );
}

function Labeled({ id, label, error, wide, children }: { id: string; label: string; error?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-stone-700">{label}</label>
      {children}
      <p id={`${id}-error`} className="mt-1 min-h-5 text-sm text-red-600">{error}</p>
    </div>
  );
}

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : raw;
}
