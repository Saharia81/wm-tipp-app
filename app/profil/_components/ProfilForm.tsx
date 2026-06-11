"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Avatar } from "@/app/_components/Avatar";
import {
  updateNameAction,
  uploadAvatarAction,
  type UpdateNameState,
  type AvatarState,
} from "../actions";

type ProfilFormProps = {
  currentName: string;
  userId: string;
  avatarVersion: string | null;
};

const AVATAR_SIZE = 256;
const AVATAR_QUALITY = 0.82;

// Resize im Browser, statt sharp auf dem Server: sharp braucht libvips,
// das auf Vercel Hobby nicht verfügbar ist. Canvas reicht für 256x256.
async function resizeToJpegBlob(file: File): Promise<Blob> {
  // imageOrientation: "from-image" => EXIF-Drehung berücksichtigen (Handy-Fotos).
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    // Cover-Crop: kürzere Seite passt auf 256, längere wird mittig beschnitten.
    const scale = Math.max(AVATAR_SIZE / bitmap.width, AVATAR_SIZE / bitmap.height);
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    const dx = (AVATAR_SIZE - w) / 2;
    const dy = (AVATAR_SIZE - h) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bitmap, dx, dy, w, h);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob null"))),
        "image/jpeg",
        AVATAR_QUALITY,
      );
    });
  } finally {
    bitmap.close();
  }
}

export function ProfilForm({
  currentName,
  userId,
  avatarVersion,
}: ProfilFormProps) {
  const [nameState, nameAction, namePending] = useActionState<
    UpdateNameState,
    FormData
  >(updateNameAction, undefined);

  const [avatarState, avatarAction, avatarPending] = useActionState<
    AvatarState,
    FormData
  >(uploadAvatarAction, undefined);

  // Live-Vorschau der gewählten Datei, bevor sie hochgeladen wurde.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);
  // Fehler aus dem Browser-Resize (vor der Server-Action). Wird vom
  // avatarState überschrieben, sobald die Action zurückkommt.
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    // Object-URLs müssen wieder freigegeben werden, sonst leakt der Browser Speicher.
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Nach einem erfolgreichen Upload: Vorschau wegräumen und Input leeren,
  // damit der neue gespeicherte Avatar gezeigt wird.
  useEffect(() => {
    if (avatarState?.success) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setHasFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    // previewUrl absichtlich nicht in deps — sonst Schleife beim Aufräumen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarState?.success]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setClientError(null);
    const file = e.target.files?.[0];
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      setHasFile(true);
    } else {
      setPreviewUrl(null);
      setHasFile(false);
    }
  }

  async function onAvatarSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setClientError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setClientError("Bitte wähle ein Bild aus.");
      return;
    }
    let blob: Blob;
    try {
      blob = await resizeToJpegBlob(file);
    } catch {
      setClientError("Bild konnte nicht verarbeitet werden.");
      return;
    }
    const fd = new FormData();
    fd.append("avatar", blob, "avatar.jpg");
    avatarAction(fd);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Avatar-Form: kein form action — wir machen den Resize im Browser und
          rufen die Action danach manuell auf (siehe onAvatarSubmit). */}
      <form
        onSubmit={onAvatarSubmit}
        className="flex flex-col gap-4 rounded-2xl bg-white/5 border border-white/10 p-4"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">
          Profilbild
        </p>

        <div className="flex items-center gap-4">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Vorschau"
              width={64}
              height={64}
              className="rounded-full object-cover border border-white/15 shrink-0"
              style={{ width: 64, height: 64 }}
            />
          ) : (
            <Avatar
              userId={userId}
              name={currentName}
              version={avatarVersion}
              size={64}
            />
          )}

          <label className="flex-1 text-sm">
            <span className="sr-only">Bild auswählen</span>
            <input
              ref={fileInputRef}
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileChange}
              className="block w-full text-sm text-white/80 file:mr-3 file:rounded-full file:border-0 file:bg-white/15 file:px-4 file:py-2 file:text-white file:font-medium file:cursor-pointer"
            />
            <span className="mt-1 block text-xs text-white/50">
              JPEG, PNG oder WebP
            </span>
          </label>
        </div>

        {(clientError || avatarState?.error) && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
            {clientError ?? avatarState?.error}
          </p>
        )}
        {avatarState?.success && (
          <p className="text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-400/30 rounded-lg px-3 py-2">
            Profilbild gespeichert.
          </p>
        )}

        <button
          type="submit"
          disabled={avatarPending || !hasFile}
          className="h-12 rounded-full bg-emerald-400 text-[#0a1f44] font-semibold disabled:opacity-60"
        >
          {avatarPending ? "Speichern…" : "Bild speichern"}
        </button>
      </form>

      {/* Name-Form: bleibt wie sie war, nur eigene Action und State. */}
      <form action={nameAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/80">Anzeigename</span>
          <input
            name="name"
            type="text"
            autoComplete="name"
            defaultValue={currentName}
            required
            minLength={2}
            maxLength={40}
            className="h-12 px-4 rounded-xl bg-white/10 border border-white/15 placeholder-white/40 text-white text-base focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
          />
          <span className="text-xs text-white/50">
            So erscheinst du in der Tabelle.
          </span>
        </label>

        {nameState?.error && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
            {nameState.error}
          </p>
        )}
        {nameState?.success && (
          <p className="text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-400/30 rounded-lg px-3 py-2">
            Name gespeichert.
          </p>
        )}

        <button
          type="submit"
          disabled={namePending}
          className="h-12 rounded-full bg-emerald-400 text-[#0a1f44] font-semibold disabled:opacity-60"
        >
          {namePending ? "Speichern…" : "Speichern"}
        </button>
      </form>
    </div>
  );
}
