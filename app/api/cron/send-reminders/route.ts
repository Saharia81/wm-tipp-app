// HTTP entry point for the daily tip reminder. Called by Vercel Cron once a day
// (see vercel.json — 12:00 UTC = 14:00 CEST). Auth is via the shared bearer token
// in CRON_SECRET — Vercel injects `Authorization: Bearer ${CRON_SECRET}` on cron
// invocations, so this same check works locally too:
//
//   curl -H "Authorization: Bearer <secret>" http://localhost:3000/api/cron/send-reminders

import { sendReminders } from "@/lib/send-reminders";

export const runtime = "nodejs";
// Cron paths must not be statically optimized — they need to execute on every hit.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response("CRON_SECRET not configured", { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const stats = await sendReminders();
  return Response.json(stats);
}
