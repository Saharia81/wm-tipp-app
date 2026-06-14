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

const OPENLIGADB_BASE = "https://api.openligadb.de";

// Subset of the OpenLigaDB match payload — we only consume what we need.
type OpenLigaDBMatch = {
  matchID: number;
  matchDateTimeUTC: string;
  matchIsFinished: boolean;
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
  const stats: SyncStats = {
    checked: 0,
    updated: 0,
    scored: 0,
    skipped: 0,
    errors: [],
  };

  // Only matches whose kickoff already passed and have no result yet.
  // Anything future is irrelevant; anything already scored is idempotently skipped.
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
  if (openMatches.length === 0) return stats;

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
