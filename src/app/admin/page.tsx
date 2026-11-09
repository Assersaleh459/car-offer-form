import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";
import { listLeads } from "@/lib/leads";
import { logout } from "./actions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Leads | Desert Auto Buyers", robots: { index: false } };

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
        <AdminContent />
      </Suspense>
    </main>
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
    return <p role="alert" className="text-red-700">Could not load leads. Check the server log.</p>;
  }

  const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const when = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { timeZone: "America/Phoenix", dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Leads</h1>
          <p className="text-sm text-stone-500">{leads.length} total · newest first · Arizona time</p>
        </div>
        <form action={logout}>
          <button className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100">
            Log out
          </button>
        </form>
      </div>

      {leads.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
          No leads yet. Submit the form on the home page to see one here.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                {["Received", "Car", "Miles", "Condition", "Title", "ZIP", "Name", "Phone", "Email", "Offer"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {leads.map((l, i) => (
                <tr key={`${l.createdAt}-${i}`} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-stone-500">{when(l.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-stone-900">{l.year} {l.make} {l.model}</td>
                  <td className="px-4 py-3 tabular-nums">{l.mileage.toLocaleString("en-US")}</td>
                  <td className="px-4 py-3">{l.condition}</td>
                  <td className="px-4 py-3">{l.titleStatus}</td>
                  <td className="px-4 py-3 tabular-nums">{l.zip}</td>
                  <td className="px-4 py-3">{l.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                    <a className="text-amber-700 hover:underline" href={`tel:+1${l.phone}`}>
                      ({l.phone.slice(0, 3)}) {l.phone.slice(3, 6)}-{l.phone.slice(6)}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <a className="text-amber-700 hover:underline" href={`mailto:${l.email}`}>{l.email}</a>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-stone-900">
                    {l.comparablesCount === 0 ? (
                      <span className="text-amber-700">Price by phone</span>
                    ) : (
                      <>
                        {usd(l.offer)}
                        <span className="block text-xs font-normal text-stone-500">
                          {l.comparablesCount} comps, {usd(l.priceLow)}–{usd(l.priceHigh)}
                        </span>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
