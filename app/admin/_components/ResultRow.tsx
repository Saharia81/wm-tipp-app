"use client";

import { useActionState } from "react";
import { flagFor } from "@/lib/flags";
import {
  saveResultAction,
  clearResultAction,
  type ResultActionState,
} from "../actions";

export type ResultRowProps = {
  match: {
    id: string;
    group: string | null;
    kickoffAt: string;
    homeTeam: { code: string; name: string };
    awayTeam: { code: string; name: string };
    homeScore: number | null;
    awayScore: number | null;
    tipCount: number;
  };
};

export function ResultRow({ match }: ResultRowProps) {
  const [saveState, saveAction, saving] = useActionState<
    ResultActionState,
    FormData
  >(saveResultAction, undefined);
  const [clearState, clearAction, clearing] = useActionState<
    ResultActionState,
    FormData
  >(clearResultAction, undefined);

  const hasResult = match.homeScore !== null && match.awayScore !== null;
  // Show the latest action's error/success; ignore the other.
  const lastState =
    saveState && clearState
      ? // both have run — show whichever is success, else whichever has an error
        saveState.ok || !clearState.ok
        ? saveState
        : clearState
      : (saveState ?? clearState);

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-white/60">
        <span>
          {match.group ? `Gruppe ${match.group} · ` : ""}
          {formatKickoff(match.kickoffAt)}
        </span>
        <span>
          {match.tipCount} {match.tipCount === 1 ? "Tipp" : "Tipps"}
        </span>
      </div>

      <form action={saveAction} className="flex flex-col gap-3">
        <input type="hidden" name="matchId" value={match.id} />

        <div className="flex items-center gap-3">
          <TeamLabel team={match.homeTeam} align="right" />
          <div className="flex items-center gap-1">
            <ScoreInput
              name="homeScore"
              defaultValue={match.homeScore ?? ""}
              disabled={saving || clearing}
            />
            <span className="text-white/50">:</span>
            <ScoreInput
              name="awayScore"
              defaultValue={match.awayScore ?? ""}
              disabled={saving || clearing}
            />
          </div>
          <TeamLabel team={match.awayTeam} align="left" />
        </div>

        <button
          type="submit"
          disabled={saving || clearing}
          className="h-11 rounded-full bg-emerald-400 text-[#0a1f44] font-semibold disabled:opacity-60"
        >
          {saving
            ? "Speichere…"
            : hasResult
              ? "Ergebnis aktualisieren"
              : "Ergebnis speichern"}
        </button>
      </form>

      {hasResult && (
        <form action={clearAction}>
          <input type="hidden" name="matchId" value={match.id} />
          <button
            type="submit"
            disabled={saving || clearing}
            className="w-full h-9 rounded-full border border-white/15 text-white/70 text-sm disabled:opacity-60"
          >
            {clearing ? "Lösche…" : "Ergebnis löschen"}
          </button>
        </form>
      )}

      {lastState?.ok === true && (
        <p className="text-xs text-emerald-300">
          ✓ Gespeichert — {lastState.tipsScored}{" "}
          {lastState.tipsScored === 1 ? "Tipp" : "Tipps"} neu bewertet.
        </p>
      )}
      {lastState?.ok === false && (
        <p className="text-xs text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
          {lastState.error}
        </p>
      )}
    </div>
  );
}

function ScoreInput({
  name,
  defaultValue,
  disabled,
}: {
  name: string;
  defaultValue: number | string;
  disabled: boolean;
}) {
  return (
    <input
      name={name}
      type="number"
      inputMode="numeric"
      min={0}
      max={30}
      defaultValue={defaultValue === "" ? "" : String(defaultValue)}
      disabled={disabled}
      required
      className="w-12 h-11 text-center text-lg font-semibold rounded-lg bg-white/10 border border-white/15 text-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-400"
    />
  );
}

function TeamLabel({
  team,
  align,
}: {
  team: { code: string; name: string };
  align: "left" | "right";
}) {
  const flag = flagFor(team.code);
  return (
    <div className={`flex-1 ${align === "right" ? "text-right" : "text-left"}`}>
      <div className="text-sm font-medium">
        {flag && <span className="mr-1">{flag}</span>}
        {team.name}
      </div>
      <div className="text-[10px] text-white/50 uppercase tracking-wider">
        {team.code}
      </div>
    </div>
  );
}

const kickoffFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatKickoff(iso: string) {
  return kickoffFormatter.format(new Date(iso));
}
