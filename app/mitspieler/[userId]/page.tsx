import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/app/_components/Avatar";
import { flagFor } from "@/lib/flags";

// Next.js 16: dynamische Route-Params sind asynchron.
type PageProps = { params: Promise<{ userId: string }> };

export default async function MitspielerPage({ params }: PageProps) {
  const { userId } = await params;
  const session = await auth();
  const meId = session?.user?.id;

  const [user, championTip, scoredTips, firstKickoffAgg] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatarUpdatedAt: true },
    }),
    prisma.championTip.findUnique({
      where: { userId },
      include: {
        team: { select: { code: true, name: true, group: true } },
      },
    }),
    prisma.tip.findMany({
      where: { userId, points: { not: null } },
      orderBy: { match: { kickoffAt: "asc" } },
      select: {
        homeScore: true,
        awayScore: true,
        points: true,
        match: {
          select: {
            id: true,
            kickoffAt: true,
            group: true,
            homeScore: true,
            awayScore: true,
            homeTeam: { select: { code: true, name: true } },
            awayTeam: { select: { code: true, name: true } },
          },
        },
      },
    }),
    prisma.match.aggregate({ _min: { kickoffAt: true } }),
  ]);

  if (!user) notFound();

  // Sichtbarkeit fremder WM-Tipps wie in /tabelle: erst ab Anpfiff des ersten Spiels.
  const firstKickoff = firstKickoffAgg._min.kickoffAt;
  const picksRevealed =
    !!firstKickoff && firstKickoff.getTime() <= Date.now();
  const isMe = user.id === meId;
  const showChampion = picksRevealed || isMe;

  const tipPoints = scoredTips.reduce((s, t) => s + (t.points ?? 0), 0);
  const championPoints = championTip?.points ?? 0;
  const total = tipPoints + championPoints;

  const avatarVersion = user.avatarUpdatedAt?.toISOString() ?? null;
  const championTeam = championTip?.team ?? null;
  const championFlag = championTeam ? flagFor(championTeam.code) : "";

  return (
    <main className="flex-1 flex flex-col items-center px-5 py-8 bg-gradient-to-b from-[#0a1f44] to-[#142a5c] text-white">
      <div className="w-full max-w-md flex flex-col gap-6">
        <header className="sticky top-0 z-20 -mx-5 px-5 py-3 flex items-center justify-between border-b border-white/10 bg-[#0a1f44]/90 backdrop-blur">
          <h1 className="text-2xl font-bold truncate">{user.name}</h1>
          <Link
            href="/tabelle"
            className="text-sm font-medium px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 transition-colors shrink-0 ml-3"
          >
            ← Zurück
          </Link>
        </header>

        <section className="flex flex-col items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-6">
          <Avatar
            userId={user.id}
            name={user.name}
            version={avatarVersion}
            size={128}
          />
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">
            Gesamt
          </p>
          <p className="text-4xl font-bold tabular-nums">{total}</p>
          <p className="text-xs text-white/55">
            {scoredTips.length}{" "}
            {scoredTips.length === 1 ? "Tipp gewertet" : "Tipps gewertet"}
            {championPoints > 0 && (
              <span className="ml-2 text-emerald-300">
                + {championPoints} WM-Tipp
              </span>
            )}
          </p>
        </section>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">
            Weltmeister-Tipp
          </p>
          {!showChampion ? (
            <p className="text-white/65 text-sm">
              Wird ab Anpfiff des ersten Spiels sichtbar.
            </p>
          ) : championTeam ? (
            <>
              <p className="text-xl font-bold">
                {championFlag && (
                  <span className="mr-2">{championFlag}</span>
                )}
                {championTeam.name}
              </p>
              <p className="text-xs text-white/55">
                {championTeam.code}
                {championTeam.group ? ` · Gruppe ${championTeam.group}` : ""}
              </p>
              {championTip?.points != null && (
                <p className="mt-1 text-emerald-300 font-semibold">
                  {championTip.points} Punkte
                </p>
              )}
            </>
          ) : (
            <p className="text-white/65 text-sm">Kein WM-Tipp abgegeben.</p>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm uppercase tracking-[0.2em] text-white/70 px-1">
            Gewertete Tipps
          </h2>
          {scoredTips.length === 0 ? (
            <p className="text-white/65 text-sm rounded-2xl bg-white/5 border border-white/10 p-4">
              Noch keine gewerteten Tipps.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {scoredTips.map((t) => (
                <li
                  key={t.match.id}
                  className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>
                      {t.match.group ? `Gruppe ${t.match.group} · ` : ""}
                      {formatDay(t.match.kickoffAt)}
                    </span>
                    <span className="text-emerald-300 font-semibold tabular-nums">
                      {t.points} Pkt
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate text-right">
                      {flagFor(t.match.homeTeam.code) && (
                        <span className="mr-1">
                          {flagFor(t.match.homeTeam.code)}
                        </span>
                      )}
                      {t.match.homeTeam.code}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {t.match.homeScore}:{t.match.awayScore}
                    </span>
                    <span className="flex-1 truncate">
                      {t.match.awayTeam.code}
                      {flagFor(t.match.awayTeam.code) && (
                        <span className="ml-1">
                          {flagFor(t.match.awayTeam.code)}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="text-xs text-white/60">
                    Tipp:{" "}
                    <span className="text-white/90 font-medium tabular-nums">
                      {t.homeScore}:{t.awayScore}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

const dayFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

function formatDay(d: Date) {
  return dayFormatter.format(d);
}
