"use client";

import { useActionState } from "react";
import { updateNameAction, type UpdateNameState } from "../actions";

export function ProfilForm({ currentName }: { currentName: string }) {
  const [state, formAction, pending] = useActionState<UpdateNameState, FormData>(
    updateNameAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/80">Anzeigename</span>
        <input
          name="name"
          type="text"
          autoComplete="name"
          defaultValue={currentName}
          required
          minLength={2}
          maxLength={40}
          className="h-12 px-4 rounded-xl bg-white/10 border border-white/15 placeholder-white/40 text-white text-base focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
        />
        <span className="text-xs text-white/50">
          So erscheinst du in der Tabelle.
        </span>
      </label>

      {state?.error && (
        <p className="text-sm text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-400/30 rounded-lg px-3 py-2">
          Name gespeichert.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-full bg-emerald-400 text-[#0a1f44] font-semibold disabled:opacity-60"
      >
        {pending ? "Speichern…" : "Speichern"}
      </button>
    </form>
  );
}
