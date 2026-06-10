"use client";

import { useActionState } from "react";
import { flagFor } from "@/lib/flags";
import { saveTipAction, type SaveTipState } from "../actions";

export type MatchCardProps = {
  match: {
    id: string;
    group: string | null;
    kickoffAt: string; // ISO string (Date can't cross the server→client boundary)
    homeTeam: { code: string; name: string };
    awayTeam: { code: string; name: string };
    homeScore: number | null;
    awayScore: number | null;
  };
  tip: { homeScore: number; awayScore: number; points: number | null } | null;
  locked: boolean;
};

export function MatchCard({ match, tip, locked }: MatchCardProps) {
  const [state, formAction, pending] = useActionState<SaveTipState, FormData>(
    saveTipAction,
    undefined,
  );

  // Optimistic: show the just-submitted scores immediately. After the parent revalidates,
  // `tip` will catch up.
  const shownHome =
    state?.ok === true ? state.homeScore : tip?.homeScore ?? "";
  const shownAway =
    state?.ok === true ? state.awayScore : tip?.awayScore ?? "";
  const errorMsg = state?.ok === false ? state.error : null;
  const hasResult = match.homeScore !== null && match.awayScore !== null;

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col gap-3"
    >
      <input type="hidden" name="matchId" value={match.id} />

      <div className="flex items-center justify-between text-xs text-white/60">
        <span>
          {match.group ? `Gruppe ${match.group} · ` : ""}
          {formatKickoff(match.kickoffAt)}
        </span>
        {locked && (
          <span className="text-white/60">
            {tip ? `Tipp: ${tip.homeScore}:${tip.awayScore}` : "Kein Tipp"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <TeamLabel team={match.homeTeam} align="right" />
        <div className="flex items-center gap-1">
          <ScoreInput
            name="homeScore"
            value={shownHome}
            disabled={locked || pending}
          />
          <span className="text-white/50">:</span>
          <ScoreInput
            name="awayScore"
            value={shownAway}
            disabled={locked || pending}
          />
        </div>
        <TeamLabel team={match.awayTeam} align="left" />
      </div>

      {hasResult && (
        <p className="text-xs text-white/70">
          Endergebnis: {match.homeScore}:{match.awayScore}
          {tip?.points != null && (
            <span className="ml-2 text-emerald-300 font-semibold">
              · {tip.points} Punkte
            </span>
          )}
        </p>
      )}

      {!locked && (
        <>
          {errorMsg && (
            <p className="text-xs text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-full bg-emerald-400 text-[#0a1f44] font-semibold disabled:opacity-60"
          >
            {pending
              ? "Wird gespeichert…"
              : tip
                ? "Tipp aktualisieren"
                : "Tipp speichern"}
          </button>
        </>
      )}
    </form>
  );
}

function ScoreInput({
  name,
  value,
  disabled,
}: {
  name: string;
  value: number | string;
  disabled: boolean;
}) {
  return (
    <input
      name={name}
      type="number"
      inputMode="numeric"
      min={0}
      max={30}
      defaultValue={value === "" ? "" : String(value)}
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
