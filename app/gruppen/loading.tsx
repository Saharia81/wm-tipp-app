// Next.js zeigt diese Datei automatisch SOFORT beim Klick auf /gruppen an,
// während die Daten serverseitig geladen werden. Sobald page.tsx fertig ist,
// wird sie ausgetauscht. So gibt es keine "tote" Wartezeit mehr.
export default function Loading() {
  return (
    <main className="flex-1 flex flex-col items-center px-5 py-8 bg-gradient-to-b from-[#0a1f44] to-[#142a5c] text-white">
      <div className="w-full max-w-md flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Gruppen</h1>
          <span className="text-sm text-white/70">← Zurück</span>
        </header>

        <div className="flex flex-col gap-6" aria-hidden>
          {Array.from({ length: 3 }).map((_, g) => (
            <section key={g} className="flex flex-col gap-2">
              <div className="h-5 w-24 rounded bg-white/10 animate-pulse" />
              <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2.5 border-t border-white/5 first:border-t-0 animate-pulse"
                  >
                    <div className="w-4 h-4 rounded bg-white/10" />
                    <div className="w-5 h-5 rounded-full bg-white/10" />
                    <div className="flex-1 h-3 rounded bg-white/10" />
                    <div className="w-7 h-3 rounded bg-white/10" />
                    <div className="w-9 h-3 rounded bg-white/10" />
                    <div className="w-7 h-3 rounded bg-white/10" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
