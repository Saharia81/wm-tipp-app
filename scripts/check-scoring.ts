// One-off check: exercise lib/scoring.ts against the documented cases.
// Run with: npx tsx scripts/check-scoring.ts
import { scoreTip, scoreChampionTip } from "../lib/scoring";

const cases: { name: string; actual: [number, number]; tip: [number, number]; expected: number }[] = [
  { name: "exact 2:1",                actual: [2, 1], tip: [2, 1], expected: 4 },
  { name: "exact 0:0",                actual: [0, 0], tip: [0, 0], expected: 4 },
  { name: "winner + goal diff (3:1 vs 2:0)", actual: [3, 1], tip: [2, 0], expected: 3 },
  { name: "winner only (4:1 vs 2:0)", actual: [4, 1], tip: [2, 0], expected: 2 },
  { name: "draw, non-exact (1:1 vs 2:2)", actual: [1, 1], tip: [2, 2], expected: 2 },
  { name: "wrong winner (2:1 vs 1:2)", actual: [2, 1], tip: [1, 2], expected: 0 },
  { name: "tipped draw, real win",     actual: [2, 1], tip: [1, 1], expected: 0 },
  { name: "real draw, tipped win",     actual: [1, 1], tip: [2, 1], expected: 0 },
];

let failed = 0;
for (const c of cases) {
  const got = scoreTip(
    { homeScore: c.actual[0], awayScore: c.actual[1] },
    { homeScore: c.tip[0],    awayScore: c.tip[1] },
  );
  const ok = got === c.expected;
  if (!ok) failed++;
  console.log(`${ok ? "OK" : "FAIL"}  ${c.name}: expected ${c.expected}, got ${got}`);
}
// Champion bonus
const champCases: { name: string; picked: string; champion: string | null; expected: number }[] = [
  { name: "champion picked correctly",   picked: "GER", champion: "GER", expected: 10 },
  { name: "champion picked wrong",       picked: "GER", champion: "ARG", expected: 0 },
  { name: "champion not yet known",      picked: "GER", champion: null,  expected: 0 },
];
for (const c of champCases) {
  const got = scoreChampionTip(c.picked, c.champion);
  const ok = got === c.expected;
  if (!ok) failed++;
  console.log(`${ok ? "OK" : "FAIL"}  champion: ${c.name}: expected ${c.expected}, got ${got}`);
}

console.log(failed === 0 ? "\nAll cases pass." : `\n${failed} failure(s).`);
process.exit(failed === 0 ? 0 : 1);
