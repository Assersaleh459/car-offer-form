import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense, type ReactNode } from "react";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";
import { listLeads } from "@/lib/leads";
import { logout } from "./actions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Leads | Desert Auto Buyers", robots: { index: false } };

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <AdminContent />
      </Suspense>
    </main>
  );
}

type Tone = "good" | "warn" | "bad" | "neutral";
const TONES: Record<Tone, string> = {
  good: "bg-good-soft text-good",
  warn: "bg-notice text-notice-ink",
  bad: "bg-bad-soft text-bad",
  neutral: "bg-soft text-ink",
};
const conditionTone = (c: string): Tone => (c === "Excellent" || c === "Good" ? "good" : c === "Fair" ? "warn" : "bad");
const titleTone = (t: string): Tone => (t === "Clean" ? "neutral" : t === "Salvage" ? "bad" : "warn");

function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
    </div>
  );
}

// The session check happens here on the server, on every request.
async function AdminContent() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!isValidSession(token)) return <LoginForm />;

  let leads;
  try {
    leads = await listLeads();
  } catch (err) {
    console.error("listing leads failed", err);
    return <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 font-medium text-bad">Could not load leads. Check the server log.</p>;
  }

  const TZ = "America/Phoenix";
  const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const when = (iso: string) => new Date(iso).toLocaleString("en-US", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" });
  const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
  const phone = (p: string) => `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}`;

  const today = day(new Date());
  const newToday = leads.filter((l) => day(new Date(l.createdAt)) === today).length;
  const priced = leads.filter((l) => l.comparablesCount > 0);
  const average = priced.length ? Math.round(priced.reduce((sum, l) => sum + l.offer, 0) / priced.length) : null;
  const byPhone = leads.length - priced.length;

  const offerCell = (l: (typeof leads)[number]) =>
    l.comparablesCount === 0 ? (
      <Pill tone="warn">Price by phone</Pill>
    ) : (
      <>
        <span className="font-semibold text-ink">{usd(l.offer)}</span>
        <span className="block text-sm font-normal text-muted">
          {l.comparablesCount} comps, {usd(l.priceLow)}–{usd(l.priceHigh)}
        </span>
      </>
    );
  const link = "font-medium text-brand underline-offset-4 hover:underline";

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Leads</h1>
          <p className="text-sm text-muted">Newest first · Arizona time</p>
        </div>
        <form action={logout}>
          <button className="min-h-11 rounded-xl border border-field bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-soft">
            Log out
          </button>
        </form>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total leads" value={String(leads.length)} />
        <Kpi label="New today" value={String(newToday)} />
        <Kpi label="Average offer" value={average === null ? "–" : usd(average)} hint={priced.length ? `${priced.length} priced` : undefined} />
        <Kpi label="Price by phone" value={String(byPhone)} hint={byPhone ? "Call these first" : undefined} />
      </div>

      {leads.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-field p-10 text-center text-muted">
          No leads yet. Submit the form on the home page to see one here.
        </p>
      ) : (
        <>
          {/* Wide screens: a table with a sticky header. */}
          <div className="mt-6 hidden max-h-[70vh] overflow-auto rounded-2xl border border-line bg-surface md:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-soft text-sm text-muted">
                <tr>
                  {["Received", "Car", "Miles", "Condition", "Title", "ZIP", "Name", "Phone", "Email", "Offer"].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {leads.map((l, i) => (
                  <tr key={`${l.createdAt}-${i}`} className="align-top transition-colors hover:bg-soft/60">
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{when(l.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{l.year} {l.make} {l.model}</td>
                    <td className="px-4 py-3 tabular-nums">{l.mileage.toLocaleString("en-US")}</td>
                    <td className="px-4 py-3"><Pill tone={conditionTone(l.condition)}>{l.condition}</Pill></td>
                    <td className="px-4 py-3"><Pill tone={titleTone(l.titleStatus)}>{l.titleStatus}</Pill></td>
                    <td className="px-4 py-3 tabular-nums">{l.zip}</td>
                    <td className="px-4 py-3">{l.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                      <a className={link} href={`tel:+1${l.phone}`}>{phone(l.phone)}</a>
                    </td>
                    <td className="px-4 py-3"><a className={link} href={`mailto:${l.email}`}>{l.email}</a></td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">{offerCell(l)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: one card per lead, no sideways scrolling. */}
          <ul className="mt-6 grid gap-3 md:hidden">
            {leads.map((l, i) => (
              <li key={`${l.createdAt}-${i}`} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{l.year} {l.make} {l.model}</p>
                    <p className="text-sm text-muted">{l.mileage.toLocaleString("en-US")} mi · ZIP {l.zip}</p>
                  </div>
                  <div className="text-right tabular-nums">{offerCell(l)}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill tone={conditionTone(l.condition)}>{l.condition}</Pill>
                  <Pill tone={titleTone(l.titleStatus)}>{l.titleStatus}</Pill>
                </div>
                <p className="mt-3 font-medium text-ink">{l.name}</p>
                <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <a className={link} href={`tel:+1${l.phone}`}>{phone(l.phone)}</a>
                  <a className={`${link} break-all`} href={`mailto:${l.email}`}>{l.email}</a>
                </p>
                <p className="mt-2 text-sm text-muted">{when(l.createdAt)}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
