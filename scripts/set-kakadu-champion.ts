import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const kakadus = await prisma.user.findMany({
    where: { name: { contains: "kakadu", mode: "insensitive" } },
    select: { id: true, name: true, email: true },
  });
  console.log("Kakadu-Kandidaten:", kakadus);
  if (kakadus.length !== 1) {
    console.error(`Erwartet genau 1 Kakadu, gefunden: ${kakadus.length}. Abbruch.`);
    await prisma.$disconnect();
    process.exit(1);
  }
  const kakadu = kakadus[0];

  const austria = await prisma.team.findUnique({
    where: { code: "AUT" },
    select: { id: true, name: true, code: true },
  });
  if (!austria) {
    console.error("Österreich (code AUT) nicht gefunden. Abbruch.");
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log("Österreich:", austria);

  const saved = await prisma.championTip.upsert({
    where: { userId: kakadu.id },
    update: { teamId: austria.id, points: null },
    create: { userId: kakadu.id, teamId: austria.id },
  });
  console.log("Gespeichert:", saved);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
