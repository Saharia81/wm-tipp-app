import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MatchCard, type MatchCardProps } from "./_components/MatchCard";

export default async function TippsPage() {
  const session = await auth();
  // Middleware already gates this route; the `!` is safe.
  const userId = session!.user.id;

  // Fetch matches + ALL tips (with user info) in one round trip. Fremde Tipps
  // werden vor Anpfiff unten serverseitig herausgefiltert, bevor sie an den
  // Client gehen.
  const matches = await prisma.match.findMany({
    orderBy: { kickoffAt: "asc" },
    include: {
      homeTeam: { select: { code: true, name: true } },
      awayTeam: { select: { code: true, name: true } },
      tips: {
        select: {
          userId: true,
          homeScore: true,
          awayScore: true,
          points: true,
          user: {
            select: { id: true, name: true, avatarUpdatedAt: true },
          },
        },
      },
    },
  });

  const now = Date.now();
  const groups = groupByDay(matches, now, userId);

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

        {groups.map(({ dayLabel, items, openCount, isFuture }) => (
          <details
            key={dayLabel}
            open={isFuture}
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
                const own = m.tips.find((t) => t.userId === userId) ?? null;
                const tip = own
                  ? {
                      homeScore: own.homeScore,
                      awayScore: own.awayScore,
                      points: own.points,
                    }
                  : null;
                const locked = m.kickoffAt.getTime() <= now;
                // Fremde Tipps erst nach Anpfiff freigeben — vorher leeres Array,
                // damit nichts an den Client geschickt wird.
                const otherTips = locked
                  ? m.tips
                      .filter((t) => t.userId !== userId)
                      .map((t) => ({
                        userId: t.userId,
                        userName: t.user.name,
                        avatarVersion:
                          t.user.avatarUpdatedAt?.toISOString() ?? null,
                        homeScore: t.homeScore,
                        awayScore: t.awayScore,
                        points: t.points,
                      }))
                      .sort((a, b) => {
                        const pa = a.points ?? -1;
                        const pb = b.points ?? -1;
                        if (pa !== pb) return pb - pa;
                        return a.userName.localeCompare(b.userName, "de");
                      })
                  : [];
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
                  otherTips,
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

function groupByDay<T extends { kickoffAt: Date; tips: { userId: string }[] }>(
  items: T[],
  now: number,
  userId: string,
) {
  const map = new Map<
    string,
    { dayLabel: string; items: T[]; openCount: number; isFuture: boolean }
  >();
  for (const it of items) {
    const key = it.kickoffAt.toISOString().slice(0, 10);
    const dayLabel = dayFormatter.format(it.kickoffAt);
    const hasOwnTip = it.tips.some((t) => t.userId === userId);
    const isUpcoming = it.kickoffAt.getTime() > now;
    const isOpen = isUpcoming && !hasOwnTip;
    const existing = map.get(key);
    if (existing) {
      existing.items.push(it);
      if (isOpen) existing.openCount += 1;
      if (isUpcoming) existing.isFuture = true;
    } else {
      map.set(key, {
        dayLabel,
        items: [it],
        openCount: isOpen ? 1 : 0,
        isFuture: isUpcoming,
      });
    }
  }
  return [...map.values()];
}
