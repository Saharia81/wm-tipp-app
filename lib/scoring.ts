// Per-match scoring rules for the WM 2026 Tipp-App.
//
// 4 — exact score
// 3 — correct winner AND correct goal difference (but not exact score)
// 2 — correct winner only (incl. correct "draw" without exact score)
// 0 — wrong
//
// The World Champion bonus (10 points) lives in scoreChampionTip below.

import { Prisma, Stage } from "@/app/generated/prisma/client";

export type MatchScore = { homeScore: number; awayScore: number };

export function scoreTip(actual: MatchScore, tip: MatchScore): number {
  if (
    tip.homeScore === actual.homeScore &&
    tip.awayScore === actual.awayScore
  ) {
    return 4;
  }

  const actualDiff = actual.homeScore - actual.awayScore;
  const tipDiff = tip.homeScore - tip.awayScore;

  // sign(diff): -1 away wins, 0 draw, 1 home wins
  const actualWinner = Math.sign(actualDiff);
  const tipWinner = Math.sign(tipDiff);

  if (actualWinner !== tipWinner) return 0;

  // Same winner. A draw that wasn't the exact score still counts as "winner only" — 2 points.
  if (actualWinner !== 0 && actualDiff === tipDiff) return 3;
  return 2;
}

// 10 points if the picked team wins the FINAL, else 0.
export function scoreChampionTip(
  pickedTeamId: string,
  championTeamId: string | null,
): number {
  if (!championTeamId) return 0;
  return pickedTeamId === championTeamId ? 10 : 0;
}

// Applies an official match result inside a transaction:
//   1. updates the Match row with the final score + resultEnteredAt timestamp,
//   2. recomputes points for every Tip on that match,
//   3. if the match is the FINAL, recomputes points for every ChampionTip.
// Shared by the admin manual-entry action and the OpenLigaDB auto-sync.
// Returns the number of tips that were rescored.
export async function applyMatchResult(
  tx: Prisma.TransactionClient,
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<number> {
  const updated = await tx.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore, resultEnteredAt: new Date() },
    select: { id: true, stage: true, homeTeamId: true, awayTeamId: true },
  });

  const tips = await tx.tip.findMany({
    where: { matchId: updated.id },
    select: { id: true, homeScore: true, awayScore: true },
  });

  for (const t of tips) {
    const points = scoreTip(
      { homeScore, awayScore },
      { homeScore: t.homeScore, awayScore: t.awayScore },
    );
    await tx.tip.update({ where: { id: t.id }, data: { points } });
  }

  // FINAL determines the World Champion → recompute ChampionTip points for everyone.
  // A drawn FINAL means no champion is known yet (admin should re-enter after extra time/penalties).
  if (updated.stage === Stage.FINAL) {
    const championTeamId =
      homeScore > awayScore
        ? updated.homeTeamId
        : awayScore > homeScore
          ? updated.awayTeamId
          : null;
    const championTips = await tx.championTip.findMany({
      select: { id: true, teamId: true },
    });
    for (const ct of championTips) {
      const points = scoreChampionTip(ct.teamId, championTeamId);
      await tx.championTip.update({
        where: { id: ct.id },
        data: { points: championTeamId ? points : null },
      });
    }
  }

  return tips.length;
}
