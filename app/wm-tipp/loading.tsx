// Sofort sichtbares Lade-Skelett für /wm-tipp, während die Daten laden.
export default function Loading() {
  return (
    <main className="flex-1 flex flex-col items-center px-5 py-8 bg-gradient-to-b from-[#0a1f44] to-[#142a5c] text-white">
      <div className="w-full max-w-md flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Weltmeister</h1>
          <span className="text-sm text-white/70">← Zurück</span>
        </header>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col gap-2 animate-pulse">
          <div className="h-3 w-3/4 rounded bg-white/10" />
          <div className="h-3 w-1/2 rounded bg-white/10" />
        </div>

        <div className="grid grid-cols-2 gap-2 animate-pulse" aria-hidden>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-xl bg-white/5 border border-white/10"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
