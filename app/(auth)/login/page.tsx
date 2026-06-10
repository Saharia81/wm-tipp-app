"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthField } from "../_components/AuthField";
import { loginAction, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    undefined,
  );

  return (
    <>
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Anmelden</h1>
        <p className="mt-2 text-white/70 text-sm">
          Mit deinem Account einloggen.
        </p>
      </header>

      <form action={formAction} className="flex flex-col gap-4">
        <AuthField
          label="E-Mail"
          name="email"
          type="email"
          autoComplete="email"
        />
        <AuthField
          label="Passwort"
          name="password"
          type="password"
          autoComplete="current-password"
        />

        {state?.error && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="h-12 rounded-full bg-emerald-400 text-[#0a1f44] font-semibold disabled:opacity-60"
        >
          {pending ? "Wird angemeldet…" : "Anmelden"}
        </button>
      </form>

      <p className="text-center text-sm text-white/70">
        Noch kein Account?{" "}
        <Link href="/register" className="text-emerald-300 font-medium">
          Registrieren
        </Link>
      </p>
    </>
  );
}
