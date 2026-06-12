import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MatchCard, type MatchCardProps } from "./_components/MatchCard";

export default async function TippsPage() {
  const session = await auth();
  // Middleware already gates this route; the `!` is safe.
  const userId = session!.user.id;

  // Fetch matches + this user's tips in one round trip.
  const matches = await prisma.match.findMany({
    orderBy: { kickoffAt: "asc" },
    include: {
      homeTeam: { select: { code: true, name: true } },
      awayTeam: { select: { code: true, name: true } },
      tips: {
        where: { userId },
        select: { homeScore: true, awayScore: true, points: true },
        take: 1,
      },
    },
  });

  const now = Date.now();
  const groups = groupByDay(matches, now);

  return (
    <main className="flex-1 flex flex-col items-center px-5 py-8 bg-gradient-to-b from-[#0a1f44] to-[#142a5c] text-white">
      <div className="w-full max-w-md flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tipps</h1>
          <Link href="/dashboard" className="text-sm text-white/70">
            ← Zurück
          </Link>
        </header>

        {matches.length === 0 && (
          <p className="text-white/70 text-sm">
            Noch keine Spiele eingespeist. Frag den Admin.
          </p>
        )}

        {groups.map(({ dayLabel, items, openCount }) => (
          <details
            key={dayLabel}
            className="group rounded-2xl bg-white/[0.02] border border-white/10"
          >
            <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <div className="flex flex-col gap-1 min-w-0">
                <h2 className="text-sm uppercase tracking-[0.2em] text-white/70">
                  {dayLabel}
                </h2>
                <span className="text-xs text-white/50">
                  {items.length} {items.length === 1 ? "Spiel" : "Spiele"}
                  {openCount > 0 && (
                    <>
                      {" · "}
                      <span className="text-emerald-300 font-medium">
                        {openCount} offen
                      </span>
                    </>
                  )}
                </span>
              </div>
              <span
                className="text-white/50 transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              >
                ▾
              </span>
            </summary>
            <div className="flex flex-col gap-3 px-4 pb-4 pt-1">
              {items.map((m) => {
                const tip = m.tips[0] ?? null;
                const locked = m.kickoffAt.getTime() <= now;
                const props: MatchCardProps = {
                  match: {
                    id: m.id,
                    group: m.group,
                    kickoffAt: m.kickoffAt.toISOString(),
                    homeTeam: m.homeTeam,
                    awayTeam: m.awayTeam,
                    homeScore: m.homeScore,
                    awayScore: m.awayScore,
                  },
                  tip,
                  locked,
                };
                return <MatchCard key={m.id} {...props} />;
              })}
            </div>
          </details>
        ))}
      </div>
    </main>
  );
}

const dayFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

function groupByDay<
  T extends { kickoffAt: Date; tips: { homeScore: number }[] },
>(items: T[], now: number) {
  const map = new Map<
    string,
    { dayLabel: string; items: T[]; openCount: number }
  >();
  for (const it of items) {
    const key = it.kickoffAt.toISOString().slice(0, 10);
    const dayLabel = dayFormatter.format(it.kickoffAt);
    const isOpen = it.kickoffAt.getTime() > now && it.tips.length === 0;
    const existing = map.get(key);
    if (existing) {
      existing.items.push(it);
      if (isOpen) existing.openCount += 1;
    } else {
      map.set(key, { dayLabel, items: [it], openCount: isOpen ? 1 : 0 });
    }
  }
  return [...map.values()];
}
