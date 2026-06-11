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

// Match an open DB row to an OpenLigaDB entry by kickoff time + team names.
// Both conditions must hold to avoid mismatching swapped home/away or
// reschedules that collide with another fixture.
function findExternalMatch(
  externals: OpenLigaDBMatch[],
  dbMatch: {
    kickoffAt: Date;
    homeTeam: { name: string; code: string };
    awayTeam: { name: string; code: string };
  },
): OpenLigaDBMatch | undefined {
  const targetMs = dbMatch.kickoffAt.getTime();
  const home = dbMatch.homeTeam.name.toLowerCase();
  const away = dbMatch.awayTeam.name.toLowerCase();
  const homeCode = dbMatch.homeTeam.code.toLowerCase();
  const awayCode = dbMatch.awayTeam.code.toLowerCase();

  return externals.find((m) => {
    const externalMs = new Date(m.matchDateTimeUTC).getTime();
    if (Math.abs(externalMs - targetMs) > KICKOFF_TOLERANCE_MS) return false;

    const t1Name = m.team1.teamName.toLowerCase();
    const t2Name = m.team2.teamName.toLowerCase();
    const t1Short = (m.team1.shortName ?? "").toLowerCase();
    const t2Short = (m.team2.shortName ?? "").toLowerCase();

    const homeMatches = t1Name === home || t1Short === homeCode;
    const awayMatches = t2Name === away || t2Short === awayCode;
    return homeMatches && awayMatches;
  });
}
