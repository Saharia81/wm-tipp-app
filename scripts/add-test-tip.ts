// One-off: give Alice a 4-pointer on the MEX-CAN match (real result 4:1, tip 4:1 → exact)
// and a 2-pointer on USA-JAM (real result 1:1, tip 2:2 → tipped draw, real draw, not exact).
// Lets us see real numbers in /tabelle.
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { scoreTip } from "../lib/scoring";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const alice = await p.user.findUnique({ where: { email: "alice@example.com" } });
  if (!alice) throw new Error("Alice missing — run scripts/make-user.ts first");

  const matches = await p.match.findMany({
    where: { homeScore: { not: null } },
    include: { homeTeam: true, awayTeam: true },
  });

  for (const m of matches) {
    if (!m.homeTeam || !m.awayTeam) continue;
    let tipHome: number, tipAway: number;
    if (m.homeTeam.code === "MEX" && m.awayTeam.code === "CAN") {
      tipHome = 4; tipAway = 1; // exact
    } else if (m.homeTeam.code === "USA" && m.awayTeam.code === "JAM") {
      tipHome = 2; tipAway = 2; // draw tipped, draw actual → 2 pts
    } else continue;

    const points = scoreTip(
      { homeScore: m.homeScore!, awayScore: m.awayScore! },
      { homeScore: tipHome, awayScore: tipAway },
    );

    await p.tip.upsert({
      where: { userId_matchId: { userId: alice.id, matchId: m.id } },
      update: { homeScore: tipHome, awayScore: tipAway, points },
      create: { userId: alice.id, matchId: m.id, homeScore: tipHome, awayScore: tipAway, points },
    });
    console.log(`  ${m.homeTeam.code}-${m.awayTeam.code}: tipped ${tipHome}:${tipAway}, result ${m.homeScore}:${m.awayScore} → ${points} pts`);
  }
  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
