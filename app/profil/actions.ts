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

const MAX_AVATAR_BYTES = 10 * 1024 * 1024; // 10 MB hochladbar (Handy-Fotos)
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
    return { error: "Bild ist zu groß (max. 10 MB)." };
  }
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return { error: "Nur JPEG, PNG oder WebP erlaubt." };
  }

  let webp: Buffer;
  try {
    // Dynamischer Import: sharp ist ein natives Modul mit Plattform-Binaries.
    // Auf Vercel kann es beim Laden scheitern (libvips fehlt) — wenn das in
    // einem top-level import passiert, reißt es das ganze Action-Modul mit,
    // also auch die Namens-Action. Lazy-Load isoliert den Fehler auf den
    // Avatar-Upload selbst.
    const sharp = (await import("sharp")).default;
    const buf = Buffer.from(await file.arrayBuffer());
    webp = await sharp(buf)
      .rotate() // EXIF-Orientation berücksichtigen (Handy-Fotos!)
      .resize(256, 256, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return { error: "Bild konnte nicht verarbeitet werden." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      // Prisma 7 erwartet Uint8Array, nicht Buffer.
      avatarData: new Uint8Array(webp),
      avatarUpdatedAt: new Date(),
    },
  });

  revalidatePath("/profil");
  revalidatePath("/dashboard");
  revalidatePath("/tabelle");

  return { success: true };
}
