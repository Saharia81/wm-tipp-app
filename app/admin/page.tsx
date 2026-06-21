import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ResultRow, type ResultRowProps } from "./_components/ResultRow";
import { SyncButton } from "./_components/SyncButton";
import { CreateMatchForm } from "./_components/CreateMatchForm";

export default async function AdminPage() {
  const session = await auth();
  // Middleware ensures the user is logged in; here we additionally gate on admin.
  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  const [matches, teams] = await Promise.all([
    prisma.match.findMany({
      orderBy: { kickoffAt: "asc" },
      include: {
        homeTeam: { select: { code: true, name: true } },
        awayTeam: { select: { code: true, name: true } },
        _count: { select: { tips: true } },
      },
    }),
    prisma.team.findMany({
      select: { id: true, code: true, name: true, group: true },
    }),
  ]);

  // Split for the admin workflow: matches that NEED a result first, then already-entered
  // (so they can be corrected), then upcoming. Mixing past+future under one "open"
  // bucket made it look like past matches were missing.
  const now = Date.now();
  const pending = matches
    .filter((m) => m.homeScore === null && m.kickoffAt.getTime() <= now)
    .sort((a, b) => b.kickoffAt.getTime() - a.kickoffAt.getTime()); // most recently played first
  const entered = matches
    .filter((m) => m.homeScore !== null)
    .sort((a, b) => b.kickoffAt.getTime() - a.kickoffAt.getTime());
  const upcoming = matches.filter(
    (m) => m.homeScore === null && m.kickoffAt.getTime() > now,
  ); // already asc

  return (
    <main className="flex-1 flex flex-col items-center px-5 py-8 bg-gradient-to-b from-[#0a1f44] to-[#142a5c] text-white">
      <div className="w-full max-w-md flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin · Ergebnisse</h1>
          <Link href="/dashboard" className="text-sm text-white/70">
            ← Zurück
          </Link>
        </header>

        <SyncButton />

        <CreateMatchForm teams={teams} />

        <Section
          title={`Ergebnis fehlt (${pending.length})`}
          matches={pending}
          emptyText="Alle ausgetragenen Spiele sind erfasst 🎉"
          tone="urgent"
        />

        <Section
          title={`Bereits erfasst (${entered.length})`}
          matches={entered}
          emptyText="Noch keine Ergebnisse erfasst."
        />

        <Section
          title={`Demnächst (${upcoming.length})`}
          matches={upcoming}
          emptyText="Keine kommenden Spiele."
        />
      </div>
    </main>
  );
}

function Section({
  title,
  matches,
  emptyText,
  tone,
}: {
  title: string;
  matches: (Parameters<typeof toRowProps>[0])[];
  emptyText: string;
  tone?: "urgent";
}) {
  const titleClass =
    tone === "urgent"
      ? "text-sm uppercase tracking-[0.2em] text-amber-300"
      : "text-sm uppercase tracking-[0.2em] text-white/50";
  return (
    <section className="flex flex-col gap-3">
      <h2 className={titleClass}>{title}</h2>
      {matches.length === 0 ? (
        <p className="text-white/60 text-sm">{emptyText}</p>
      ) : (
        matches.map((m) => <ResultRow key={m.id} match={toRowProps(m)} />)
      )}
    </section>
  );
}

function toRowProps(m: {
  id: string;
  stage: ResultRowProps["match"]["stage"];
  group: string | null;
  kickoffAt: Date;
  homeTeam: { code: string; name: string };
  awayTeam: { code: string; name: string };
  homeScore: number | null;
  awayScore: number | null;
  _count: { tips: number };
}): ResultRowProps["match"] {
  return {
    id: m.id,
    stage: m.stage,
    group: m.group,
    kickoffAt: m.kickoffAt.toISOString(),
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    tipCount: m._count.tips,
  };
}
