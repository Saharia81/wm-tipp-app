// Next.js zeigt diese Datei automatisch SOFORT beim Klick auf /tipps an,
// während die Daten serverseitig geladen werden. Sobald page.tsx fertig ist,
// wird sie ausgetauscht. So gibt es keine "tote" Wartezeit mehr.
export default function Loading() {
  return (
    <main className="flex-1 flex flex-col items-center px-5 py-8 bg-gradient-to-b from-[#0a1f44] to-[#142a5c] text-white">
      <div className="w-full max-w-md flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tipps</h1>
          <span className="text-sm text-white/70">← Zurück</span>
        </header>

        {Array.from({ length: 2 }).map((_, g) => (
          <div
            key={g}
            className="rounded-2xl bg-white/[0.02] border border-white/10 animate-pulse"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex flex-col gap-2 flex-1">
                <div className="h-3 w-1/3 rounded bg-white/10" />
                <div className="h-2.5 w-1/4 rounded bg-white/10" />
              </div>
              <div className="h-4 w-4 rounded bg-white/10" />
            </div>
            <div className="flex flex-col gap-3 px-4 pb-4 pt-1">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-white/5" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
