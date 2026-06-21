import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logoutAction } from "./actions";
import { ExitGuard } from "./ExitGuard";

// Server component — middleware guarantees `session` is non-null on this route.
export default async function DashboardPage() {
  const session = await auth();
  const isAdmin = session?.user?.isAdmin ?? false;
  // Namen aus der DB lesen, damit ein Update auf /profil sofort sichtbar ist
  // (das JWT-Token wird erst beim nächsten Login aktualisiert).
  const userId = session?.user?.id;
  const dbUser = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      })
    : null;
  const name = dbUser?.name ?? session?.user?.name ?? "Tipp-Champion";

  return (
    <main className="flex-1 flex flex-col items-center px-5 py-10 bg-gradient-to-b from-[#0a1f44] to-[#142a5c] text-white">
      <ExitGuard />
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="flex justify-center">
          <Image
            src="/tipp-app-logo.png"
            alt="WM-Tipp Maskottchen"
            width={450}
            height={600}
            priority
            className="w-full max-w-xs h-auto rounded-2xl"
          />
        </div>

        <header>
          <p className="text-sm text-white/60">Hallo</p>
          <h1 className="text-2xl font-bold">{name}</h1>
        </header>

        <nav className="flex flex-col gap-3">
          <Link
            href="/tipps"
            className="h-12 rounded-full bg-emerald-400 text-[#0a1f44] font-semibold flex items-center justify-center"
          >
            Tipps
          </Link>
          <Link
            href="/tabelle"
            className="h-12 rounded-full bg-white/5 border border-white/15 text-white/80 font-medium flex items-center justify-center"
          >
            Tabelle
          </Link>
          <Link
            href="/gruppen"
            className="h-12 rounded-full bg-white/5 border border-white/15 text-white/80 font-medium flex items-center justify-center"
          >
            Gruppenübersicht
          </Link>
          <Link
            href="/profil"
            className="h-12 rounded-full bg-white/5 border border-white/15 text-white/80 font-medium flex items-center justify-center"
          >
            Profil
          </Link>
          <Link
            href="/wm-tipp"
            className="h-12 rounded-full bg-white/5 border border-white/15 text-white/80 font-medium flex items-center justify-center"
          >
            Weltmeister tippen
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="h-12 rounded-full bg-white/5 border border-emerald-300/30 text-emerald-200 font-medium flex items-center justify-center"
            >
              Admin: Ergebnisse
            </Link>
          )}
        </nav>

        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full h-12 rounded-full border border-white/30 font-medium"
          >
            Abmelden
          </button>
        </form>
      </div>
    </main>
  );
}
