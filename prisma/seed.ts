// Seeds the database with WM 2026 teams, the 72 group-stage matches, and an admin user.
//
// Knockout matches (R32, R16, QF, SF, 3rd place, Final) are NOT seeded — the Match
// schema requires non-null home/away team IDs, and knockout pairings aren't known
// until the group stage resolves. They're filled in automatically once the bracket
// is set: lib/sync-results.ts creates them from the OpenLigaDB feed, and the admin
// can add/remove them by hand (app/admin "K.-o.-Spiel anlegen") as a fallback.
//
// Source: FIFA WM 2026 draw on 2025-12-05, schedule per Wikipedia group articles.
// Run with: npm run db:seed
//
// Re-running is destructive for fixtures: it deletes all matches, tips, and
// champion tips before re-inserting, so the data stays in sync with this file.
// User accounts are preserved.

import { PrismaClient, Stage } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// All 48 qualified teams, grouped A–L. German names; FIFA 3-letter codes.
const teams: { code: string; name: string; group: string }[] = [
  // Group A
  { code: "MEX", name: "Mexiko", group: "A" },
  { code: "RSA", name: "Südafrika", group: "A" },
  { code: "KOR", name: "Südkorea", group: "A" },
  { code: "CZE", name: "Tschechien", group: "A" },
  // Group B
  { code: "CAN", name: "Kanada", group: "B" },
  { code: "BIH", name: "Bosnien und Herzegowina", group: "B" },
  { code: "QAT", name: "Katar", group: "B" },
  { code: "SUI", name: "Schweiz", group: "B" },
  // Group C
  { code: "BRA", name: "Brasilien", group: "C" },
  { code: "MAR", name: "Marokko", group: "C" },
  { code: "HAI", name: "Haiti", group: "C" },
  { code: "SCO", name: "Schottland", group: "C" },
  // Group D
  { code: "USA", name: "USA", group: "D" },
  { code: "PAR", name: "Paraguay", group: "D" },
  { code: "AUS", name: "Australien", group: "D" },
  { code: "TUR", name: "Türkei", group: "D" },
  // Group E
  { code: "GER", name: "Deutschland", group: "E" },
  { code: "CUW", name: "Curaçao", group: "E" },
  { code: "CIV", name: "Elfenbeinküste", group: "E" },
  { code: "ECU", name: "Ecuador", group: "E" },
  // Group F
  { code: "NED", name: "Niederlande", group: "F" },
  { code: "JPN", name: "Japan", group: "F" },
  { code: "SWE", name: "Schweden", group: "F" },
  { code: "TUN", name: "Tunesien", group: "F" },
  // Group G
  { code: "BEL", name: "Belgien", group: "G" },
  { code: "EGY", name: "Ägypten", group: "G" },
  { code: "IRN", name: "Iran", group: "G" },
  { code: "NZL", name: "Neuseeland", group: "G" },
  // Group H
  { code: "ESP", name: "Spanien", group: "H" },
  { code: "CPV", name: "Kap Verde", group: "H" },
  { code: "SAU", name: "Saudi-Arabien", group: "H" },
  { code: "URU", name: "Uruguay", group: "H" },
  // Group I
  { code: "FRA", name: "Frankreich", group: "I" },
  { code: "SEN", name: "Senegal", group: "I" },
  { code: "IRQ", name: "Irak", group: "I" },
  { code: "NOR", name: "Norwegen", group: "I" },
  // Group J
  { code: "ARG", name: "Argentinien", group: "J" },
  { code: "ALG", name: "Algerien", group: "J" },
  { code: "AUT", name: "Österreich", group: "J" },
  { code: "JOR", name: "Jordanien", group: "J" },
  // Group K
  { code: "POR", name: "Portugal", group: "K" },
  { code: "COD", name: "DR Kongo", group: "K" },
  { code: "UZB", name: "Usbekistan", group: "K" },
  { code: "COL", name: "Kolumbien", group: "K" },
  // Group L
  { code: "ENG", name: "England", group: "L" },
  { code: "CRO", name: "Kroatien", group: "L" },
  { code: "GHA", name: "Ghana", group: "L" },
  { code: "PAN", name: "Panama", group: "L" },
];

// 72 group-stage matches. `kickoffAt` is UTC (offsets pre-applied from local times).
type SeedMatch = {
  group: string;
  homeCode: string;
  awayCode: string;
  kickoffAt: string;
};

const groupMatches: SeedMatch[] = [
  // Group A — host Mexico opens at Estadio Azteca; final-round games kick off simultaneously
  { group: "A", homeCode: "MEX", awayCode: "RSA", kickoffAt: "2026-06-11T19:00:00Z" },
  { group: "A", homeCode: "KOR", awayCode: "CZE", kickoffAt: "2026-06-12T02:00:00Z" },
  { group: "A", homeCode: "CZE", awayCode: "RSA", kickoffAt: "2026-06-18T16:00:00Z" },
  { group: "A", homeCode: "MEX", awayCode: "KOR", kickoffAt: "2026-06-19T01:00:00Z" },
  { group: "A", homeCode: "CZE", awayCode: "MEX", kickoffAt: "2026-06-25T01:00:00Z" },
  { group: "A", homeCode: "RSA", awayCode: "KOR", kickoffAt: "2026-06-25T01:00:00Z" },

  // Group B
  { group: "B", homeCode: "CAN", awayCode: "BIH", kickoffAt: "2026-06-12T19:00:00Z" },
  { group: "B", homeCode: "QAT", awayCode: "SUI", kickoffAt: "2026-06-13T19:00:00Z" },
  { group: "B", homeCode: "SUI", awayCode: "BIH", kickoffAt: "2026-06-18T19:00:00Z" },
  { group: "B", homeCode: "CAN", awayCode: "QAT", kickoffAt: "2026-06-18T22:00:00Z" },
  { group: "B", homeCode: "SUI", awayCode: "CAN", kickoffAt: "2026-06-24T19:00:00Z" },
  { group: "B", homeCode: "BIH", awayCode: "QAT", kickoffAt: "2026-06-24T19:00:00Z" },

  // Group C
  { group: "C", homeCode: "BRA", awayCode: "MAR", kickoffAt: "2026-06-13T22:00:00Z" },
  { group: "C", homeCode: "HAI", awayCode: "SCO", kickoffAt: "2026-06-14T01:00:00Z" },
  { group: "C", homeCode: "SCO", awayCode: "MAR", kickoffAt: "2026-06-19T22:00:00Z" },
  { group: "C", homeCode: "BRA", awayCode: "HAI", kickoffAt: "2026-06-20T00:30:00Z" },
  { group: "C", homeCode: "SCO", awayCode: "BRA", kickoffAt: "2026-06-24T22:00:00Z" },
  { group: "C", homeCode: "MAR", awayCode: "HAI", kickoffAt: "2026-06-24T22:00:00Z" },

  // Group D
  { group: "D", homeCode: "USA", awayCode: "PAR", kickoffAt: "2026-06-13T01:00:00Z" },
  { group: "D", homeCode: "AUS", awayCode: "TUR", kickoffAt: "2026-06-14T04:00:00Z" },
  { group: "D", homeCode: "USA", awayCode: "AUS", kickoffAt: "2026-06-19T19:00:00Z" },
  { group: "D", homeCode: "TUR", awayCode: "PAR", kickoffAt: "2026-06-20T03:00:00Z" },
  { group: "D", homeCode: "TUR", awayCode: "USA", kickoffAt: "2026-06-26T02:00:00Z" },
  { group: "D", homeCode: "PAR", awayCode: "AUS", kickoffAt: "2026-06-26T02:00:00Z" },

  // Group E
  { group: "E", homeCode: "GER", awayCode: "CUW", kickoffAt: "2026-06-14T17:00:00Z" },
  { group: "E", homeCode: "CIV", awayCode: "ECU", kickoffAt: "2026-06-14T23:00:00Z" },
  { group: "E", homeCode: "GER", awayCode: "CIV", kickoffAt: "2026-06-20T20:00:00Z" },
  { group: "E", homeCode: "ECU", awayCode: "CUW", kickoffAt: "2026-06-21T00:00:00Z" },
  { group: "E", homeCode: "CUW", awayCode: "CIV", kickoffAt: "2026-06-25T20:00:00Z" },
  { group: "E", homeCode: "ECU", awayCode: "GER", kickoffAt: "2026-06-25T20:00:00Z" },

  // Group F
  { group: "F", homeCode: "NED", awayCode: "JPN", kickoffAt: "2026-06-14T20:00:00Z" },
  { group: "F", homeCode: "SWE", awayCode: "TUN", kickoffAt: "2026-06-15T02:00:00Z" },
  { group: "F", homeCode: "NED", awayCode: "SWE", kickoffAt: "2026-06-20T17:00:00Z" },
  { group: "F", homeCode: "TUN", awayCode: "JPN", kickoffAt: "2026-06-21T04:00:00Z" },
  { group: "F", homeCode: "JPN", awayCode: "SWE", kickoffAt: "2026-06-25T23:00:00Z" },
  { group: "F", homeCode: "TUN", awayCode: "NED", kickoffAt: "2026-06-25T23:00:00Z" },

  // Group G
  { group: "G", homeCode: "BEL", awayCode: "EGY", kickoffAt: "2026-06-15T19:00:00Z" },
  { group: "G", homeCode: "IRN", awayCode: "NZL", kickoffAt: "2026-06-16T01:00:00Z" },
  { group: "G", homeCode: "BEL", awayCode: "IRN", kickoffAt: "2026-06-21T19:00:00Z" },
  { group: "G", homeCode: "NZL", awayCode: "EGY", kickoffAt: "2026-06-22T01:00:00Z" },
  { group: "G", homeCode: "EGY", awayCode: "IRN", kickoffAt: "2026-06-27T03:00:00Z" },
  { group: "G", homeCode: "NZL", awayCode: "BEL", kickoffAt: "2026-06-27T03:00:00Z" },

  // Group H
  { group: "H", homeCode: "ESP", awayCode: "CPV", kickoffAt: "2026-06-15T16:00:00Z" },
  { group: "H", homeCode: "SAU", awayCode: "URU", kickoffAt: "2026-06-15T22:00:00Z" },
  { group: "H", homeCode: "ESP", awayCode: "SAU", kickoffAt: "2026-06-21T16:00:00Z" },
  { group: "H", homeCode: "URU", awayCode: "CPV", kickoffAt: "2026-06-21T22:00:00Z" },
  { group: "H", homeCode: "CPV", awayCode: "SAU", kickoffAt: "2026-06-27T00:00:00Z" },
  { group: "H", homeCode: "URU", awayCode: "ESP", kickoffAt: "2026-06-27T00:00:00Z" },

  // Group I
  { group: "I", homeCode: "FRA", awayCode: "SEN", kickoffAt: "2026-06-16T19:00:00Z" },
  { group: "I", homeCode: "IRQ", awayCode: "NOR", kickoffAt: "2026-06-16T22:00:00Z" },
  { group: "I", homeCode: "FRA", awayCode: "IRQ", kickoffAt: "2026-06-22T21:00:00Z" },
  { group: "I", homeCode: "NOR", awayCode: "SEN", kickoffAt: "2026-06-23T00:00:00Z" },
  { group: "I", homeCode: "NOR", awayCode: "FRA", kickoffAt: "2026-06-26T19:00:00Z" },
  { group: "I", homeCode: "SEN", awayCode: "IRQ", kickoffAt: "2026-06-26T19:00:00Z" },

  // Group J
  { group: "J", homeCode: "ARG", awayCode: "ALG", kickoffAt: "2026-06-17T01:00:00Z" },
  { group: "J", homeCode: "AUT", awayCode: "JOR", kickoffAt: "2026-06-17T04:00:00Z" },
  { group: "J", homeCode: "ARG", awayCode: "AUT", kickoffAt: "2026-06-22T17:00:00Z" },
  { group: "J", homeCode: "JOR", awayCode: "ALG", kickoffAt: "2026-06-23T03:00:00Z" },
  { group: "J", homeCode: "ALG", awayCode: "AUT", kickoffAt: "2026-06-28T02:00:00Z" },
  { group: "J", homeCode: "JOR", awayCode: "ARG", kickoffAt: "2026-06-28T02:00:00Z" },

  // Group K
  { group: "K", homeCode: "POR", awayCode: "COD", kickoffAt: "2026-06-17T17:00:00Z" },
  { group: "K", homeCode: "UZB", awayCode: "COL", kickoffAt: "2026-06-18T02:00:00Z" },
  { group: "K", homeCode: "POR", awayCode: "UZB", kickoffAt: "2026-06-23T17:00:00Z" },
  { group: "K", homeCode: "COL", awayCode: "COD", kickoffAt: "2026-06-24T02:00:00Z" },
  { group: "K", homeCode: "COL", awayCode: "POR", kickoffAt: "2026-06-27T23:30:00Z" },
  { group: "K", homeCode: "COD", awayCode: "UZB", kickoffAt: "2026-06-27T23:30:00Z" },

  // Group L
  { group: "L", homeCode: "ENG", awayCode: "CRO", kickoffAt: "2026-06-17T20:00:00Z" },
  { group: "L", homeCode: "GHA", awayCode: "PAN", kickoffAt: "2026-06-17T23:00:00Z" },
  { group: "L", homeCode: "ENG", awayCode: "GHA", kickoffAt: "2026-06-23T20:00:00Z" },
  { group: "L", homeCode: "PAN", awayCode: "CRO", kickoffAt: "2026-06-23T23:00:00Z" },
  { group: "L", homeCode: "PAN", awayCode: "ENG", kickoffAt: "2026-06-27T21:00:00Z" },
  { group: "L", homeCode: "CRO", awayCode: "GHA", kickoffAt: "2026-06-27T21:00:00Z" },
];

async function main() {
  // Wipe fixture data so the seed is the single source of truth. Tip rows cascade
  // when their match is deleted; ChampionTip references Team, so it has to go first.
  await prisma.championTip.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.team.deleteMany({});

  await prisma.team.createMany({ data: teams });
  const teamByCode = new Map(
    (await prisma.team.findMany()).map((t) => [t.code, t]),
  );

  await prisma.match.createMany({
    data: groupMatches.map((m) => {
      const home = teamByCode.get(m.homeCode);
      const away = teamByCode.get(m.awayCode);
      if (!home || !away) {
        throw new Error(
          `Unknown team code in seed: ${m.homeCode} or ${m.awayCode}`,
        );
      }
      return {
        stage: Stage.GROUP,
        group: m.group,
        kickoffAt: new Date(m.kickoffAt),
        homeTeamId: home.id,
        awayTeamId: away.id,
      };
    }),
  });

  // Admin user (idempotent upsert — keeps the password fresh if env vars change).
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "changeme";
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { isAdmin: true },
    create: {
      email: adminEmail,
      name: "Admin",
      passwordHash,
      isAdmin: true,
    },
  });

  console.log(
    `Seeded ${teams.length} teams, ${groupMatches.length} matches, admin ${adminEmail}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
