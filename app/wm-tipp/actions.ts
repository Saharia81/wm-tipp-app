"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const Schema = z.object({ teamId: z.string().min(1) });

export type SaveChampionState =
  | { ok: true; teamId: string }
  | { ok: false; error: string }
  | undefined;

export async function saveChampionTipAction(
  _prev: SaveChampionState,
  formData: FormData,
): Promise<SaveChampionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Nicht angemeldet." };

  const parsed = Schema.safeParse({ teamId: formData.get("teamId") });
  if (!parsed.success) return { ok: false, error: "Bitte ein Team wählen." };
  const { teamId } = parsed.data;

  // Deadline = kickoff of the tournament's first match. Re-check server-side.
  const first = await prisma.match.aggregate({ _min: { kickoffAt: true } });
  if (first._min.kickoffAt && first._min.kickoffAt.getTime() <= Date.now()) {
    return { ok: false, error: "Deadline vorbei — WM-Tipp gesperrt." };
  }

  // Make sure the team actually exists.
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true },
  });
  if (!team) return { ok: false, error: "Team nicht gefunden." };

  await prisma.championTip.upsert({
    where: { userId: session.user.id },
    update: { teamId, points: null },
    create: { userId: session.user.id, teamId },
  });

  revalidatePath("/wm-tipp");
  revalidatePath("/tabelle");
  return { ok: true, teamId };
}
