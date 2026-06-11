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

  return (
    <div className="flex flex-col gap-6">
      {/* Avatar-Form: eigenes useActionState, damit Erfolg/Fehler nicht mit
          dem Namensformular kollidieren. React kümmert sich bei Server Actions
          automatisch um multipart/form-data — kein encType nötig. */}
      <form
        action={avatarAction}
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
              JPEG, PNG oder WebP · max. 10 MB
            </span>
          </label>
        </div>

        {avatarState?.error && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
            {avatarState.error}
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
