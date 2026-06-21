import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { flagFor } from "@/lib/flags";
import { ChampionPicker, type Team } from "./_components/ChampionPicker";

const deadlineFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function WmTippPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [teams, existing, firstKickoffAgg] = await Promise.all([
    prisma.team.findMany({
      select: { id: true, code: true, name: true, group: true },
      orderBy: [{ group: "asc" }, { name: "asc" }],
    }),
    prisma.championTip.findUnique({
      where: { userId },
      include: { team: { select: { id: true, code: true, name: true, group: true } } },
    }),
    prisma.match.aggregate({ _min: { kickoffAt: true } }),
  ]);

  const firstKickoff = firstKickoffAgg._min.kickoffAt;
  const locked = !!firstKickoff && firstKickoff.getTime() <= Date.now();

  return (
    <main className="flex-1 flex flex-col items-center px-5 py-8 bg-gradient-to-b from-[#0a1f44] to-[#142a5c] text-white">
      <div className="w-full max-w-md flex flex-col gap-6">
        <header className="sticky top-0 z-20 -mx-5 px-5 py-3 flex items-center justify-between border-b border-white/10 bg-[#0a1f44]/90 backdrop-blur">
          <h1 className="text-2xl font-bold">Weltmeister</h1>
          <Link href="/dashboard" className="text-sm text-white/70">
            ← Zurück
          </Link>
        </header>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-white/85">
          <p>
            Tipp das Team, das die WM 2026 gewinnt — gibt{" "}
            <span className="text-emerald-300 font-semibold">10 Punkte</span>{" "}
            wenn's stimmt.
          </p>
          {firstKickoff && !locked && (
            <p className="mt-2 text-white/65">
              Deadline: {deadlineFormatter.format(firstKickoff)} (Anpfiff des
              ersten Spiels).
            </p>
          )}
          {locked && (
            <p className="mt-2 text-amber-300">
              Deadline vorbei. Dein Tipp ist gesperrt.
            </p>
          )}
        </section>

        {locked ? (
          <LockedView pick={existing?.team ?? null} points={existing?.points ?? null} />
        ) : teams.length === 0 ? (
          <p className="text-white/70 text-sm">
            Noch keine Teams im System. Frag den Admin.
          </p>
        ) : (
          <ChampionPicker
            teams={teams as Team[]}
            initialPickId={existing?.teamId ?? null}
          />
        )}
      </div>
    </main>
  );
}

function LockedView({
  pick,
  points,
}: {
  pick: { name: string; code: string; group: string | null } | null;
  points: number | null;
}) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col gap-2">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">
        Dein Tipp
      </p>
      {pick ? (
        <>
          <p className="text-xl font-bold">
            {flagFor(pick.code) && (
              <span className="mr-2">{flagFor(pick.code)}</span>
            )}
            {pick.name}
          </p>
          <p className="text-xs text-white/55">
            {pick.code}
            {pick.group ? ` · Gruppe ${pick.group}` : ""}
          </p>
          {points != null && (
            <p className="mt-2 text-emerald-300 font-semibold">
              {points} Punkte
            </p>
          )}
        </>
      ) : (
        <p className="text-white/65">Kein WM-Tipp abgegeben.</p>
      )}
    </div>
  );
}
