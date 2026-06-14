// Next.js zeigt diese Datei automatisch SOFORT beim Klick auf /tabelle an,
// während die Daten serverseitig geladen werden. Sobald page.tsx fertig ist,
// wird sie ausgetauscht. So gibt es keine "tote" Wartezeit mehr.
export default function Loading() {
  return (
    <main className="flex-1 flex flex-col items-center px-5 py-8 bg-gradient-to-b from-[#0a1f44] to-[#142a5c] text-white">
      <div className="w-full max-w-md flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tabelle</h1>
          <span className="text-sm text-white/70">← Zurück</span>
        </header>

        <ul className="flex flex-col gap-2" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="rounded-2xl p-4 flex items-center gap-3 bg-white/5 border border-white/10 animate-pulse"
            >
              <div className="w-8 h-5 rounded bg-white/10" />
              <div className="w-10 h-10 rounded-full bg-white/10" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-3 w-1/2 rounded bg-white/10" />
                <div className="h-2.5 w-2/3 rounded bg-white/10" />
              </div>
              <div className="h-6 w-8 rounded bg-white/10" />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
