"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const NameSchema = z
  .string()
  .trim()
  .min(2, "Name muss mindestens 2 Zeichen lang sein.")
  .max(40, "Name darf höchstens 40 Zeichen lang sein.");

export type UpdateNameState =
  | { error?: string; success?: boolean }
  | undefined;

export type AvatarState =
  | { error?: string; success?: boolean }
  | undefined;

// Das Bild wird im Browser auf 256x256 JPEG runtergerechnet, bevor es
// hochgeladen wird (siehe ProfilForm). 1 MB ist großzügig — typisch ~30 KB.
const MAX_AVATAR_BYTES = 1 * 1024 * 1024;

export async function updateNameAction(
  _prev: UpdateNameState,
  formData: FormData,
): Promise<UpdateNameState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "Nicht angemeldet." };
  }

  const parsed = NameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültiger Name." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { name: parsed.data },
  });

  // Tabelle und Dashboard lesen den Namen aus der DB; Caches frisch machen.
  revalidatePath("/profil");
  revalidatePath("/dashboard");
  revalidatePath("/tabelle");

  return { success: true };
}

export async function uploadAvatarAction(
  _prev: AvatarState,
  formData: FormData,
): Promise<AvatarState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "Nicht angemeldet." };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bitte wähle ein Bild aus." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "Bild ist zu groß." };
  }
  // Browser sendet immer JPEG (siehe ProfilForm — Canvas.toBlob).
  if (file.type !== "image/jpeg") {
    return { error: "Ungültiges Bildformat." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  await prisma.user.update({
    where: { id: userId },
    data: {
      avatarData: bytes,
      avatarUpdatedAt: new Date(),
    },
  });

  revalidatePath("/profil");
  revalidatePath("/dashboard");
  revalidatePath("/tabelle");

  return { success: true };
}
