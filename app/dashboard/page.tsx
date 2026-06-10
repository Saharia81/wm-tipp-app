import Link from "next/link";
import { auth } from "@/auth";
import { logoutAction } from "./actions";

// Server component — middleware guarantees `session` is non-null on this route.
export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? "Tipp-Champion";
  const isAdmin = session?.user?.isAdmin ?? false;

  return (
    <main className="flex-1 flex flex-col items-center px-5 py-10 bg-gradient-to-b from-[#0a1f44] to-[#142a5c] text-white">
      <div className="w-full max-w-md flex flex-col gap-6">
        <header>
          <p className="text-sm text-white/60">Hallo</p>
          <h1 className="text-2xl font-bold">{name}</h1>
        </header>

        <nav className="flex flex-col gap-3">
          <Link
            href="/tipps"
            className="h-12 rounded-full bg-emerald-400 text-[#0a1f44] font-semibold flex items-center justify-center"
          >
            Tipps abgeben
          </Link>
          <Link
            href="/wm-tipp"
            className="h-12 rounded-full bg-white/5 border border-white/15 text-white/80 font-medium flex items-center justify-center"
          >
            Weltmeister tippen
          </Link>
          <Link
            href="/tabelle"
            className="h-12 rounded-full bg-white/5 border border-white/15 text-white/80 font-medium flex items-center justify-center"
          >
            Tabelle
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
