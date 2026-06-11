// Runder Avatar mit Initialen-Fallback. Wird in der Tabelle und im Profil benutzt.
// Reine Server-Komponente — kein State, kein Handler nötig.

type AvatarProps = {
  userId: string;
  name: string;
  // ISO-String von User.avatarUpdatedAt; null = kein Bild hochgeladen.
  version: string | null;
  size?: number;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function Avatar({ userId, name, version, size = 40 }: AvatarProps) {
  const style = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.4),
  };

  if (!version) {
    return (
      <div
        style={style}
        className="rounded-full bg-white/15 border border-white/20 flex items-center justify-center font-semibold text-white/90 shrink-0"
        aria-hidden
      >
        {initials(name)}
      </div>
    );
  }

  // Plain <img>: das Bild ist serverseitig schon auf 256px WebP optimiert,
  // next/image würde nur Konfig-Aufwand bringen.
  return (
    <img
      src={`/api/avatar/${userId}?v=${encodeURIComponent(version)}`}
      alt={name}
      width={size}
      height={size}
      style={style}
      className="rounded-full object-cover border border-white/15 shrink-0"
    />
  );
}
