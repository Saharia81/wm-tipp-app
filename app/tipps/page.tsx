import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/stages";
import { MatchCard, type MatchCardProps } from "./_components/MatchCard";
import { ScrollToTarget } from "./_components/ScrollToTarget";
import { StageStepper, type StageStatus } from "./_components/StageStepper";

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
  const stageGroups = groupByStage(matches);
  const stageStatuses = stageStatusesOf(matches);
  const targetDayKey = findTargetDayKey(matches, now);

  return (
    <main className="flex-1 flex flex-col items-center px-5 py-8 bg-gradient-to-b from-[#0a1f44] to-[#142a5c] text-white">
      <div className="w-full max-w-md flex flex-col gap-6">
        <header className="sticky top-0 z-20 -mx-5 px-5 py-3 flex items-center justify-between border-b border-white/10 bg-[#0a1f44]/90 backdrop-blur">
          <h1 className="text-2xl font-bold">Tipps</h1>
          <Link
            href="/dashboard"
            className="text-sm font-medium px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 transition-colors"
          >
            ← Zurück
          </Link>
        </header>

        {matches.length > 0 && <StageStepper statuses={stageStatuses} />}
        {matches.length > 0 && <ScrollToTarget />}

        {matches.length === 0 && (
          <p className="text-white/70 text-sm">
            Noch keine Spiele eingespeist. Frag den Admin.
          </p>
        )}

        {stageGroups.map(({ stage, items: stageItems }) => (
          <section key={stage} className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <span className="h-4 w-1 rounded-full bg-emerald-400" aria-hidden />
              {STAGE_LABELS[stage]}
            </h2>

            {groupByDay(stageItems, now, userId).map(
              ({ dayKey, dayLabel, items, openCount, isFuture }) => {
                const isTarget = dayKey === targetDayKey;
                return (
                <details
                  key={dayLabel}
                  open={isFuture || isTarget}
                  data-tipps-target={isTarget ? "true" : undefined}
                  className="group scroll-mt-24 rounded-2xl bg-white/[0.02] border border-white/10"
                >
                  <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <div className="flex flex-col gap-1 min-w-0">
                      <h3 className="text-sm uppercase tracking-[0.2em] text-white/70">
                        {dayLabel}
                      </h3>
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
                    {items.map((m) => (
                      <MatchCard key={m.id} {...toCardProps(m, now, userId)} />
                    ))}
                  </div>
                </details>
                );
              },
            )}
          </section>
        ))}
      </div>
    </main>
  );
}

// Ein Spiel gilt als "beendet", sobald ein Endergebnis eingetragen ist oder der
// Anpfiff lange genug zurückliegt (ein Spiel dauert ~2 h inkl. Pause/Nachspiel).
// So bleibt nur das laufende und kommende Spiele offen sichtbar.
const MATCH_DURATION_MS = 2.5 * 60 * 60 * 1000;
function isFinished(
  m: { kickoffAt: Date; homeScore: number | null; awayScore: number | null },
  now: number,
) {
  const hasResult = m.homeScore !== null && m.awayScore !== null;
  return hasResult || m.kickoffAt.getTime() + MATCH_DURATION_MS <= now;
}

type MatchWithTips = {
  id: string;
  stage: MatchCardProps["match"]["stage"];
  group: string | null;
  kickoffAt: Date;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { code: string; name: string };
  awayTeam: { code: string; name: string };
  tips: {
    userId: string;
    homeScore: number;
    awayScore: number;
    points: number | null;
    user: { id: string; name: string; avatarUpdatedAt: Date | null };
  }[];
};

function toCardProps(
  m: MatchWithTips,
  now: number,
  userId: string,
): MatchCardProps {
  const own = m.tips.find((t) => t.userId === userId) ?? null;
  const tip = own
    ? { homeScore: own.homeScore, awayScore: own.awayScore, points: own.points }
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
          avatarVersion: t.user.avatarUpdatedAt?.toISOString() ?? null,
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
  // Fremde Tipps nur bei laufenden Spielen offen zeigen; bei beendeten Spielen
  // eingeklappt, damit die Liste den Tag nicht zumüllt.
  const othersDefaultOpen = locked && !isFinished(m, now);
  return {
    match: {
      id: m.id,
      stage: m.stage,
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
    othersDefaultOpen,
  };
}

// Top-level grouping by tournament stage, in bracket order (Gruppe → ... →
// Finale). Stages without any match yet (KO pairing not decided) are
// omitted here — the StageStepper still shows them as "upcoming".
function groupByStage<T extends { stage: Stage }>(items: T[]) {
  const map = new Map<Stage, T[]>();
  for (const it of items) {
    const list = map.get(it.stage);
    if (list) list.push(it);
    else map.set(it.stage, [it]);
  }
  return STAGES.filter((stage) => map.has(stage)).map((stage) => ({
    stage,
    items: map.get(stage)!,
  }));
}

function stageStatusesOf(
  matches: { stage: Stage; homeScore: number | null; awayScore: number | null }[],
): Record<Stage, StageStatus> {
  const statuses = {} as Record<Stage, StageStatus>;
  for (const stage of STAGES) {
    const stageMatches = matches.filter((m) => m.stage === stage);
    if (stageMatches.length === 0) {
      statuses[stage] = "upcoming";
    } else if (
      stageMatches.every((m) => m.homeScore !== null && m.awayScore !== null)
    ) {
      statuses[stage] = "done";
    } else {
      statuses[stage] = "current";
    }
  }
  return statuses;
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
    {
      dayKey: string;
      dayLabel: string;
      items: T[];
      openCount: number;
      isFuture: boolean;
    }
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
        dayKey: key,
        dayLabel,
        items: [it],
        openCount: isOpen ? 1 : 0,
        isFuture: isUpcoming,
      });
    }
  }
  return [...map.values()];
}

// Ermittelt den Spieltag, zu dem beim Öffnen der Seite direkt gesprungen
// werden soll: heutiges Datum, sonst der letzte vergangene Spieltag (oder,
// falls das Turnier noch nicht begonnen hat, der nächste kommende).
function findTargetDayKey(
  matches: { kickoffAt: Date }[],
  now: number,
): string | null {
  if (matches.length === 0) return null;
  const todayKey = new Date(now).toISOString().slice(0, 10);
  const keys = [...new Set(matches.map((m) => m.kickoffAt.toISOString().slice(0, 10)))].sort();
  if (keys.includes(todayKey)) return todayKey;
  const past = keys.filter((k) => k < todayKey);
  if (past.length > 0) return past[past.length - 1];
  return keys[0];
}
