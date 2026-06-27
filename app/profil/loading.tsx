// Sofort sichtbares Lade-Skelett für /profil, während die Daten laden.
export default function Loading() {
  return (
    <main className="flex-1 flex flex-col items-center px-5 py-8 bg-gradient-to-b from-[#0a1f44] to-[#142a5c] text-white">
      <div className="w-full max-w-md flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Profil</h1>
          <span className="text-sm font-medium px-3 py-1.5 rounded-full bg-white/10 border border-white/15">
            ← Zurück
          </span>
        </header>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col gap-2 animate-pulse">
          <div className="h-2.5 w-1/4 rounded bg-white/10" />
          <div className="h-4 w-2/3 rounded bg-white/10" />
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col items-center gap-4 animate-pulse">
          <div className="w-24 h-24 rounded-full bg-white/10" />
          <div className="h-11 w-full rounded-full bg-white/10" />
          <div className="h-11 w-full rounded-full bg-white/10" />
        </div>
      </div>
    </main>
  );
}
