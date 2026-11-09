import { neon } from "@neondatabase/serverless";
import { promises as fs } from "fs";
import path from "path";
import type { OfferInput } from "./validate";
import type { OfferResult } from "./offer";

export type Lead = OfferInput & {
  offer: number;
  comparablesCount: number;
  priceLow: number;
  priceHigh: number;
  createdAt: string; // ISO time
};

export function toLead(input: OfferInput, result: OfferResult): Lead {
  return {
    ...input,
    offer: result.offer,
    comparablesCount: result.comparablesCount,
    priceLow: result.priceLow,
    priceHigh: result.priceHigh,
    createdAt: new Date().toISOString(),
  };
}

// Where leads go: Neon Postgres when DATABASE_URL is set, else a local JSON file.
// The JSON file is for `npm run dev` only: Vercel's disk is read-only.
function store() {
  if (process.env.DATABASE_URL) return "neon" as const;
  if (process.env.VERCEL) throw new Error("DATABASE_URL is not set on Vercel; leads cannot be saved.");
  return "file" as const;
}

export async function saveLead(lead: Lead): Promise<void> {
  if (store() === "neon") {
    const sql = await db();
    await sql`
      INSERT INTO leads (created_at, year, make, model, mileage, condition, title_status,
                         zip, name, phone, email, offer, comparables_count, price_low, price_high)
      VALUES (${lead.createdAt}, ${lead.year}, ${lead.make}, ${lead.model}, ${lead.mileage},
              ${lead.condition}, ${lead.titleStatus}, ${lead.zip}, ${lead.name}, ${lead.phone},
              ${lead.email}, ${lead.offer}, ${lead.comparablesCount}, ${lead.priceLow}, ${lead.priceHigh})`;
    return;
  }
  const leads = await readFile();
  leads.push(lead);
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(leads, null, 2));
}

// Newest first.
export async function listLeads(limit = 500): Promise<Lead[]> {
  if (store() === "neon") {
    const sql = await db();
    const rows = await sql`
      SELECT created_at, year, make, model, mileage, condition, title_status, zip, name, phone,
             email, offer, comparables_count, price_low, price_high
      FROM leads ORDER BY created_at DESC LIMIT ${limit}`;
    return rows.map((r) => ({
      createdAt: new Date(r.created_at).toISOString(),
      year: r.year,
      make: r.make,
      model: r.model,
      mileage: r.mileage,
      condition: r.condition,
      titleStatus: r.title_status,
      zip: r.zip,
      name: r.name,
      phone: r.phone,
      email: r.email,
      offer: r.offer,
      comparablesCount: r.comparables_count,
      priceLow: r.price_low,
      priceHigh: r.price_high,
    }));
  }
  const leads = await readFile();
  return leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

// --- Neon ---
let tableReady: Promise<void> | null = null;

async function db() {
  const sql = neon(process.env.DATABASE_URL!);
  // Creates the table on first use, once per server instance, so there is no manual setup step.
  tableReady ??= sql`
    CREATE TABLE IF NOT EXISTS leads (
      id                bigserial PRIMARY KEY,
      created_at        timestamptz NOT NULL DEFAULT now(),
      year              int  NOT NULL,
      make              text NOT NULL,
      model             text NOT NULL,
      mileage           int  NOT NULL,
      condition         text NOT NULL,
      title_status      text NOT NULL,
      zip               text NOT NULL,
      name              text NOT NULL,
      phone             text NOT NULL,
      email             text NOT NULL,
      offer             int  NOT NULL,
      comparables_count int  NOT NULL,
      price_low         int  NOT NULL,
      price_high        int  NOT NULL
    )`.then(
    () => undefined,
    (err) => {
      tableReady = null; // try again next time
      throw err;
    },
  );
  await tableReady;
  return sql;
}

// --- Local JSON file (dev only) ---
const FILE = path.join(process.cwd(), "data", "leads.json");

async function readFile(): Promise<Lead[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Lead[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}
