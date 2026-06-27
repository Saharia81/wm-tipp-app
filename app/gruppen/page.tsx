import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { flagFor } from "@/lib/flags";

type TeamMatch = {
  id: string;
  opponentCode: string;
  opponentName: string;
  gf: number | null; // eigene Tore (null = noch nicht gespielt)
  ga: number | null; // Gegentore
  kickoffAt: string; // ISO
};

type TeamStanding = {
  id: string;
  code: string;
  name: string;
  sp: number; // gespielte Spiele
  gf: number; // erzielte Tore
  ga: number; // Gegentore
  gd: number; // Tordifferenz
  pts: number; // Punkte
  matches: TeamMatch[];
};

export default async function GruppenPage() {
  // auth() schützt die Route (wie die übrigen Seiten); session selbst wird hier
  // nicht weiter gebraucht.
  await auth();

  const matches = await prisma.match.findMany({
    where: { stage: "GROUP" },
    include: {
      homeTeam: { select: { id: true, code: true, name: true, group: true } },
      awayTeam: { select: { id: true, code: true, name: true, group: true } },
    },
    orderBy: { kickoffAt: "asc" },
  });

  // Standings pro Gruppe aufbauen. Teams werden aus den Match-Teams gesammelt,
  // damit auch Teams ohne gewertetes Spiel mit 0 erscheinen.
  const groups = new Map<string, Map<string, TeamStanding>>();

  const ensureTeam = (
    group: string,
    team: { id: string; code: string; name: string },
  ): TeamStanding => {
    let table = groups.get(group);
    if (!table) {
      table = new Map();
      groups.set(group, table);
    }
    let row = table.get(team.id);
    if (!row) {
      row = {
        id: team.id,
        code: team.code,
        name: team.name,
        sp: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0,
        matches: [],
      };
      table.set(team.id, row);
    }
    return row;
  };

  for (const m of matches) {
    const group = m.group ?? m.homeTeam.group ?? m.awayTeam.group;
    if (!group) continue;

    const home = ensureTeam(group, m.homeTeam);
    const away = ensureTeam(group, m.awayTeam);
    const kickoffAt = m.kickoffAt.toISOString();

    // Jedes Spiel aus Sicht beider Teams in deren Spielliste aufnehmen
    // (Spiele sind bereits nach Anstoßzeit sortiert).
    home.matches.push({
      id: m.id,
      opponentCode: m.awayTeam.code,
      opponentName: m.awayTeam.name,
      gf: m.homeScore,
      ga: m.awayScore,
      kickoffAt,
    });
    away.matches.push({
      id: m.id,
      opponentCode: m.homeTeam.code,
      opponentName: m.homeTeam.name,
      gf: m.awayScore,
      ga: m.homeScore,
      kickoffAt,
    });

    // Nur fertige Spiele werten.
    if (m.homeScore === null || m.awayScore === null) continue;

    home.sp++;
    away.sp++;
    home.gf += m.homeScore;
    home.ga += m.awayScore;
    away.gf += m.awayScore;
    away.ga += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.pts += 3;
    } else if (m.homeScore < m.awayScore) {
      away.pts += 3;
    } else {
      home.pts += 1;
      away.pts += 1;
    }
  }

  // Sortierung: Punkte → Tordifferenz → erzielte Tore → Name.
  const sortedGroups = [...groups.entries()]
    .map(([group, table]) => {
      const rows = [...table.values()]
        .map((r) => ({ ...r, gd: r.gf - r.ga }))
        .sort(
          (a, b) =>
            b.pts - a.pts ||
            b.gd - a.gd ||
            b.gf - a.gf ||
            a.name.localeCompare(b.name, "de"),
        );
      return { group, rows };
    })
    .sort((a, b) => a.group.localeCompare(b.group, "de"));

  return (
    <main className="flex-1 flex flex-col items-center px-5 py-8 bg-gradient-to-b from-[#0a1f44] to-[#142a5c] text-white">
      <div className="w-full max-w-md flex flex-col gap-6">
        <header className="sticky top-0 z-20 -mx-5 px-5 py-3 flex items-center justify-between border-b border-white/10 bg-[#0a1f44]/90 backdrop-blur">
          <h1 className="text-2xl font-bold">Gruppen</h1>
          <Link
            href="/dashboard"
            className="text-sm font-medium px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 transition-colors"
          >
            ← Zurück
          </Link>
        </header>

        {sortedGroups.length === 0 ? (
          <p className="text-white/70 text-sm">Noch keine Gruppen vorhanden.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {sortedGroups.map(({ group, rows }) => (
              <section key={group} className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold text-white/90">
                  Gruppe {group}
                </h2>
                <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                  {/* Kopfzeile */}
                  <div className="flex items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-wide text-white/45">
                    <span className="w-4 text-right">#</span>
                    <span className="flex-1">Team</span>
                    <span className="w-7 text-center">Sp</span>
                    <span className="w-9 text-center">+/−</span>
                    <span className="w-7 text-center font-semibold">Pkt</span>
                    <span className="w-3" aria-hidden />
                  </div>
                  <ul>
                    {rows.map((row, idx) => {
                      const flag = flagFor(row.code);
                      // Top 2 (sichere Achtelfinal-Plätze) leicht hervorheben.
                      const qualified = idx < 2;
                      return (
                        <li
                          key={row.id}
                          className="border-t border-white/5"
                        >
                          <details className="group/team">
                            <summary
                              className={
                                "flex items-center gap-2 px-3 py-2.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden " +
                                (qualified ? "bg-emerald-400/10" : "")
                              }
                            >
                              <span className="w-4 text-right text-sm font-semibold text-white/70">
                                {idx + 1}
                              </span>
                              <span className="flex-1 min-w-0 flex items-center gap-2">
                                {flag && (
                                  <span className="text-base leading-none">
                                    {flag}
                                  </span>
                                )}
                                <span className="truncate text-sm">
                                  {row.name}
                                </span>
                              </span>
                              <span className="w-7 text-center text-sm tabular-nums text-white/70">
                                {row.sp}
                              </span>
                              <span className="w-9 text-center text-sm tabular-nums text-white/70">
                                {row.gd > 0 ? `+${row.gd}` : row.gd}
                              </span>
                              <span className="w-7 text-center text-sm font-bold tabular-nums">
                                {row.pts}
                              </span>
                              <span
                                className="w-3 text-center text-xs text-white/40 transition-transform duration-200 group-open/team:rotate-180"
                                aria-hidden
                              >
                                ▾
                              </span>
                            </summary>
                            <ul className="flex flex-col gap-1 px-3 pb-3 pt-1 bg-black/15">
                              {row.matches.map((mt) => (
                                <MatchRow key={mt.id} match={mt} />
                              ))}
                            </ul>
                          </details>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-white/40">
          Tippe auf ein Land für seine Spiele. Sortierung: Punkte ·
          Tordifferenz · Tore. Top 2 erreichen das Achtelfinale.
        </p>
      </div>
    </main>
  );
}

function MatchRow({ match }: { match: TeamMatch }) {
  const flag = flagFor(match.opponentCode);
  const played = match.gf !== null && match.ga !== null;

  // Ergebnis-Farbe aus Sicht des aufgeklappten Teams.
  let resultClass = "text-white/70";
  if (played) {
    if (match.gf! > match.ga!) resultClass = "text-emerald-300";
    else if (match.gf! < match.ga!) resultClass = "text-red-300";
    else resultClass = "text-white/60";
  }

  return (
    <li className="flex items-center gap-2 text-sm">
      <span className="text-white/40 text-xs w-12 shrink-0">vs</span>
      <span className="flex-1 min-w-0 flex items-center gap-1.5">
        {flag && <span className="leading-none">{flag}</span>}
        <span className="truncate text-white/80">{match.opponentName}</span>
      </span>
      {played ? (
        <span className={`font-semibold tabular-nums ${resultClass}`}>
          {match.gf}:{match.ga}
        </span>
      ) : (
        <span className="text-xs text-white/45 tabular-nums">
          {formatKickoff(match.kickoffAt)}
        </span>
      )}
    </li>
  );
}

const kickoffFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatKickoff(iso: string) {
  return kickoffFormatter.format(new Date(iso));
}
