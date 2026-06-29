"use client";

import { useActionState, useState } from "react";
import { flagFor } from "@/lib/flags";
import { isKnockoutStage, stageLabel, type Stage } from "@/lib/stages";
import {
  saveResultAction,
  clearResultAction,
  deleteMatchAction,
  type ResultActionState,
  type CreateMatchState,
} from "../actions";

export type ResultRowProps = {
  match: {
    id: string;
    stage: Stage;
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
  const [deleteState, deleteAction, deleting] = useActionState<
    CreateMatchState,
    FormData
  >(deleteMatchAction, undefined);

  const hasResult = match.homeScore !== null && match.awayScore !== null;
  // Group matches are seeded and protected; only KO matches can be deleted.
  const canDelete = match.stage !== "GROUP";
  const busy = saving || clearing || deleting;

  // Controlled scores, so we can block a KO tie live (a winner must be decided).
  const [home, setHome] = useState<string>(
    match.homeScore === null ? "" : String(match.homeScore),
  );
  const [away, setAway] = useState<string>(
    match.awayScore === null ? "" : String(match.awayScore),
  );
  const drawBlocked =
    isKnockoutStage(match.stage) && home !== "" && home === away;
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
          {stageLabel(match.stage, match.group)} · {formatKickoff(match.kickoffAt)}
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
              value={home}
              onChange={setHome}
              disabled={busy}
            />
            <span className="text-white/50">:</span>
            <ScoreInput
              name="awayScore"
              value={away}
              onChange={setAway}
              disabled={busy}
            />
          </div>
          <TeamLabel team={match.awayTeam} align="left" />
        </div>

        {drawBlocked && (
          <p className="text-xs text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
            K.-o.-Spiele enden nie unentschieden — Endstand inkl.
            Elfmeterschießen eintragen.
          </p>
        )}
        <button
          type="submit"
          disabled={saving || clearing || drawBlocked}
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
            disabled={busy}
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

      {canDelete && (
        <form action={deleteAction}>
          <input type="hidden" name="matchId" value={match.id} />
          <button
            type="submit"
            disabled={busy}
            className="w-full h-9 rounded-full border border-red-400/30 text-red-300 text-sm disabled:opacity-60"
          >
            {deleting ? "Lösche…" : "Spiel löschen"}
          </button>
        </form>
      )}
      {deleteState?.ok === false && (
        <p className="text-xs text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
          {deleteState.error}
        </p>
      )}
    </div>
  );
}

function ScoreInput({
  name,
  value,
  onChange,
  disabled,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <input
      name={name}
      type="number"
      inputMode="numeric"
      min={0}
      max={30}
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
