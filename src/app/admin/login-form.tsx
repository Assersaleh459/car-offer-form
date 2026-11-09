"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="mx-auto mt-12 w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-wide text-brand">Desert Auto Buyers</p>
      <h1 className="mt-1 text-xl font-semibold text-ink">Admin login</h1>
      <p className="mt-1 text-sm text-muted">Enter the admin password to see the leads.</p>
      <label htmlFor="password" className="mt-5 mb-1.5 block text-sm font-semibold text-ink">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autoFocus
        autoComplete="current-password"
        maxLength={200}
        className="w-full rounded-xl border border-field bg-surface px-3.5 py-3 text-base text-ink focus:border-brand"
      />
      {state.error && (
        <p role="alert" className="mt-3 rounded-xl bg-bad-soft px-4 py-2.5 text-sm font-medium text-bad">{state.error}</p>
      )}
      <button
        disabled={pending}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand px-4 py-3 font-semibold text-brand-ink transition-[background-color,transform] duration-150 ease-out hover:bg-brand-hover active:scale-[0.97] disabled:opacity-70"
      >
        {pending ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
