"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { applyMatchResult } from "@/lib/scoring";
import { syncResultsFromOpenLigaDB, type SyncStats } from "@/lib/sync-results";
import { isKnockoutStage } from "@/lib/stages";
import { Stage } from "@/app/generated/prisma/client";

const ResultSchema = z.object({
  matchId: z.string().min(1),
  homeScore: z.coerce.number().int().min(0).max(30),
  awayScore: z.coerce.number().int().min(0).max(30),
});

const MatchIdSchema = z.object({ matchId: z.string().min(1) });

// `kickoffLocal` is the raw value of a <input type="datetime-local"> — local
// wall-clock without a zone, e.g. "2026-07-04T22:00". We interpret it as German
// time below (the whole tournament runs in CEST, +02:00).
const CreateMatchSchema = z.object({
  stage: z.nativeEnum(Stage),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  kickoffLocal: z.string().min(1),
});

export type ResultActionState =
  | { ok: true; tipsScored: number }
  | { ok: false; error: string }
  | undefined;

export type CreateMatchState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined;

export type SyncActionState =
  | { ok: true; stats: SyncStats }
  | { ok: false; error: string }
  | undefined;

type Gate = { ok: true; userId: string } | { ok: false; error: string };

async function requireAdmin(): Promise<Gate> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Nicht angemeldet." };
  if (!session.user.isAdmin)
    return { ok: false, error: "Kein Adminzugriff." };
  return { ok: true, userId: session.user.id };
}

export async function saveResultAction(
  _prev: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = ResultSchema.safeParse({
    matchId: formData.get("matchId"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
  });
  if (!parsed.success) return { ok: false, error: "Ungültiges Ergebnis." };
  const { matchId, homeScore, awayScore } = parsed.data;

  // KO matches always have a winner — the entered result includes extra time /
  // penalties (e.g. 7:6), so a tie is never a valid final scoreline.
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { stage: true },
  });
  if (!match) return { ok: false, error: "Spiel nicht gefunden." };
  if (isKnockoutStage(match.stage) && homeScore === awayScore) {
    return {
      ok: false,
      error:
        "K.-o.-Spiele enden nie unentschieden — bitte das Ergebnis inkl. Elfmeterschießen eintragen.",
    };
  }

  // One transaction so the match update + tip recomputes + champion recompute (if FINAL) commit together.
  const tipsScored = await prisma.$transaction((tx) =>
    applyMatchResult(tx, matchId, homeScore, awayScore),
  );

  revalidatePath("/admin");
  revalidatePath("/tipps");
  revalidatePath("/tabelle");
  revalidatePath("/wm-tipp");
  return { ok: true, tipsScored };
}

export async function clearResultAction(
  _prev: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = MatchIdSchema.safeParse({
    matchId: formData.get("matchId"),
  });
  if (!parsed.success) return { ok: false, error: "Ungültige Anfrage." };
  const { matchId } = parsed.data;

  await prisma.$transaction(async (tx) => {
    const match = await tx.match.update({
      where: { id: matchId },
      data: { homeScore: null, awayScore: null, resultEnteredAt: null },
      select: { stage: true },
    });
    await tx.tip.updateMany({
      where: { matchId },
      data: { points: null },
    });
    // If the FINAL result is cleared the champion is no longer known — null all picks.
    if (match.stage === Stage.FINAL) {
      await tx.championTip.updateMany({ data: { points: null } });
    }
  });

  revalidatePath("/admin");
  revalidatePath("/tipps");
  revalidatePath("/tabelle");
  revalidatePath("/wm-tipp");
  return { ok: true, tipsScored: 0 };
}

// Create a knockout match by hand. Group matches are seeded, so this is for the
// KO bracket once the pairings are known — and as a fallback if the auto-sync
// can't create them (missing/odd OpenLigaDB data). New matches show up to tip
// immediately because /tipps simply lists every match in the DB.
export async function createMatchAction(
  _prev: CreateMatchState,
  formData: FormData,
): Promise<CreateMatchState> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = CreateMatchSchema.safeParse({
    stage: formData.get("stage"),
    homeTeamId: formData.get("homeTeamId"),
    awayTeamId: formData.get("awayTeamId"),
    kickoffLocal: formData.get("kickoffLocal"),
  });
  if (!parsed.success) return { ok: false, error: "Ungültige Eingabe." };
  const { stage, homeTeamId, awayTeamId, kickoffLocal } = parsed.data;

  if (stage === Stage.GROUP)
    return { ok: false, error: "Gruppenspiele sind bereits angelegt." };
  if (homeTeamId === awayTeamId)
    return { ok: false, error: "Bitte zwei verschiedene Teams wählen." };

  // datetime-local has no zone; pin it to CEST so the stored instant is correct.
  const kickoffAt = new Date(`${kickoffLocal}:00+02:00`);
  if (Number.isNaN(kickoffAt.getTime()))
    return { ok: false, error: "Ungültiger Anpfiff-Zeitpunkt." };

  const teamCount = await prisma.team.count({
    where: { id: { in: [homeTeamId, awayTeamId] } },
  });
  if (teamCount !== 2)
    return { ok: false, error: "Team nicht gefunden." };

  // Same pairing (either orientation) already exists — avoid a duplicate fixture.
  const existing = await prisma.match.findFirst({
    where: {
      OR: [
        { homeTeamId, awayTeamId },
        { homeTeamId: awayTeamId, awayTeamId: homeTeamId },
      ],
    },
    select: { id: true },
  });
  if (existing)
    return { ok: false, error: "Diese Paarung gibt es schon." };

  await prisma.match.create({
    data: { stage, kickoffAt, homeTeamId, awayTeamId },
  });

  revalidatePath("/admin");
  revalidatePath("/tipps");
  revalidatePath("/tabelle");
  revalidatePath("/wm-tipp");
  return { ok: true };
}

// Delete a knockout match (and its tips, via cascade). Group matches are
// protected — they're part of the seed and shouldn't be removed from the UI.
export async function deleteMatchAction(
  _prev: CreateMatchState,
  formData: FormData,
): Promise<CreateMatchState> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = MatchIdSchema.safeParse({ matchId: formData.get("matchId") });
  if (!parsed.success) return { ok: false, error: "Ungültige Anfrage." };

  const match = await prisma.match.findUnique({
    where: { id: parsed.data.matchId },
    select: { stage: true },
  });
  if (!match) return { ok: false, error: "Spiel nicht gefunden." };
  if (match.stage === Stage.GROUP)
    return { ok: false, error: "Gruppenspiele können nicht gelöscht werden." };

  await prisma.match.delete({ where: { id: parsed.data.matchId } });

  revalidatePath("/admin");
  revalidatePath("/tipps");
  revalidatePath("/tabelle");
  revalidatePath("/wm-tipp");
  return { ok: true };
}

// Manually trigger the OpenLigaDB sync from the admin UI — independent of the
// once-daily Vercel cron. Reuses the same sync logic and surfaces its stats/errors.
export async function syncResultsAction(
  _prev: SyncActionState,
  _formData: FormData,
): Promise<SyncActionState> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  let stats: SyncStats;
  try {
    stats = await syncResultsFromOpenLigaDB();
  } catch (e) {
    return { ok: false, error: `Sync fehlgeschlagen: ${(e as Error).message}` };
  }

  revalidatePath("/admin");
  revalidatePath("/tipps");
  revalidatePath("/tabelle");
  revalidatePath("/wm-tipp");
  return { ok: true, stats };
}
