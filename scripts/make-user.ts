import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const passwordHash = await bcrypt.hash("test1234", 10);
  await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: { passwordHash, isAdmin: false },
    create: { email: "alice@example.com", name: "Alice", passwordHash, isAdmin: false },
  });
  console.log("Created/updated alice@example.com");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
