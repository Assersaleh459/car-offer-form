import { OfferForm } from "./offer-form";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Desert Auto Buyers · Arizona</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 text-balance sm:text-4xl">
          Get a cash offer for your car in 60 seconds
        </h1>
        <p className="mt-3 text-stone-600 text-pretty">
          Tell us about your car. We compare it with recent auction sales and show you a real offer on the spot.
        </p>
      </header>
      <OfferForm />
      <footer className="mt-10 text-center text-xs text-stone-400">
        Demo site. Desert Auto Buyers is a fictional business.
      </footer>
    </main>
  );
}
