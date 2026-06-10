"use client";

import { useActionState, useState } from "react";
import { flagFor } from "@/lib/flags";
import {
  saveChampionTipAction,
  type SaveChampionState,
} from "../actions";

export type Team = { id: string; code: string; name: string; group: string | null };

export function ChampionPicker({
  teams,
  initialPickId,
}: {
  teams: Team[];
  initialPickId: string | null;
}) {
  const [state, formAction, pending] = useActionState<SaveChampionState, FormData>(
    saveChampionTipAction,
    undefined,
  );
  const [selected, setSelected] = useState<string | null>(initialPickId);

  // Pessimistic: only the optimistic state can be a "just-picked" id; if save fails,
  // the radio still reflects what the user clicked so they can adjust.
  const savedPickId = state?.ok ? state.teamId : initialPickId;

  // Group teams by group letter for display.
  const grouped = new Map<string, Team[]>();
  for (const t of teams) {
    const key = t.group ?? "—";
    const arr = grouped.get(key) ?? [];
    arr.push(t);
    grouped.set(key, arr);
  }
  const groupKeys = [...grouped.keys()].sort();

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {groupKeys.map((g) => (
        <fieldset key={g} className="flex flex-col gap-2">
          <legend className="text-xs uppercase tracking-[0.2em] text-white/50 mb-1">
            Gruppe {g}
          </legend>
          {grouped.get(g)!.map((t) => {
            const isSelected = selected === t.id;
            const isSaved = savedPickId === t.id;
            return (
              <label
                key={t.id}
                className={
                  "rounded-2xl p-4 flex items-center gap-3 border cursor-pointer " +
                  (isSelected
                    ? "bg-emerald-400/15 border-emerald-300"
                    : "bg-white/5 border-white/10")
                }
              >
                <input
                  type="radio"
                  name="teamId"
                  value={t.id}
                  defaultChecked={isSelected}
                  onChange={() => setSelected(t.id)}
                  className="h-5 w-5 accent-emerald-400"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">
                    {flagFor(t.code) && (
                      <span className="mr-1.5">{flagFor(t.code)}</span>
                    )}
                    {t.name}
                  </div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wider">
                    {t.code}
                  </div>
                </div>
                {isSaved && (
                  <span className="text-xs text-emerald-300">gespeichert</span>
                )}
              </label>
            );
          })}
        </fieldset>
      ))}

      {state?.ok === false && (
        <p className="text-sm text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {state?.ok === true && (
        <p className="text-sm text-emerald-300">✓ Weltmeister-Tipp gespeichert.</p>
      )}

      <button
        type="submit"
        disabled={pending || !selected}
        className="h-12 rounded-full bg-emerald-400 text-[#0a1f44] font-semibold disabled:opacity-60"
      >
        {pending ? "Wird gespeichert…" : initialPickId ? "Tipp ändern" : "Tipp speichern"}
      </button>
    </form>
  );
}
