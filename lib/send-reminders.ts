// Tägliche Tipp-Erinnerung per Web Push.
//
// Hintergrund: Die WM 2026 läuft in Nordamerika, die Spiele werden in Deutschland
// abends/nachts angepfiffen. Dieser Job läuft einmal täglich (Vercel-Cron, 12:00
// UTC = 14:00 CEST, siehe vercel.json) und erinnert jeden User mit aktivem Push-Abo
// an die Spiele der nächsten 24 h, die er noch nicht getippt hat.
//
// Aufgerufen vom Cron-Endpoint /api/cron/send-reminders.

import webpush from "web-push";
import { prisma } from "@/lib/prisma";

export type ReminderStats = {
  upcomingMatches: number;
  usersWithSubscriptions: number;
  notified: number; // User, an die mind. eine Notification rausging
  sent: number; // einzelne Notifications (pro Gerät)
  removed: number; // abgelaufene Abos, die gelöscht wurden
  errors: string[];
};

// 24-h-Fenster ab jetzt: deckt den heutigen Abend inkl. Spiele nach Mitternacht ab.
const WINDOW_MS = 24 * 60 * 60 * 1000;

function configureVapid(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

// Anstoßzeit als deutsche Uhrzeit, z. B. "21:00".
function formatKickoff(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildBody(openCount: number, firstKickoff: Date): string {
  const spiele = openCount === 1 ? "1 Spiel" : `${openCount} Spiele`;
  const verb = openCount === 1 ? "ist" : "sind";
  return `${spiele} heute noch nicht getippt — erstes um ${formatKickoff(firstKickoff)} Uhr. Schnell ${verb} noch Zeit!`;
}

export async function sendReminders(): Promise<ReminderStats> {
  const stats: ReminderStats = {
    upcomingMatches: 0,
    usersWithSubscriptions: 0,
    notified: 0,
    sent: 0,
    removed: 0,
    errors: [],
  };

  if (!configureVapid()) {
    stats.errors.push("VAPID nicht konfiguriert");
    return stats;
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + WINDOW_MS);

  // Anstehende Spiele im 24-h-Fenster (Tipps schließen bei kickoffAt).
  const matches = await prisma.match.findMany({
    where: { kickoffAt: { gt: now, lte: windowEnd } },
    select: { id: true, kickoffAt: true },
    orderBy: { kickoffAt: "asc" },
  });
  stats.upcomingMatches = matches.length;
  if (matches.length === 0) return stats; // heute keine Spiele → nichts zu tun

  const matchIds = matches.map((m) => m.id);

  // Nur User mit mind. einem Push-Abo; deren Tipps für die anstehenden Spiele dazu.
  const users = await prisma.user.findMany({
    where: { pushSubscriptions: { some: {} } },
    select: {
      id: true,
      pushSubscriptions: { select: { endpoint: true, p256dh: true, auth: true } },
      tips: {
        where: { matchId: { in: matchIds } },
        select: { matchId: true },
      },
    },
  });
  stats.usersWithSubscriptions = users.length;

  for (const user of users) {
    const tippedIds = new Set(user.tips.map((t) => t.matchId));
    const open = matches.filter((m) => !tippedIds.has(m.id));
    if (open.length === 0) continue; // alles getippt → keine Erinnerung

    const payload = JSON.stringify({
      title: "⚽ Tipp nicht vergessen!",
      body: buildBody(open.length, open[0].kickoffAt),
      url: "/tipps",
    });

    let deliveredToUser = false;
    for (const sub of user.pushSubscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
        stats.sent += 1;
        deliveredToUser = true;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 404/410: Abo ist abgelaufen/abbestellt → aufräumen.
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription
            .deleteMany({ where: { endpoint: sub.endpoint } })
            .catch(() => {});
          stats.removed += 1;
        } else {
          stats.errors.push(`${sub.endpoint.slice(0, 40)}…: ${statusCode ?? err}`);
        }
      }
    }
    if (deliveredToUser) stats.notified += 1;
  }

  return stats;
}
