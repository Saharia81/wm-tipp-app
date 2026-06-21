// Auto-sync match results from OpenLigaDB (https://www.openligadb.de/).
//
// Why OpenLigaDB: free, no API key, German team names (matches our `Team.name`),
// and historically covers the FIFA World Cup (`wm2022`, `wm2018`, ...).
//
// The shortcut for WM 2026 is configurable via OPENLIGADB_LEAGUE because
// OpenLigaDB may not have published the dataset yet and the slug could differ.
// Default: "wm2026".
//
// Called from the Vercel Cron endpoint and (optionally) from the admin UI.

import { prisma } from "@/lib/prisma";
import { applyMatchResult } from "@/lib/scoring";
import { Stage } from "@/app/generated/prisma/client";

const OPENLIGADB_BASE = "https://api.openligadb.de";

// Subset of the OpenLigaDB match payload — we only consume what we need.
type OpenLigaDBMatch = {
  matchID: number;
  matchDateTimeUTC: string;
  matchIsFinished: boolean;
  // The round name, e.g. "Achtelfinale", "Finale", or "1. Spieltag" for groups.
  group?: { groupName?: string };
  team1: { teamName: string; shortName?: string };
  team2: { teamName: string; shortName?: string };
  matchResults: Array<{
    resultTypeID: number;
    pointsTeam1: number;
    pointsTeam2: number;
  }>;
};

export type SyncStats = {
  checked: number;
  created: number;
  updated: number;
  scored: number;
  skipped: number;
  errors: string[];
};

// Max difference between our seeded kickoffAt and OpenLigaDB's matchDateTimeUTC
// when matching. 90 minutes covers normal schedule shifts (re-scheduled matches,
// timezone seed mistakes) without risking cross-fixture collisions.
const KICKOFF_TOLERANCE_MS = 90 * 60 * 1000;

// OpenLigaDB result types: 1 = Halbzeit (half-time), 2 = Endergebnis (final score).
// We only score on the final result. If a match goes to extra time / penalties,
// OpenLigaDB usually returns the result after 90 min in type 2 and adds
// separate entries — for the WM 2026 KO stage this might mean the admin still
// has to correct knockout draws manually. That's why manual entry stays.
const FINAL_RESULT_TYPE_ID = 2;

export async function syncResultsFromOpenLigaDB(): Promise<SyncStats> {
  const league = process.env.OPENLIGADB_LEAGUE ?? "wm2026";
  // Auto-creating KO fixtures from the feed is on by default; set
  // OPENLIGADB_AUTOCREATE=0 to fall back to manual creation in the admin UI.
  const autoCreate = process.env.OPENLIGADB_AUTOCREATE !== "0";
  const stats: SyncStats = {
    checked: 0,
    created: 0,
    updated: 0,
    scored: 0,
    skipped: 0,
    errors: [],
  };

  // Fetch the full feed once. We need it both to create missing KO fixtures and
  // to score finished matches, so this runs even when no match is awaiting a result.
  let externalMatches: OpenLigaDBMatch[];
  try {
    const res = await fetch(`${OPENLIGADB_BASE}/getmatchdata/${league}`, {
      // Disable Next.js fetch cache — we want fresh data on every cron run.
      cache: "no-store",
    });
    if (!res.ok) {
      stats.errors.push(`OpenLigaDB HTTP ${res.status} for league "${league}"`);
      return stats;
    }
    externalMatches = (await res.json()) as OpenLigaDBMatch[];
  } catch (e) {
    stats.errors.push(`OpenLigaDB fetch failed: ${(e as Error).message}`);
    return stats;
  }

  // Step 1: create KO fixtures the feed knows about but we don't yet. Done before
  // the result loop so a fixture that's already finished can be scored in the same run.
  if (autoCreate) {
    try {
      stats.created = await createMissingMatches(externalMatches);
    } catch (e) {
      stats.errors.push(`Auto-create failed: ${(e as Error).message}`);
    }
  }

  // Step 2: score finished matches. Only matches whose kickoff already passed and
  // have no result yet. Anything future is irrelevant; anything already scored is
  // idempotently skipped.
  const openMatches = await prisma.match.findMany({
    where: { resultEnteredAt: null, kickoffAt: { lte: new Date() } },
    select: {
      id: true,
      kickoffAt: true,
      homeTeam: { select: { name: true, code: true } },
      awayTeam: { select: { name: true, code: true } },
    },
  });
  stats.checked = openMatches.length;

  for (const dbMatch of openMatches) {
    const external = findExternalMatch(externalMatches, dbMatch);
    if (!external) {
      stats.skipped++;
      continue;
    }
    if (!external.matchIsFinished) {
      stats.skipped++;
      continue;
    }
    const finalResult = external.matchResults.find(
      (r) => r.resultTypeID === FINAL_RESULT_TYPE_ID,
    );
    if (!finalResult) {
      stats.skipped++;
      continue;
    }

    try {
      const tipsScored = await prisma.$transaction((tx) =>
        applyMatchResult(
          tx,
          dbMatch.id,
          finalResult.pointsTeam1,
          finalResult.pointsTeam2,
        ),
      );
      stats.updated++;
      stats.scored += tipsScored;
    } catch (e) {
      stats.errors.push(
        `Match ${dbMatch.id} (${dbMatch.homeTeam.name} vs ${dbMatch.awayTeam.name}): ${(e as Error).message}`,
      );
    }
  }

  return stats;
}

// Map an OpenLigaDB round name to our Stage enum. Returns null for group-stage
// rounds ("1. Spieltag", "Gruppe A", …) and anything we don't recognise, so
// those are left alone. Order matters: the longer round names ("Viertelfinale",
// "Halbfinale") contain "finale" as a substring, so they're checked first.
function stageFromGroupName(name: string | undefined): Stage | null {
  if (!name) return null;
  const n = normalize(name);
  if (n.includes("sechzehntel")) return Stage.ROUND_OF_32;
  if (n.includes("achtel")) return Stage.ROUND_OF_16;
  if (n.includes("viertel")) return Stage.QUARTER_FINAL;
  if (n.includes("halbfinale") || n.includes("halb")) return Stage.SEMI_FINAL;
  if (n.includes("platz")) return Stage.THIRD_PLACE; // "Spiel um Platz 3"
  if (n.includes("finale")) return Stage.FINAL;
  return null;
}

// Create KO matches that exist in the feed but not in our DB. Strict on purpose:
// we only insert when BOTH teams map to a known team and the round name maps to a
// KO stage — a feed entry still showing placeholders ("Sieger Gruppe A") simply
// doesn't map and is skipped until the real teams appear. Group matches are never
// created here (they're seeded). Returns how many were inserted.
async function createMissingMatches(
  externals: OpenLigaDBMatch[],
): Promise<number> {
  const teams = await prisma.team.findMany({
    select: { id: true, code: true, name: true },
  });
  // Existing pairings (either orientation) so we never insert a duplicate.
  const existing = await prisma.match.findMany({
    select: { homeTeamId: true, awayTeamId: true },
  });
  const seen = new Set(
    existing.flatMap((m) => [
      `${m.homeTeamId}:${m.awayTeamId}`,
      `${m.awayTeamId}:${m.homeTeamId}`,
    ]),
  );

  let created = 0;
  for (const ext of externals) {
    const stage = stageFromGroupName(ext.group?.groupName);
    if (!stage) continue; // group stage or unknown round → leave alone

    const home = teams.find((t) => sideMatches(ext.team1, t.name, t.code));
    const away = teams.find((t) => sideMatches(ext.team2, t.name, t.code));
    if (!home || !away || home.id === away.id) continue; // placeholder/unknown

    const kickoffAt = new Date(ext.matchDateTimeUTC);
    if (Number.isNaN(kickoffAt.getTime())) continue;

    if (seen.has(`${home.id}:${away.id}`)) continue;

    await prisma.match.create({
      data: { stage, kickoffAt, homeTeamId: home.id, awayTeamId: away.id },
    });
    // Guard against duplicate rows from repeated entries within the same feed.
    seen.add(`${home.id}:${away.id}`);
    seen.add(`${away.id}:${home.id}`);
    created++;
  }

  return created;
}

// Lowercase + strip diacritics so "Curaçao" == "Curacao", "Türkei" == "Turkei".
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Does one OpenLigaDB side correspond to our team? True if either the name or
// the 3-letter code matches (normalized). OpenLigaDB sometimes uses a different
// name OR code than our seed (e.g. "Katar"/"KAT" vs our "Katar"/"QAT"), so
// matching on either identifier covers most divergences.
function sideMatches(
  team: { teamName: string; shortName?: string },
  name: string,
  code: string,
): boolean {
  return (
    normalize(team.teamName) === normalize(name) ||
    normalize(team.shortName ?? "") === normalize(code)
  );
}

// Match an open DB row to an OpenLigaDB entry by kickoff time + team identity.
//
// Within the kickoff tolerance window we pick the candidate where the MOST sides
// (home/away) match by name or code — instead of demanding that BOTH sides match.
// That matters because OpenLigaDB occasionally diverges on a single team's name
// AND code at once (e.g. our "Bosnien und Herzegowina"/"BIH" vs OpenLigaDB's
// "Bosnien-Herzegowina"/"BHG"). Requiring both sides silently skipped such games;
// the home team still matches, so one confirmed side + an unambiguous winner is
// enough. Simultaneous fixtures (final group round) stay safe: the wrong fixture
// scores 0, and a genuine tie returns undefined so the admin enters it by hand.
function findExternalMatch(
  externals: OpenLigaDBMatch[],
  dbMatch: {
    kickoffAt: Date;
    homeTeam: { name: string; code: string };
    awayTeam: { name: string; code: string };
  },
): OpenLigaDBMatch | undefined {
  const targetMs = dbMatch.kickoffAt.getTime();
  const { homeTeam, awayTeam } = dbMatch;

  let best: OpenLigaDBMatch | undefined;
  let bestScore = 0;
  let tie = false;

  for (const m of externals) {
    const externalMs = new Date(m.matchDateTimeUTC).getTime();
    if (Math.abs(externalMs - targetMs) > KICKOFF_TOLERANCE_MS) continue;

    const score =
      (sideMatches(m.team1, homeTeam.name, homeTeam.code) ? 1 : 0) +
      (sideMatches(m.team2, awayTeam.name, awayTeam.code) ? 1 : 0);

    if (score > bestScore) {
      bestScore = score;
      best = m;
      tie = false;
    } else if (score === bestScore && score > 0) {
      tie = true;
    }
  }

  // Need at least one confirmed side and a single clear winner.
  return bestScore >= 1 && !tie ? best : undefined;
}
