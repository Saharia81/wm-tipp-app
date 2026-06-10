"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthField } from "../_components/AuthField";
import { registerAction, type RegisterState } from "./actions";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    registerAction,
    undefined,
  );

  return (
    <>
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Registrieren</h1>
        <p className="mt-2 text-white/70 text-sm">
          Account anlegen und mittippen.
        </p>
      </header>

      <form action={formAction} className="flex flex-col gap-4">
        <AuthField label="Name" name="name" autoComplete="name" />
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
          autoComplete="new-password"
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
          {pending ? "Wird erstellt…" : "Account erstellen"}
        </button>
      </form>

      <p className="text-center text-sm text-white/70">
        Bereits registriert?{" "}
        <Link href="/login" className="text-emerald-300 font-medium">
          Anmelden
        </Link>
      </p>
    </>
  );
}
