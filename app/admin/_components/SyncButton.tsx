"use client";

import { useActionState } from "react";
import { syncResultsAction, type SyncActionState } from "../actions";

// One-click trigger for the OpenLigaDB sync. Lets the admin pull results on demand
// instead of waiting for the once-daily Vercel cron, and shows exactly what happened.
export function SyncButton() {
  const [state, action, pending] = useActionState<SyncActionState, FormData>(
    syncResultsAction,
    undefined,
  );

  return (
    <div className="flex flex-col gap-2">
      <form action={action}>
        <button
          type="submit"
          disabled={pending}
          className="w-full h-11 rounded-full bg-sky-400 text-[#0a1f44] font-semibold disabled:opacity-60"
        >
          {pending ? "Hole…" : "⟳ Ergebnisse jetzt holen"}
        </button>
      </form>

      {state?.ok === true && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-sky-200">
            {state.stats.checked} geprüft · {state.stats.updated} eingetragen ·{" "}
            {state.stats.scored} Tipps neu bewertet · {state.stats.skipped}{" "}
            übersprungen
          </p>
          {state.stats.updated === 0 && state.stats.checked > 0 && (
            <p className="text-xs text-white/60">
              Keine neuen Ergebnisse gefunden — OpenLigaDB führt die offenen Spiele
              evtl. noch nicht als beendet.
            </p>
          )}
          {state.stats.errors.length > 0 && (
            <div className="text-xs text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2 flex flex-col gap-1">
              {state.stats.errors.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}
        </div>
      )}
      {state?.ok === false && (
        <p className="text-xs text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
    </div>
  );
}
