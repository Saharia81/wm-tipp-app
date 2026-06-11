import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/app/_components/Avatar";

type Row = {
  id: string;
  name: string;
  avatarVersion: string | null;
  total: number;
  scored: number;
  tipped: number;
  championPoints: number;
};

export default async function TabellePage() {
  const session = await auth();
  const meId = session?.user?.id;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      // Nur den Timestamp lesen, NICHT die Bytes — Avatare lädt der Browser
      // separat über /api/avatar/[userId].
      avatarUpdatedAt: true,
      tips: { select: { points: true } },
      championTip: { select: { points: true } },
    },
  });

  const rows: Row[] = users
    .map((u) => {
      const tipSum = u.tips.reduce((s, t) => s + (t.points ?? 0), 0);
      const championPoints = u.championTip?.points ?? 0;
      const scored = u.tips.filter((t) => t.points !== null).length;
      return {
        id: u.id,
        name: u.name,
        avatarVersion: u.avatarUpdatedAt?.toISOString() ?? null,
        total: tipSum + championPoints,
        scored,
        tipped: u.tips.length,
        championPoints,
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "de"));

  // Competition ranking: ties share the lower rank, next rank skips. (1, 2, 2, 4)
  const ranked = rows.map((row, idx) => {
    let rank = idx + 1;
    if (idx > 0 && rows[idx - 1].total === row.total) {
      // find the first row with this total
      let first = idx - 1;
      while (first > 0 && rows[first - 1].total === row.total) first--;
      rank = first + 1;
    }
    return { ...row, rank };
  });

  return (
    <main className="flex-1 flex flex-col items-center px-5 py-8 bg-gradient-to-b from-[#0a1f44] to-[#142a5c] text-white">
      <div className="w-full max-w-md flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tabelle</h1>
          <Link href="/dashboard" className="text-sm text-white/70">
            ← Zurück
          </Link>
        </header>

        {ranked.length === 0 ? (
          <p className="text-white/70 text-sm">
            Noch keine Tipper registriert.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ranked.map((row) => {
              const isMe = row.id === meId;
              return (
                <li
                  key={row.id}
                  className={
                    "rounded-2xl p-4 flex items-center gap-3 " +
                    (isMe
                      ? "bg-emerald-400/15 border border-emerald-300/50"
                      : "bg-white/5 border border-white/10")
                  }
                >
                  <div className="w-8 text-right text-lg font-semibold text-white/80">
                    {row.rank}.
                  </div>
                  <Avatar
                    userId={row.id}
                    name={row.name}
                    version={row.avatarVersion}
                    size={40}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {row.name}
                      {isMe && (
                        <span className="ml-2 text-xs text-emerald-300">
                          du
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/55">
                      {row.scored}/{row.tipped} Tipps gewertet
                      {row.championPoints > 0 && (
                        <span className="ml-2 text-emerald-300">
                          + {row.championPoints} WM-Tipp
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-2xl font-bold tabular-nums">
                    {row.total}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-center text-xs text-white/40">
          Punkte: 4 exakt · 3 Sieger + Tordiff · 2 Sieger · 10 Weltmeister
        </p>
      </div>
    </main>
  );
}
