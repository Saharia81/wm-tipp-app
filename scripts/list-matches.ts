import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const ms = await p.match.findMany({
    orderBy: { kickoffAt: "asc" },
    include: { homeTeam: { select: { code: true } }, awayTeam: { select: { code: true } } },
  });
  for (const m of ms) {
    const past = m.kickoffAt.getTime() < Date.now() ? "PAST" : "FUTURE";
    const score = m.homeScore !== null ? `${m.homeScore}:${m.awayScore}` : "—";
    console.log(`${m.kickoffAt.toISOString()}  ${past}  ${m.homeTeam.code}-${m.awayTeam.code}  ${score}`);
  }
  await p.$disconnect();
}
main();
