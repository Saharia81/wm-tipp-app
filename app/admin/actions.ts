"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { applyMatchResult } from "@/lib/scoring";
import { Stage } from "@/app/generated/prisma/client";

const ResultSchema = z.object({
  matchId: z.string().min(1),
  homeScore: z.coerce.number().int().min(0).max(30),
  awayScore: z.coerce.number().int().min(0).max(30),
});

const MatchIdSchema = z.object({ matchId: z.string().min(1) });

export type ResultActionState =
  | { ok: true; tipsScored: number }
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
