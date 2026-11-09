"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="mx-auto mt-16 w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-stone-900">Admin login</h1>
      <label htmlFor="password" className="mt-5 mb-1.5 block text-sm font-medium text-stone-700">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autoFocus
        autoComplete="current-password"
        maxLength={200}
        className="w-full rounded-xl border border-stone-300 px-3.5 py-3 text-base outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-600/15"
      />
      {state.error && <p role="alert" className="mt-2 text-sm text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="mt-5 w-full rounded-xl bg-stone-900 px-4 py-3 font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-70"
      >
        {pending ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
