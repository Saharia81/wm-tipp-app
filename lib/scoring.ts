// Per-match scoring rules for the WM 2026 Tipp-App.
//
// 4 — exact score
// 3 — correct winner AND correct goal difference (but not exact score)
// 2 — correct winner only (incl. correct "draw" without exact score)
// 0 — wrong
//
// The World Champion bonus (10 points) lives in scoreChampionTip below.

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
