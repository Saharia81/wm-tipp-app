"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isKnockoutStage } from "@/lib/stages";

// Per match: 0..30 covers any sane scoreline (Australia 31:0 American Samoa is the WC qualifier record).
const TipSchema = z.object({
  matchId: z.string().min(1),
  homeScore: z.coerce.number().int().min(0).max(30),
  awayScore: z.coerce.number().int().min(0).max(30),
});

export type SaveTipState =
  | { ok: true; homeScore: number; awayScore: number }
  | { ok: false; error: string }
  | undefined;

export async function saveTipAction(
  _prev: SaveTipState,
  formData: FormData,
): Promise<SaveTipState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Nicht angemeldet." };
  }

  const parsed = TipSchema.safeParse({
    matchId: formData.get("matchId"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Ungültiger Tipp." };
  }
  const { matchId, homeScore, awayScore } = parsed.data;

  // Server-side deadline re-check. Never trust the client to lock past-kickoff matches.
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { kickoffAt: true, stage: true },
  });
  if (!match) {
    return { ok: false, error: "Spiel nicht gefunden." };
  }
  if (match.kickoffAt.getTime() <= Date.now()) {
    return { ok: false, error: "Deadline vorbei — Tipp nicht mehr möglich." };
  }
  if (isKnockoutStage(match.stage) && homeScore === awayScore) {
    return {
      ok: false,
      error: "K.-o.-Spiele können nicht unentschieden getippt werden.",
    };
  }

  await prisma.tip.upsert({
    where: { userId_matchId: { userId: session.user.id, matchId } },
    update: { homeScore, awayScore, points: null },
    create: { userId: session.user.id, matchId, homeScore, awayScore },
  });

  revalidatePath("/tipps");
  return { ok: true, homeScore, awayScore };
}
