// Dev helper: shifts every match's kickoffAt so that the EARLIEST match starts
// `targetHoursFromNow` hours from now. Relative spacing between matches is preserved.
// Existing tips, results, and champion tips are NOT touched.
//
// Use to "rewind" the seed when you want to test the WM-Tipp picker locally:
//   npx tsx scripts/shift-matches.ts           # earliest match → 24h from now
//   npx tsx scripts/shift-matches.ts 1         # earliest match → 1h from now
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

async function main() {
  const targetHours = Number(process.argv[2] ?? "24");
  if (!Number.isFinite(targetHours)) {
    throw new Error("Usage: shift-matches.ts [hoursFromNowForEarliestMatch]");
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const matches = await p.match.findMany({ orderBy: { kickoffAt: "asc" } });
  if (matches.length === 0) {
    console.log("No matches in DB — nothing to shift.");
    await p.$disconnect();
    return;
  }

  const earliest = matches[0].kickoffAt.getTime();
  const target = Date.now() + targetHours * 60 * 60 * 1000;
  const deltaMs = target - earliest;

  for (const m of matches) {
    await p.match.update({
      where: { id: m.id },
      data: { kickoffAt: new Date(m.kickoffAt.getTime() + deltaMs) },
    });
  }

  console.log(
    `Shifted ${matches.length} matches by ${(deltaMs / 3600_000).toFixed(1)}h. ` +
      `Earliest is now ${new Date(target).toISOString()}.`,
  );
  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
