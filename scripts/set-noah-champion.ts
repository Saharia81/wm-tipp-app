import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const noahs = await prisma.user.findMany({
    where: { name: { contains: "Noah", mode: "insensitive" } },
    select: { id: true, name: true, email: true },
  });
  console.log("Noah-Kandidaten:", noahs);
  if (noahs.length !== 1) {
    console.error(`Erwartet genau 1 Noah, gefunden: ${noahs.length}. Abbruch.`);
    await prisma.$disconnect();
    process.exit(1);
  }
  const noah = noahs[0];

  const portugal = await prisma.team.findUnique({
    where: { code: "POR" },
    select: { id: true, name: true, code: true },
  });
  if (!portugal) {
    console.error("Portugal (code POR) nicht gefunden. Abbruch.");
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log("Portugal:", portugal);

  const existing = await prisma.championTip.findUnique({
    where: { userId: noah.id },
    select: { id: true, teamId: true },
  });
  if (existing) {
    console.error(`Noah hat schon einen WM-Tipp (teamId=${existing.teamId}). Abbruch, manuell prüfen.`);
    await prisma.$disconnect();
    process.exit(1);
  }

  const created = await prisma.championTip.create({
    data: { userId: noah.id, teamId: portugal.id },
  });
  console.log("Angelegt:", created);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
