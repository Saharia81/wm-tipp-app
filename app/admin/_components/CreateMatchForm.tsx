"use client";

import { useActionState } from "react";
import { KO_STAGES, STAGE_LABELS } from "@/lib/stages";
import { createMatchAction, type CreateMatchState } from "../actions";

export type CreateMatchFormProps = {
  teams: { id: string; code: string; name: string; group: string | null }[];
};

export function CreateMatchForm({ teams }: CreateMatchFormProps) {
  const [state, formAction, pending] = useActionState<CreateMatchState, FormData>(
    createMatchAction,
    undefined,
  );

  // Teams alphabetically by German name — easier to scan in a long dropdown.
  const sorted = [...teams].sort((a, b) => a.name.localeCompare(b.name, "de"));

  return (
    <details className="rounded-2xl bg-white/[0.02] border border-white/10">
      <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <h2 className="text-sm uppercase tracking-[0.2em] text-white/70">
          K.-o.-Spiel anlegen
        </h2>
        <span className="text-white/50" aria-hidden>
          ＋
        </span>
      </summary>

      <form action={formAction} className="flex flex-col gap-3 px-4 pb-4 pt-1">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-white/60">Runde</span>
          <select
            name="stage"
            required
            disabled={pending}
            defaultValue={KO_STAGES[0]}
            className="h-11 rounded-lg bg-white/10 border border-white/15 px-3 text-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {KO_STAGES.map((s) => (
              <option key={s} value={s} className="text-black">
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-2">
          <TeamSelect name="homeTeamId" label="Heim" teams={sorted} disabled={pending} />
          <span className="pb-3 text-white/50">:</span>
          <TeamSelect name="awayTeamId" label="Gast" teams={sorted} disabled={pending} />
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-white/60">Anpfiff (deutsche Zeit)</span>
          <input
            type="datetime-local"
            name="kickoffLocal"
            required
            disabled={pending}
            className="h-11 rounded-lg bg-white/10 border border-white/15 px-3 text-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-full bg-emerald-400 text-[#0a1f44] font-semibold disabled:opacity-60"
        >
          {pending ? "Lege an…" : "Spiel anlegen"}
        </button>

        {state?.ok === true && (
          <p className="text-xs text-emerald-300">✓ Spiel angelegt.</p>
        )}
        {state?.ok === false && (
          <p className="text-xs text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}
      </form>
    </details>
  );
}

function TeamSelect({
  name,
  label,
  teams,
  disabled,
}: {
  name: string;
  label: string;
  teams: { id: string; code: string; name: string; group: string | null }[];
  disabled: boolean;
}) {
  return (
    <label className="flex-1 min-w-0 flex flex-col gap-1 text-sm">
      <span className="text-white/60">{label}</span>
      <select
        name={name}
        required
        disabled={disabled}
        defaultValue=""
        className="h-11 rounded-lg bg-white/10 border border-white/15 px-2 text-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-400"
      >
        <option value="" disabled className="text-black">
          Team wählen
        </option>
        {teams.map((t) => (
          <option key={t.id} value={t.id} className="text-black">
            {t.name}
            {t.group ? ` (${t.group})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
