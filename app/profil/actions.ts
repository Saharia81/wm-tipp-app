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
